import { and, desc, eq } from 'drizzle-orm';
import {
  studioProjects,
  studioReviews,
  talentUsers,
  studioInvitations,
} from '@/db/schema/studio';
import { talents } from '@/db/schema/talents';
import { user } from '@/db/schema/auth';
import type { StudioDatabase } from './repository';

/** Internal only: callers must requireStudioAgency before calling these functions. */
export async function studioAgencyDashboard(database: StudioDatabase) {
  const [projects, roster, members] = await Promise.all([
    database
      .select({ project: studioProjects, name: talents.name })
      .from(studioProjects)
      .innerJoin(talents, eq(talents.id, studioProjects.talentId))
      .orderBy(desc(studioProjects.updatedAt))
      .limit(100),
    database
      .select({ id: talents.id, name: talents.name, photoUrl: talents.photoUrl, game: talents.game, status: talents.status })
      .from(talents)
      .orderBy(talents.name),
    database
      .select({
        id: talentUsers.id,
        talentId: talentUsers.talentId,
        active: talentUsers.active,
        name: talents.name,
      })
      .from(talentUsers)
      .innerJoin(talents, eq(talents.id, talentUsers.talentId)),
  ]);
  return { projects, roster, members };
}

export async function reviewStudioProject(
  database: StudioDatabase,
  input: {
    id: string;
    revision: number;
    decision: 'approved' | 'changes_requested';
    comment: string;
  },
  reviewer: string,
) {
  return database.transaction(async (tx) => {
    const [project] = await tx
      .update(studioProjects)
      .set({ status: input.decision, updatedAt: new Date() })
      .where(
        and(
          eq(studioProjects.id, input.id),
          eq(studioProjects.revision, input.revision),
          eq(studioProjects.status, 'in_review'),
        ),
      )
      .returning();
    if (!project) return false;
    await tx
      .insert(studioReviews)
      .values({
        projectId: project.id,
        revision: project.revision,
        decision: input.decision,
        comment: input.comment,
        reviewedBy: reviewer,
      });
    return true;
  });
}

export async function revokeStudioMember(database: StudioDatabase, id: string) {
  return database.transaction(async (tx) => {
    const [member] = await tx
      .update(talentUsers)
      .set({ active: false })
      .where(eq(talentUsers.id, id))
      .returning();
    if (!member) return false;
    const [account] = await tx
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, member.userId));
    // Revoke this account's invitations, not other representatives of the same talent.
    if (account)
      await tx
        .update(studioInvitations)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(studioInvitations.talentId, member.talentId),
            eq(studioInvitations.email, account.email.toLowerCase()),
          ),
        );
    return true;
  });
}
