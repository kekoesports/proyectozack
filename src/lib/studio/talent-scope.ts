import { and, eq, exists, inArray } from 'drizzle-orm';
import { user } from '@/db/schema/auth';
import { talents } from '@/db/schema/talents';
import { talentUsers } from '@/db/schema/studio';
import type { StudioDatabase } from './repository';

export const STUDIO_WORKSPACE_COOKIE = 'studio-agency-workspace';

/** Selection narrows access; it never grants it. Re-check live roles in every query. */
export function visibleStudioTalents(database: StudioDatabase, userId: string, agencyTalentId?: number) {
  const membership = database.select({ id: talentUsers.talentId }).from(talentUsers)
    .where(and(eq(talentUsers.userId, userId), eq(talentUsers.active, true)));
  const agency = database.select({ id: user.id }).from(user)
    .where(and(eq(user.id, userId), inArray(user.role, ['admin', 'manager'])));
  return database.select({ id: talents.id }).from(talents).where(
    agencyTalentId === undefined
      ? inArray(talents.id, membership)
      : and(eq(talents.id, agencyTalentId), exists(agency)),
  );
}

/** Call inside a transaction. Preserve creator revocation locks and serialize agency role changes. */
export async function lockStudioMember(database: StudioDatabase, userId: string, agencyTalentId?: number) {
  if (agencyTalentId === undefined) {
    const [member] = await database.select({ talentId: talentUsers.talentId }).from(talentUsers)
      .where(and(eq(talentUsers.userId, userId), eq(talentUsers.active, true))).for('update');
    return member ?? null;
  }
  const [actor] = await database.select({ id: user.id }).from(user)
    .where(and(eq(user.id, userId), inArray(user.role, ['admin', 'manager']))).for('update');
  if (!actor) return null;
  const [talent] = await database.select({ talentId: talents.id }).from(talents)
    .where(eq(talents.id, agencyTalentId)).for('update');
  return talent ?? null;
}
