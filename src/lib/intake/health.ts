import 'server-only';
import { and, count, eq, gte, inArray, isNull, lt, max, min, or, sql } from 'drizzle-orm';
import { intakeConversations, intakeMessages, intakeOutbox } from '@/db/schema/creatorIntake';
import { intakeInbox } from '@/db/schema/intakeReliability';
import { env } from '@/lib/env';
import type { IntakeDatabase } from './repository';
import { IntakeWahaSession } from '@/lib/schemas/intakeWaha';

export async function intakeHealth(database: IntakeDatabase, now = new Date()) {
  const threshold = new Date(now.getTime() - 5 * 60_000);
  const hour = new Date(now.getTime() - 60 * 60_000);
  const identity = sql<string>`regexp_replace(${intakeConversations.chatId}, '@(c[.]us|s[.]whatsapp[.]net)$', '')`;
  const [duplicates, recentEvents, retriedEvents, recentErrors, aiErrors, humanReview] = await Promise.all([
    database.select({ count: count() }).from(intakeConversations).where(and(eq(intakeConversations.channel, 'whatsapp'),
      isNull(intakeConversations.canonicalId))).groupBy(identity).having(sql`count(*) > 1`),
    database.select({ count: count() }).from(intakeInbox).where(gte(intakeInbox.receivedAt, hour)),
    database.select({ count: count() }).from(intakeInbox).where(and(gte(intakeInbox.receivedAt, hour), gte(intakeInbox.attempts, 2))),
    database.select({ count: count() }).from(intakeInbox).where(and(gte(intakeInbox.receivedAt, hour), eq(intakeInbox.status, 'failed'))),
    database.select({ count: count() }).from(intakeConversations).where(and(eq(intakeConversations.channel, 'whatsapp'),
      isNull(intakeConversations.canonicalId), gte(intakeConversations.updatedAt, hour), eq(intakeConversations.reason, 'extraction_failed'))),
    database.select({ count: count() }).from(intakeConversations).where(and(eq(intakeConversations.channel, 'whatsapp'),
      isNull(intakeConversations.canonicalId), eq(intakeConversations.state, 'waiting_human'))),
  ]);
  const [queue, failed, lastEvent, lastSent, roots, unresolved] = await Promise.all([
    database.select({ status: intakeInbox.status, count: count(), oldest: min(intakeInbox.receivedAt) }).from(intakeInbox)
      .where(inArray(intakeInbox.status, ['pending', 'processing'])).groupBy(intakeInbox.status),
    database.select({ count: count() }).from(intakeInbox).where(eq(intakeInbox.status, 'failed')),
    database.select({ at: max(intakeInbox.receivedAt) }).from(intakeInbox),
    database.select({ at: max(intakeOutbox.acceptedAt) }).from(intakeOutbox)
      .innerJoin(intakeConversations, eq(intakeConversations.id, intakeOutbox.conversationId))
      .where(and(eq(intakeConversations.channel, 'whatsapp'), eq(intakeOutbox.kind, 'reply'))),
    database.select().from(intakeConversations).where(and(eq(intakeConversations.channel, 'whatsapp'),
      isNull(intakeConversations.canonicalId), lt(intakeConversations.lastInboundAt, threshold),
      inArray(intakeConversations.state, ['bot', 'human', 'waiting_human']))).limit(200),
    database.select({ count: count() }).from(intakeOutbox).innerJoin(intakeConversations,
      eq(intakeConversations.id, intakeOutbox.conversationId)).where(and(eq(intakeConversations.channel, 'whatsapp'),
      inArray(intakeOutbox.status, ['sending', 'uncertain']), lt(intakeOutbox.createdAt, threshold))),
  ]);
  let unanswered = 0;
  for (const root of roots) {
    if (!root.lastInboundAt) continue;
    const threads = await database.select({ id: intakeConversations.id }).from(intakeConversations)
      .where(or(eq(intakeConversations.id, root.id), eq(intakeConversations.canonicalId, root.id)));
    const ids = threads.map((thread) => thread.id);
    const [reply, owner] = await Promise.all([
      database.select({ count: count() }).from(intakeOutbox).where(and(inArray(intakeOutbox.conversationId, ids),
        eq(intakeOutbox.kind, 'reply'), eq(intakeOutbox.status, 'accepted'), gte(intakeOutbox.acceptedAt, root.lastInboundAt))),
      database.select({ count: count() }).from(intakeMessages).where(and(inArray(intakeMessages.conversationId, ids),
        eq(intakeMessages.actor, 'owner'), gte(intakeMessages.occurredAt, root.lastInboundAt))),
    ]);
    if (!reply[0]?.count && !owner[0]?.count) unanswered++;
  }
  let session = 'UNAVAILABLE';
  try {
    const response = await fetch(`${env.CREATOR_INTAKE_WAHA_URL}/api/sessions/${env.CREATOR_INTAKE_WAHA_SESSION}`, {
      headers: { 'X-Api-Key': env.CREATOR_INTAKE_WAHA_KEY ?? '' }, signal: AbortSignal.timeout(5000), cache: 'no-store',
    });
    const raw: unknown = await response.json();
    const parsed = IntakeWahaSession.safeParse(raw);
    if (response.ok && parsed.success && parsed.data.me.id === `${env.CREATOR_INTAKE_WHATSAPP_PHONE}@c.us`) session = 'WORKING';
  } catch { /* Only a status code is published; provider errors can contain secrets. */ }
  return { observedAt: now.toISOString(), session, queue: queue.reduce((total, row) => total + row.count, 0),
    duplicateIdentities: duplicates.length, eventsLastHour: recentEvents[0]?.count ?? 0,
    retriedEventsLastHour: retriedEvents[0]?.count ?? 0, failedEventsLastHour: recentErrors[0]?.count ?? 0,
    aiFailuresLastHour: aiErrors[0]?.count ?? 0, waitingHuman: humanReview[0]?.count ?? 0,
    queueOldestSeconds: queue.reduce((age, row) => row.oldest ? Math.max(age, Math.floor((now.getTime() - new Date(row.oldest).getTime()) / 1000)) : age, 0),
    failed: failed[0]?.count ?? 0, unanswered, uncertain: unresolved[0]?.count ?? 0,
    lastEventAt: lastEvent[0]?.at ?? null, lastSentAt: lastSent[0]?.at ?? null };
}
