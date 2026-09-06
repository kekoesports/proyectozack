import { and, desc, eq } from 'drizzle-orm';
import { studioRenders, studioBoards } from '@/db/schema/studioProduction';
import { studioProjects, studioAssets } from '@/db/schema/studio';
import { talents } from '@/db/schema/talents';
import type { StudioDatabase } from './repository';

/** Agency-only queries. Every caller must enforce requireStudioAgency. */
export async function studioAgencyRenders(database: StudioDatabase) {
  return database.select({ id: studioRenders.id, projectId: studioProjects.id, title: studioProjects.title,
    name: talents.name, status: studioRenders.status, assetId: studioRenders.assetId,
    projectRevision: studioRenders.projectRevision, boardRevision: studioRenders.boardRevision })
    .from(studioRenders).innerJoin(studioProjects, eq(studioProjects.id, studioRenders.projectId))
    .innerJoin(talents, eq(talents.id, studioProjects.talentId)).orderBy(desc(studioRenders.createdAt)).limit(50);
}
export async function studioAgencyRenderAsset(database: StudioDatabase, id: string) {
  const [result] = await database.select({ asset: studioAssets }).from(studioRenders)
    .innerJoin(studioProjects, eq(studioProjects.id, studioRenders.projectId))
    .innerJoin(studioAssets, and(eq(studioAssets.id, studioRenders.assetId), eq(studioAssets.talentId, studioProjects.talentId)))
    .where(eq(studioRenders.id, id)).limit(1);
  return result?.asset ?? null;
}
export async function reviewStudioRender(database: StudioDatabase, input: { id: string; decision: 'approved' | 'changes_requested'; comment: string }, reviewer: string) {
  return database.transaction(async (tx) => {
    const [row] = await tx.select({ render: studioRenders, projectRevision: studioProjects.revision, boardRevision: studioBoards.revision })
      .from(studioRenders).innerJoin(studioProjects, eq(studioProjects.id, studioRenders.projectId))
      .innerJoin(studioBoards, eq(studioBoards.projectId, studioProjects.id)).where(eq(studioRenders.id, input.id)).for('update');
    if (!row || row.render.status !== 'ready' || !row.render.assetId) return null;
    if (input.decision === 'approved' && (row.projectRevision !== row.render.projectRevision || row.boardRevision !== row.render.boardRevision)) return null;
    await tx.update(studioRenders).set({ status: input.decision, reviewNote: input.comment, reviewedBy: reviewer }).where(and(eq(studioRenders.id, input.id), eq(studioRenders.status, 'ready')));
    return { projectId: row.render.projectId };
  });
}
