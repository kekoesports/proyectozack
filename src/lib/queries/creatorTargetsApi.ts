import { and, asc, eq, gt, ne, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { targets } from '@/db/schema';
import type { ImportItem } from '@/lib/schemas/creatorTargetsApi';
import type { Target } from '@/types';

/**
 * Upsert creators discovered by the socialpro-creator-targets skill.
 *
 * Conflict policy: ON CONFLICT (platform, username) DO UPDATE — only metric
 * fields (followers, following, profilePicUrl, bio, externalUrl, enrichedAt)
 * + discoveredVia + importBatchId + updatedAt are touched. Workflow fields
 * (status, brandUserId, notes, contactedAt) are explicitly preserved so a
 * re-run of discovery never pisa el trabajo manual de Zack.
 *
 * Uses the Postgres system column `xmax` to distinguish freshly inserted
 * rows from conflict-updates. xmax = '0' on insert, non-zero on update.
 */
export async function upsertCreatorTargets(
  items: readonly ImportItem[],
  batchId: string,
): Promise<{ inserted: number; updated: number; ids: number[] }> {
  if (items.length === 0) return { inserted: 0, updated: 0, ids: [] };

  const values = items.map((item) => ({
    username: item.username,
    fullName: item.fullName,
    platform: item.platform,
    profileUrl: item.profileUrl,
    profilePicUrl: item.profilePicUrl,
    followers: item.followers,
    following: item.following,
    bio: item.bio,
    externalUrl: item.externalUrl,
    countryCode: item.countryCode ?? null,
    defaultLanguage: item.defaultLanguage ?? null,
    lastVideoAt: item.lastVideoAt ?? null,
    recentVideoCount: item.recentVideoCount ?? null,
    minRecentVideoViews: item.minRecentVideoViews ?? null,
    avgRecentVideoViews: item.avgRecentVideoViews ?? null,
    recentVideosWindowDays: item.recentVideosWindowDays ?? null,
    qualificationUpdatedAt: item.recentVideoCount === undefined ? null : new Date(),
    contactEmail: item.contactEmail ?? null,
    contactUrl: item.contactUrl ?? null,
    qualificationStatus: item.qualificationStatus,
    fitScore: item.fitScore,
    fitReasons: item.fitReasons,
    sourceQuery: item.sourceQuery ?? null,
    lastActivityAt: item.lastActivityAt ?? null,
    lastDiscoveredAt: new Date(),
    discoveredVia: item.discoveredVia,
    importBatchId: batchId,
    enrichedAt: new Date(),
    status: 'pendiente' as const,
  }));

  const result = await db
    .insert(targets)
    .values(values)
    .onConflictDoUpdate({
      target: [targets.platform, targets.username],
      set: {
        fullName: sql`excluded.full_name`,
        profilePicUrl: sql`excluded.profile_pic_url`,
        followers: sql`excluded.followers`,
        following: sql`excluded.following`,
        bio: sql`excluded.bio`,
        externalUrl: sql`excluded.external_url`,
        countryCode: sql`coalesce(excluded.country_code, ${targets.countryCode})`,
        defaultLanguage: sql`coalesce(excluded.default_language, ${targets.defaultLanguage})`,
        lastVideoAt: sql`coalesce(excluded.last_video_at, ${targets.lastVideoAt})`,
        recentVideoCount: sql`coalesce(excluded.recent_video_count, ${targets.recentVideoCount})`,
        minRecentVideoViews: sql`coalesce(excluded.min_recent_video_views, ${targets.minRecentVideoViews})`,
        avgRecentVideoViews: sql`coalesce(excluded.avg_recent_video_views, ${targets.avgRecentVideoViews})`,
        recentVideosWindowDays: sql`coalesce(excluded.recent_videos_window_days, ${targets.recentVideosWindowDays})`,
        qualificationUpdatedAt: sql`coalesce(excluded.qualification_updated_at, ${targets.qualificationUpdatedAt})`,
        contactEmail: sql`coalesce(excluded.contact_email, ${targets.contactEmail})`,
        contactUrl: sql`coalesce(excluded.contact_url, ${targets.contactUrl})`,
        qualificationStatus: sql`excluded.qualification_status`,
        fitScore: sql`excluded.fit_score`,
        fitReasons: sql`excluded.fit_reasons`,
        sourceQuery: sql`coalesce(excluded.source_query, ${targets.sourceQuery})`,
        lastActivityAt: sql`coalesce(excluded.last_activity_at, ${targets.lastActivityAt})`,
        lastDiscoveredAt: sql`excluded.last_discovered_at`,
        discoveredVia: sql`excluded.discovered_via`,
        importBatchId: sql`excluded.import_batch_id`,
        enrichedAt: sql`excluded.enriched_at`,
        updatedAt: new Date(),
        // status, brandUserId, notes, contactedAt intentionally NOT updated
      },
    })
    .returning({ id: targets.id, xmax: sql<string>`xmax::text` });

  const inserted = result.filter((r) => r.xmax === '0').length;
  return { inserted, updated: result.length - inserted, ids: result.map((r) => r.id) };
}

export type ActiveTargetsFilter = {
  readonly platform?: 'twitch' | 'youtube' | 'kick';
  readonly cursor?: number;
  readonly limit: number;
};

export type ActiveTargetsPage = {
  readonly items: readonly Target[];
  readonly nextCursor: number | null;
};

/**
 * Cursor-paginated read of active creator targets for the skill's --refresh flow.
 * Filters out `descartado` rows. Sort by id ASC so the cursor (last id) is stable.
 *
 * Pageshape: `{ items, nextCursor }`. `nextCursor === null` indicates end of results.
 */
export async function getActiveTargetsPage(
  filter: ActiveTargetsFilter,
): Promise<ActiveTargetsPage> {
  const conditions = [ne(targets.status, 'descartado')];
  if (filter.platform) conditions.push(eq(targets.platform, filter.platform));
  if (filter.cursor !== undefined) conditions.push(gt(targets.id, filter.cursor));

  // Fetch limit + 1 to detect whether another page exists
  const rows = await db
    .select()
    .from(targets)
    .where(and(...conditions))
    .orderBy(asc(targets.id))
    .limit(filter.limit + 1);

  const hasMore = rows.length > filter.limit;
  const items = hasMore ? rows.slice(0, filter.limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? last.id : null;

  return { items, nextCursor };
}
