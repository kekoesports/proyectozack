import { and, asc, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { studioBoards, studioChatTurns, studioRenders, studioSchedule } from '@/db/schema/studioProduction';
import { studioProjects, studioAssets } from '@/db/schema/studio';
import { campaigns } from '@/db/schema/campaigns';
import { StudioBoard, StudioAssistantProposal } from '@/lib/schemas/studio-production';
import type { StudioDatabase } from './repository';
import { visibleStudioTalents } from './talent-scope';

export function createProductionRepository(database: StudioDatabase, userId: string, agencyTalentId?: number) {
  const owned = () => visibleStudioTalents(database, userId, agencyTalentId);
  const scope = (id: string) => and(eq(studioProjects.id, id), inArray(studioProjects.talentId, owned()));
  const ownedProjects = () => database.select({ id: studioProjects.id }).from(studioProjects).where(inArray(studioProjects.talentId, owned()));
  return {
    async board(id: string) {
      const [row] = await database.select({ revision: studioBoards.revision, document: studioBoards.document })
        .from(studioBoards).innerJoin(studioProjects, eq(studioProjects.id, studioBoards.projectId)).where(scope(id));
      const parsed = StudioBoard.safeParse(row?.document);
      return row && parsed.success ? { revision: row.revision, document: parsed.data } : null;
    },
    async saveBoard(id: string, revision: number, document: StudioBoard) {
      return database.transaction(async (tx) => {
        const [project] = await tx.select().from(studioProjects).where(scope(id)).for('update');
        if (!project) return null;
        const ids = [...new Set([...document.scenes.flatMap((s) => s.assetId ? [s.assetId] : []), ...(document.audioAssetId ? [document.audioAssetId] : [])])];
        const assets = ids.length ? await tx.select().from(studioAssets).where(and(inArray(studioAssets.id, ids), eq(studioAssets.talentId, project.talentId))) : [];
        if (assets.length !== ids.length) return null;
        if (document.scenes.some((s) => s.kind !== 'title' && !assets.some((a) => a.id === s.assetId && a.contentType.startsWith(`${s.kind}/`)))) return null;
        if (document.audioAssetId && !assets.some((a) => a.id === document.audioAssetId && a.contentType.startsWith('audio/'))) return null;
        const [board] = revision < 0
          ? await tx.insert(studioBoards).values({ projectId: id, document }).onConflictDoNothing().returning()
          : await tx.update(studioBoards).set({ document, revision: revision + 1, updatedAt: new Date() })
            .where(and(eq(studioBoards.projectId, id), eq(studioBoards.revision, revision))).returning();
        return board ? { revision: board.revision } : null;
      });
    },
    async renders(id: string) {
      return database.select({ id: studioRenders.id, status: studioRenders.status, assetId: studioRenders.assetId,
        projectRevision: studioRenders.projectRevision, boardRevision: studioRenders.boardRevision,
        createdAt: studioRenders.createdAt, reviewNote: studioRenders.reviewNote, failureCode: studioRenders.failureCode })
        .from(studioRenders).innerJoin(studioProjects, eq(studioProjects.id, studioRenders.projectId))
        .where(scope(id)).orderBy(desc(studioRenders.createdAt)).limit(20);
    },
    async enqueue(id: string, projectRevision: number, boardRevision: number) {
      return database.transaction(async (tx) => {
        const [project] = await tx.select().from(studioProjects).where(scope(id)).for('update');
        if (!project || project.revision !== projectRevision) return null;
        const [board] = await tx.select().from(studioBoards).where(and(eq(studioBoards.projectId, id), eq(studioBoards.revision, boardRevision)));
        const parsed = StudioBoard.safeParse(board?.document);
        if (!board || !parsed.success) return null;
        const [previous] = await tx.select({ id: studioRenders.id }).from(studioRenders)
          .where(and(eq(studioRenders.projectId, id), eq(studioRenders.projectRevision, projectRevision), eq(studioRenders.boardRevision, boardRevision)));
        if (previous) return previous;
        const [usage] = await tx.select({ total: count() }).from(studioRenders).where(and(eq(studioRenders.projectId, id), gte(studioRenders.createdAt, new Date(Date.now() - 86400000))));
        if (usage && usage.total >= 10) return null;
        const [result] = await tx.insert(studioRenders).values({ projectId: id, projectRevision, boardRevision,
          document: parsed.data, requestedBy: userId }).returning({ id: studioRenders.id });
        return result ?? null;
      });
    },
    async turns(id: string) {
      return database.select({ id: studioChatTurns.id, prompt: studioChatTurns.prompt, response: studioChatTurns.response,
        proposal: studioChatTurns.proposal, engine: studioChatTurns.engine, status: studioChatTurns.status,
        projectRevision: studioChatTurns.projectRevision, createdAt: studioChatTurns.createdAt })
        .from(studioChatTurns).innerJoin(studioProjects, eq(studioProjects.id, studioChatTurns.projectId))
        .where(scope(id)).orderBy(desc(studioChatTurns.createdAt)).limit(30);
    },
    async beginTurn(input: { id: string; projectId: string; revision: number; prompt: string; engine: string }) {
      return database.transaction(async (tx) => {
        const [project] = await tx.select().from(studioProjects).where(scope(input.projectId)).for('update');
        if (!project || project.revision !== input.revision) return false;
        const [usage] = await tx.select({ total: count() }).from(studioChatTurns)
          .where(and(eq(studioChatTurns.projectId, input.projectId), gte(studioChatTurns.createdAt, new Date(Date.now() - 86400000))));
        if (usage && usage.total >= 30) return false;
        const [turn] = await tx.insert(studioChatTurns).values({ id: input.id, projectId: input.projectId,
          projectRevision: input.revision, prompt: input.prompt, engine: input.engine }).onConflictDoNothing().returning({ id: studioChatTurns.id });
        return Boolean(turn);
      });
    },
    async finishTurn(id: string, output: StudioAssistantProposal | null, usage?: { input?: number | undefined; output?: number | undefined }) {
      return database.update(studioChatTurns).set({ status: output ? 'complete' : 'failed',
        response: output?.message ?? 'No se pudo completar. No se ha modificado tu guion.', proposal: output,
        inputTokens: usage?.input, outputTokens: usage?.output })
        .where(and(eq(studioChatTurns.id, id), inArray(studioChatTurns.projectId, ownedProjects()), eq(studioChatTurns.status, 'pending')));
    },
    async schedule() {
      return database.select({ id: studioSchedule.id, projectId: studioProjects.id, title: studioProjects.title,
        platform: studioProjects.platform, status: studioProjects.status, scheduledAt: studioSchedule.scheduledAt, publishedUrl: studioSchedule.publishedUrl })
        .from(studioSchedule).innerJoin(studioProjects, eq(studioProjects.id, studioSchedule.projectId))
        .where(inArray(studioProjects.talentId, owned())).orderBy(asc(studioSchedule.scheduledAt)).limit(100);
    },
    async plan(projectId: string, scheduledAt: Date) {
      const [project] = await database.select({ id: studioProjects.id }).from(studioProjects).where(scope(projectId));
      if (!project) return false;
      await database.insert(studioSchedule).values({ projectId, scheduledAt })
        .onConflictDoUpdate({ target: studioSchedule.projectId, set: { scheduledAt } });
      return true;
    },
    async campaigns() {
      // Explicit creator-safe projection. No fees, margins, contacts, payment details or internal notes.
      return database.select({ id: campaigns.id, name: campaigns.name, status: campaigns.status, actionType: campaigns.actionType,
        startDate: campaigns.startDate, endDate: campaigns.endDate, deliveryDeadline: campaigns.deliveryDeadline })
        .from(campaigns).where(and(inArray(campaigns.talentId, owned()), isNull(campaigns.archivedAt)))
        .orderBy(desc(campaigns.createdAt)).limit(100);
    },
  };
}
