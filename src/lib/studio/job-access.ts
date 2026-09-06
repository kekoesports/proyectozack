import { and, eq, inArray } from 'drizzle-orm';
import { user } from '@/db/schema/auth';
import { studioProjects } from '@/db/schema/studio';
import { createStudioRepository, type StudioDatabase } from './repository';

/** The worker has no browser cookie. Recover scope from the queued project and re-check live authority. */
export async function studioJobRepository(database: StudioDatabase, requestedBy: string, projectId: string) {
  const [agencyProject] = await database.select({ talentId: studioProjects.talentId }).from(studioProjects)
    .innerJoin(user, and(eq(user.id, requestedBy), inArray(user.role, ['admin', 'manager'])))
    .where(eq(studioProjects.id, projectId)).limit(1);
  // A non-agency actor still needs their own active creator membership. Never trust the queue as a grant.
  return createStudioRepository(database, requestedBy, agencyProject?.talentId);
}
