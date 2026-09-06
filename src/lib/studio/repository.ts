import { and, count, desc, eq, gte, inArray, sum } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import {
  talentUsers,
  studioProjects,
  studioVersions,
  studioAssets,
  studioReviews,
} from "@/db/schema/studio";
import { talents } from "@/db/schema/talents";
import {
  talentChannelSnapshots,
  talentContentPerformance,
} from "@/db/schema/talentIntelligence";
import { deliverables } from "@/db/schema/deliverables";
import type { StudioProjectInput } from "@/lib/schemas/studio";
import {
  STUDIO_ASSET_LIMIT,
  STUDIO_PROJECT_LIMIT,
  STUDIO_STORAGE_LIMIT,
} from "./limits";
import { readStudioProfile } from "./profile";

export type StudioDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

/** userId is supplied only by the session boundary, never a browser argument. */
export function createStudioRepository(
  database: StudioDatabase,
  userId: string,
) {
  const visibleTalents = () =>
    database
      .select({ id: talentUsers.talentId })
      .from(talentUsers)
      .where(and(eq(talentUsers.userId, userId), eq(talentUsers.active, true)));
  const projectScope = (id: string) =>
    and(
      eq(studioProjects.id, id),
      inArray(studioProjects.talentId, visibleTalents()),
    );

  return {
    profile: () => readStudioProfile(database, userId),
    async membership() {
      const [row] = await database
        .select({ talentId: talents.id, name: talents.name })
        .from(talentUsers)
        .innerJoin(talents, eq(talents.id, talentUsers.talentId))
        .where(
          and(eq(talentUsers.userId, userId), eq(talentUsers.active, true)),
        )
        .limit(1);
      return row ?? null;
    },
    async projects() {
      return database
        .select()
        .from(studioProjects)
        .where(inArray(studioProjects.talentId, visibleTalents()))
        .orderBy(desc(studioProjects.updatedAt))
        .limit(100);
    },
    async project(id: string) {
      const [row] = await database
        .select()
        .from(studioProjects)
        .where(projectScope(id))
        .limit(1);
      return row ?? null;
    },
    async save(
      input: StudioProjectInput,
      existing?: { id: string; revision: number },
    ) {
      return database.transaction(async (tx) => {
        const [member] = await tx
          .select()
          .from(talentUsers)
          .where(
            and(eq(talentUsers.userId, userId), eq(talentUsers.active, true)),
          )
          .for("update");
        if (!member) return null;
        // Multiple accounts may represent the same talent: serialize quota checks by talent.
        await tx
          .select({ id: talents.id })
          .from(talents)
          .where(eq(talents.id, member.talentId))
          .for("update");
        if (!existing) {
          const [usage] = await tx
            .select({ total: count() })
            .from(studioProjects)
            .where(eq(studioProjects.talentId, member.talentId));
          if (usage && usage.total >= STUDIO_PROJECT_LIMIT) return null;
        }
        const [project] = existing
          ? await tx
              .update(studioProjects)
              .set({
                ...input,
                status: "draft",
                revision: existing.revision + 1,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(studioProjects.id, existing.id),
                  eq(studioProjects.talentId, member.talentId),
                  eq(studioProjects.revision, existing.revision),
                ),
              )
              .returning()
          : await tx
              .insert(studioProjects)
              .values({
                ...input,
                talentId: member.talentId,
                createdBy: userId,
              })
              .returning();
        if (!project) return null;
        await tx.insert(studioVersions).values({
          projectId: project.id,
          revision: project.revision,
          document: input,
        });
        return project;
      });
    },
    async submit(id: string, revision: number) {
      const [row] = await database
        .update(studioProjects)
        .set({ status: "in_review", updatedAt: new Date() })
        .where(
          and(
            projectScope(id),
            eq(studioProjects.revision, revision),
            inArray(studioProjects.status, ["draft", "changes_requested"]),
          ),
        )
        .returning({ id: studioProjects.id });
      return row ?? null;
    },
    async versions(id: string) {
      return database
        .select({
          revision: studioVersions.revision,
          document: studioVersions.document,
          createdAt: studioVersions.createdAt,
        })
        .from(studioVersions)
        .innerJoin(
          studioProjects,
          eq(studioProjects.id, studioVersions.projectId),
        )
        .where(projectScope(id))
        .orderBy(desc(studioVersions.revision))
        .limit(50);
    },
    async reviews(id: string) {
      return database
        .select({
          decision: studioReviews.decision,
          comment: studioReviews.comment,
          revision: studioReviews.revision,
          createdAt: studioReviews.createdAt,
        })
        .from(studioReviews)
        .innerJoin(
          studioProjects,
          eq(studioProjects.id, studioReviews.projectId),
        )
        .where(projectScope(id))
        .orderBy(desc(studioReviews.createdAt));
    },
    async assets() {
      return database
        .select({
          id: studioAssets.id,
          name: studioAssets.name,
          contentType: studioAssets.contentType,
          size: studioAssets.size,
          projectId: studioAssets.projectId,
        })
        .from(studioAssets)
        .where(inArray(studioAssets.talentId, visibleTalents()))
        .orderBy(desc(studioAssets.createdAt))
        .limit(100);
    },
    async asset(id: string) {
      const [row] = await database
        .select()
        .from(studioAssets)
        .where(
          and(
            eq(studioAssets.id, id),
            inArray(studioAssets.talentId, visibleTalents()),
          ),
        )
        .limit(1);
      return row ?? null;
    },
    async addAsset(input: {
      projectId: string | null;
      name: string;
      storageKey: string;
      contentType: string;
      size: number;
      checksum: string;
    }) {
      return database.transaction(async (tx) => {
        const [member] = await tx
          .select()
          .from(talentUsers)
          .where(
            and(eq(talentUsers.userId, userId), eq(talentUsers.active, true)),
          )
          .for("update");
        if (!member) return null;
        await tx
          .select({ id: talents.id })
          .from(talents)
          .where(eq(talents.id, member.talentId))
          .for("update");
        const [usage] = await tx
          .select({ total: count(), bytes: sum(studioAssets.size) })
          .from(studioAssets)
          .where(eq(studioAssets.talentId, member.talentId));
        if (
          usage &&
          (usage.total >= STUDIO_ASSET_LIMIT ||
            Number(usage.bytes ?? 0) + input.size > STUDIO_STORAGE_LIMIT)
        )
          return null;
        if (input.projectId) {
          const [project] = await tx
            .select({ id: studioProjects.id })
            .from(studioProjects)
            .where(
              and(
                eq(studioProjects.id, input.projectId),
                eq(studioProjects.talentId, member.talentId),
              ),
            );
          if (!project) return null;
        }
        const [asset] = await tx
          .insert(studioAssets)
          .values({
            ...input,
            talentId: member.talentId,
            rightsConfirmedBy: userId,
          })
          .returning({ id: studioAssets.id });
        return asset ?? null;
      });
    },
    async dashboard() {
      const since = new Date(Date.now() - 89 * 86_400_000).toISOString().slice(0, 10);
      const [snapshots, content, tasks] = await Promise.all([
        database
          .select({
            platform: talentChannelSnapshots.platform,
            date: talentChannelSnapshots.snapshotDate,
            followers: talentChannelSnapshots.followers,
            views: talentChannelSnapshots.recentViews30d,
            source: talentChannelSnapshots.dataSource,
            socialId: talentChannelSnapshots.socialId,
          })
          .from(talentChannelSnapshots)
          .where(and(inArray(talentChannelSnapshots.talentId, visibleTalents()), gte(talentChannelSnapshots.snapshotDate, since)))
          .orderBy(desc(talentChannelSnapshots.snapshotDate))
          .limit(2700),
        database
          .select({
            id: talentContentPerformance.id,
            title: talentContentPerformance.title,
            platform: talentContentPerformance.platform,
            views: talentContentPerformance.viewCount,
            likes: talentContentPerformance.likeCount,
            syncedAt: talentContentPerformance.lastSyncedAt,
            publishedAt: talentContentPerformance.publishedAt,
          })
          .from(talentContentPerformance)
          .where(inArray(talentContentPerformance.talentId, visibleTalents()))
          .orderBy(desc(talentContentPerformance.publishedAt))
          .limit(12),
        database
          .select({
            id: deliverables.id,
            title: deliverables.title,
            type: deliverables.type,
            status: deliverables.status,
          })
          .from(deliverables)
          .where(inArray(deliverables.talentId, visibleTalents()))
          .orderBy(desc(deliverables.id))
          .limit(20),
      ]);
      return { snapshots, content, tasks };
    },
  };
}
