import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { creatorSearchProfiles, creatorFeedback, creatorAccounts, targets, automationRegistry } from '@/db/schema';
import { db } from '@/lib/db';
import { creatorSearchProfileSchema, creatorFeedbackSchema, DEFAULT_CREATOR_SEARCH_PROFILE } from '@/lib/schemas/creator-search-profile';
import { nextCreatorSearchAt } from '@/lib/targets/search-profile';

export type CreatorSearchProfile = typeof creatorSearchProfiles.$inferSelect;

export async function listCreatorSearchProfiles(): Promise<CreatorSearchProfile[]> {
  return db.select().from(creatorSearchProfiles).orderBy(asc(creatorSearchProfiles.name));
}

export async function seedCreatorSearchProfile(actorId: string | null): Promise<void> {
  const config = DEFAULT_CREATOR_SEARCH_PROFILE;
  // Paused until provider-purpose preflight is satisfied; reruns never overwrite operator edits.
  await db.insert(creatorSearchProfiles).values({ name: config.name, config, enabled: false, createdBy: actorId })
    .onConflictDoNothing({ target: creatorSearchProfiles.name });
}

export async function saveCreatorSearchProfile(
  input: unknown, actorId: string, identity?: Readonly<{ id: number; version: number }>,
): Promise<CreatorSearchProfile> {
  const config = creatorSearchProfileSchema.parse(input);
  const now = new Date();
  const values = { name: config.name, config, enabled: config.enabled, nextRunAt: nextCreatorSearchAt(config, now), updatedAt: now };
  const rows = identity
    ? await db.update(creatorSearchProfiles).set({ ...values, version: sql`${creatorSearchProfiles.version} + 1` })
      .where(and(eq(creatorSearchProfiles.id, identity.id), eq(creatorSearchProfiles.version, identity.version))).returning()
    : await db.insert(creatorSearchProfiles).values({ ...values, createdBy: actorId }).returning();
  const row = rows[0];
  if (!row) throw new Error('creator_profile_changed_reload');
  return row;
}

export async function listDueCreatorSearchProfiles(now: Date): Promise<CreatorSearchProfile[]> {
  return db.select().from(creatorSearchProfiles)
    .where(and(eq(creatorSearchProfiles.enabled, true), lte(creatorSearchProfiles.nextRunAt, now)))
    .orderBy(asc(creatorSearchProfiles.nextRunAt)).limit(20);
}

/** Atomic manual decision and immutable feedback; no email or provider call. */
export async function recordCreatorFeedback(input: unknown, actorId: string): Promise<void> {
  const data = creatorFeedbackSchema.parse(input);
  await db.transaction(async (tx) => {
    const [target] = await tx.select({ id: targets.id, status: targets.status }).from(targets)
      .where(eq(targets.id, data.targetId)).for('update');
    if (!target) throw new Error('creator_target_not_found');
    const [account] = await tx.select({ creatorId: creatorAccounts.creatorId }).from(creatorAccounts)
      .where(eq(creatorAccounts.targetId, target.id)).limit(1);
    // PostgreSQL now() is transaction-start time, not the time this manual decision acquired the row lock.
    const decidedAt = new Date();
    await tx.insert(creatorFeedback).values({ targetId: target.id, creatorId: account?.creatorId,
      actorId, previousStatus: target.status, status: data.status, reason: data.reason, note: data.note, createdAt: decidedAt });
    await tx.update(targets).set({ status: data.status, updatedAt: decidedAt,
      contactedAt: data.status === 'contactado' ? decidedAt : undefined }).where(eq(targets.id, target.id));
  });
}

export async function listAutomationRegistry(): Promise<Array<typeof automationRegistry.$inferSelect>> {
  return db.select().from(automationRegistry).orderBy(asc(automationRegistry.name));
}
