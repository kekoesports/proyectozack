import { createHash } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { intakeInbox } from '@/db/schema/intakeReliability';
import { IntakeWahaMessage, type IntakeWahaUpdate } from '@/lib/schemas/intakeWaha';
import type { IntakeDatabase } from './repository';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function enqueueWaha(database: IntakeDatabase, update: IntakeWahaUpdate, now = new Date()) {
  const parsed = IntakeWahaMessage.safeParse(update.payload);
  if (!parsed.success) return { ok: false, reason: 'invalid-message' };
  const message = parsed.data;
  const id = digest([update.session, message.id]);
  // Phone/LID representations can change on redelivery; payload content cannot.
  const fingerprint = digest([message.id, message.timestamp, message.fromMe, message.body ?? '', message.hasMedia ?? false]);
  const stale = now.getTime() - message.timestamp * 1000 >= 240_000;
  await database.transaction(async (tx) => {
    // Commit in sequence order even when two webhook requests arrive in the same millisecond.
    await tx.execute(sql`select pg_advisory_xact_lock(20260913, 1)`);
    await tx.insert(intakeInbox).values({ id, fingerprint, payload: update, receivedAt: now,
      nextAttemptAt: now, ...(stale ? { status: 'failed', reason: 'stale-needs-review', finishedAt: now } : {}),
    }).onConflictDoNothing();
  });
  const [prior] = await database.select({ fingerprint: intakeInbox.fingerprint }).from(intakeInbox).where(eq(intakeInbox.id, id));
  if (prior?.fingerprint !== fingerprint) return { ok: false, reason: 'event-conflict' };
  return { ok: true, id };
}

export async function processWahaInbox(database: IntakeDatabase,
  process: (payload: IntakeWahaUpdate) => Promise<Response>, now = new Date()): Promise<boolean> {
  const item = await database.transaction(async (tx) => {
    // Serialize the whole small intake queue. Two workers cannot bypass an earlier lease.
    const [first] = await tx.select().from(intakeInbox).where(inArray(intakeInbox.status, ['pending', 'processing']))
      .orderBy(asc(intakeInbox.sequence)).limit(1).for('update');
    if (!first || first.nextAttemptAt > now || (first.leaseUntil && first.leaseUntil > now)) return null;
    const [claimed] = await tx.update(intakeInbox).set({ status: 'processing', attempts: first.attempts + 1,
      leaseUntil: new Date(now.getTime() + 120_000) }).where(eq(intakeInbox.id, first.id)).returning();
    return claimed ?? null;
  });
  if (!item) return false;
  // Never silently discard or automatically answer messages that became stale during an outage.
  if (now.getTime() - item.receivedAt.getTime() >= 240_000) {
    await database.update(intakeInbox).set({ status: 'failed', reason: 'stale-needs-review',
      leaseUntil: null, finishedAt: now }).where(eq(intakeInbox.id, item.id));
    return true;
  }
  try {
    const response = await process(item.payload);
    if (!response.ok) throw new Error(response.status === 409 ? 'identity-conflict' : 'processing-failed');
    // The handler response contains outcome codes only, never message text or credentials.
    const result = (await response.text()).slice(0, 1000);
    await database.update(intakeInbox).set({ status: 'processed', result, reason: null,
      leaseUntil: null, finishedAt: new Date() }).where(and(eq(intakeInbox.id, item.id), eq(intakeInbox.attempts, item.attempts)));
  } catch {
    const exhausted = item.attempts >= 6;
    await database.update(intakeInbox).set({ status: exhausted ? 'failed' : 'pending',
      reason: exhausted ? 'retries-exhausted' : 'processing-retry', leaseUntil: null,
      nextAttemptAt: new Date(Date.now() + Math.min(60_000, 2000 * 2 ** item.attempts)),
      finishedAt: exhausted ? new Date() : null,
    }).where(and(eq(intakeInbox.id, item.id), eq(intakeInbox.attempts, item.attempts)));
  }
  return true;
}
