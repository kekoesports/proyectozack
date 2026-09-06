import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { studioNarrations } from '@/db/schema/studioNarrations';
import { studioProjects } from '@/db/schema/studio';
import { studioProfiles } from '@/db/schema/studioProfiles';
import { StudioProfileDocument } from '@/lib/schemas/studio-profile';
import type { StudioDatabase } from './repository';
import { visibleStudioTalents } from './talent-scope';

export function createNarrationRepository(database: StudioDatabase, userId: string, agencyTalentId?: number) {
  const owned = () => visibleStudioTalents(database, userId, agencyTalentId);
  return {
    async list(projectId: string) {
      return database.select({ id: studioNarrations.id, status: studioNarrations.status, projectRevision: studioNarrations.projectRevision,
        creditsMilli: studioNarrations.creditsMilli, assetId: studioNarrations.assetId, quotedAt: studioNarrations.quotedAt })
        .from(studioNarrations).innerJoin(studioProjects, eq(studioProjects.id, studioNarrations.projectId))
        .where(and(eq(studioProjects.id, projectId), inArray(studioProjects.talentId, owned()))).orderBy(desc(studioNarrations.createdAt)).limit(20);
    },
    async request(projectId: string, revision: number) {
      return database.transaction(async (tx) => {
        const [project] = await tx.select().from(studioProjects).where(and(eq(studioProjects.id, projectId), eq(studioProjects.revision, revision), inArray(studioProjects.talentId, owned()))).for('update');
        if (!project || project.script.trim().length < 10 || project.script.length > 5000) return null;
        const [row] = await tx.select().from(studioProfiles).where(eq(studioProfiles.talentId, project.talentId));
        const profile = StudioProfileDocument.safeParse(row?.document);
        if (!profile.success || profile.data.voiceStatus !== 'approved_external' || !profile.data.higgsfieldVoice) return null;
        const [previous] = await tx.select().from(studioNarrations).where(and(eq(studioNarrations.projectId, projectId), eq(studioNarrations.projectRevision, revision)));
        if (previous) {
          if (previous.status === 'quoted' && previous.quotedAt && Date.now() - previous.quotedAt.getTime() > 900000)
            await tx.update(studioNarrations).set({ status: 'quote_requested', creditsMilli: null, approvedBy: null, updatedAt: new Date() }).where(eq(studioNarrations.id, previous.id));
          return { id: previous.id };
        }
        const [job] = await tx.insert(studioNarrations).values({ projectId, projectRevision: revision, text: project.script,
          voiceId: profile.data.higgsfieldVoice.id, requestedBy: userId }).returning({ id: studioNarrations.id });
        return job ?? null;
      });
    },
  };
}
/** Agency-only: called only behind requireStudioAgency. Quote approval is not creator-supplied pricing. */
export async function approveStudioNarration(database: StudioDatabase, id: string, reviewer: string, expectedCreditsMilli: number) {
  return database.transaction(async (tx) => {
    const [row] = await tx.select({ narration: studioNarrations, revision: studioProjects.revision })
      .from(studioNarrations).innerJoin(studioProjects, eq(studioProjects.id, studioNarrations.projectId)).where(eq(studioNarrations.id, id)).for('update');
    if (!row || row.narration.status !== 'quoted' || row.narration.creditsMilli === null || row.narration.creditsMilli !== expectedCreditsMilli || row.revision !== row.narration.projectRevision) return false;
    const [approved] = await tx.update(studioNarrations).set({ status: 'approved', approvedBy: reviewer, updatedAt: new Date() })
      .where(and(eq(studioNarrations.id, id), eq(studioNarrations.status, 'quoted'), gte(studioNarrations.quotedAt, new Date(Date.now() - 15 * 60000))))
      .returning({ id: studioNarrations.id });
    return Boolean(approved);
  });
}
export async function studioAgencyNarrations(database: StudioDatabase) {
  return database.select({ id: studioNarrations.id, title: studioProjects.title, text: studioNarrations.text,
    status: studioNarrations.status, creditsMilli: studioNarrations.creditsMilli, projectRevision: studioNarrations.projectRevision })
    .from(studioNarrations).innerJoin(studioProjects, eq(studioProjects.id, studioNarrations.projectId))
    .orderBy(desc(studioNarrations.createdAt)).limit(50);
}
