import 'server-only';

import { and, asc, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';

import {
  talentChannelSnapshots,
  talentContentPerformance,
  talents,
} from '@/db/schema';
import { db } from '@/lib/db';
import { parseFollowers } from '@/lib/utils/format';

export type TalentChannelSnapshotInput = {
  readonly talentId: number;
  readonly socialId: number;
  readonly platform: string;
  readonly snapshotDate: string;
  readonly followers: number;
  readonly totalViews?: number | null;
  readonly contentCount?: number | null;
  readonly recentViews30d?: number | null;
  readonly avgViews30d?: number | null;
  readonly uploads30d?: number | null;
  readonly engagementRate30d?: number | null;
  readonly avgCcv30d?: number | null;
  readonly peakCcv30d?: number | null;
  readonly hoursLive30d?: number | null;
  readonly dataSource: string;
};

export type TalentContentPerformanceInput = {
  readonly talentId: number;
  readonly socialId: number;
  readonly platform: string;
  readonly externalContentId: string;
  readonly title: string;
  readonly contentUrl: string;
  readonly thumbnailUrl?: string | null;
  readonly publishedAt: Date;
  readonly viewCount: number;
  readonly likeCount?: number | null;
  readonly commentCount?: number | null;
  readonly contentType?: string;
};

export async function upsertTalentChannelSnapshot(input: TalentChannelSnapshotInput): Promise<void> {
  await db.insert(talentChannelSnapshots).values({
    ...input,
    engagementRate30d: input.engagementRate30d?.toFixed(4) ?? null,
    hoursLive30d: input.hoursLive30d?.toFixed(2) ?? null,
  }).onConflictDoUpdate({
    target: [talentChannelSnapshots.socialId, talentChannelSnapshots.snapshotDate],
    set: {
      followers: input.followers,
      totalViews: input.totalViews ?? null,
      contentCount: input.contentCount ?? null,
      recentViews30d: input.recentViews30d ?? null,
      avgViews30d: input.avgViews30d ?? null,
      uploads30d: input.uploads30d ?? null,
      engagementRate30d: input.engagementRate30d?.toFixed(4) ?? null,
      avgCcv30d: input.avgCcv30d ?? null,
      peakCcv30d: input.peakCcv30d ?? null,
      hoursLive30d: input.hoursLive30d?.toFixed(2) ?? null,
      dataSource: input.dataSource,
    },
  });
}

export async function upsertTalentContentPerformance(
  rows: readonly TalentContentPerformanceInput[],
): Promise<void> {
  if (rows.length === 0) return;
  const now = new Date();

  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    await db.insert(talentContentPerformance).values(batch.map((row) => ({
      ...row,
      thumbnailUrl: row.thumbnailUrl ?? null,
      likeCount: row.likeCount ?? null,
      commentCount: row.commentCount ?? null,
      contentType: row.contentType ?? 'video',
      lastSyncedAt: now,
      updatedAt: now,
    }))).onConflictDoUpdate({
      target: [talentContentPerformance.platform, talentContentPerformance.externalContentId],
      set: {
        talentId: sql.raw('excluded.talent_id'),
        socialId: sql.raw('excluded.social_id'),
        title: sql.raw('excluded.title'),
        contentUrl: sql.raw('excluded.content_url'),
        thumbnailUrl: sql.raw('excluded.thumbnail_url'),
        contentType: sql.raw('excluded.content_type'),
        publishedAt: sql.raw('excluded.published_at'),
        viewCount: sql.raw('excluded.view_count'),
        likeCount: sql.raw('excluded.like_count'),
        commentCount: sql.raw('excluded.comment_count'),
        lastSyncedAt: now,
        updatedAt: now,
      },
    });
  }
}

export type TalentIntelligenceContent = {
  readonly id: number;
  readonly talentId: number;
  readonly talentName: string;
  readonly platform: string;
  readonly title: string;
  readonly url: string;
  readonly thumbnailUrl: string | null;
  readonly publishedAt: string;
  readonly views: number;
  readonly likes: number | null;
  readonly comments: number | null;
};

export type TalentIntelligenceCreator = {
  readonly id: number;
  readonly name: string;
  readonly photoUrl: string | null;
  readonly initials: string;
  readonly gradientC1: string;
  readonly gradientC2: string;
  readonly platforms: readonly string[];
  readonly totalAudience: number;
  readonly trackedAudience: number;
  readonly growth30: number;
  readonly growthPct30: number | null;
  readonly growth90: number;
  readonly growthPct90: number | null;
  readonly growth365: number;
  readonly growthPct365: number | null;
  readonly direction: 'rising' | 'stable' | 'falling' | 'untracked';
  readonly latestSnapshotAt: string | null;
  readonly stale: boolean;
  readonly bestGrowthMonth: { readonly month: string; readonly growth: number } | null;
  readonly bestViewsMonth: {
    readonly month: string;
    readonly views: number;
    readonly basis: 'channel-delta' | 'published-content';
  } | null;
  readonly bestContent: TalentIntelligenceContent | null;
  readonly reason: string;
};

export type TalentIntelligenceDashboard = {
  readonly generatedAt: string;
  readonly coverage: {
    readonly talents: number;
    readonly channels: number;
    readonly trackedChannels: number;
    readonly platforms: ReadonlyArray<{ readonly platform: string; readonly channels: number; readonly tracked: number }>;
  };
  readonly summary: {
    readonly totalAudience: number;
    readonly improving: number;
    readonly falling: number;
    readonly stale: number;
  };
  readonly dailyTrend: ReadonlyArray<{ readonly date: string; readonly youtube: number; readonly twitch: number; readonly total: number }>;
  readonly creators: readonly TalentIntelligenceCreator[];
  readonly topContent: readonly TalentIntelligenceContent[];
};

type SnapshotRow = typeof talentChannelSnapshots.$inferSelect;

export async function getTalentIntelligenceDashboard(opts?: {
  readonly talentIds?: readonly number[] | null;
}): Promise<TalentIntelligenceDashboard> {
  if (opts?.talentIds && opts.talentIds.length === 0) return emptyDashboard();

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 370);
  const fromDate = from.toISOString().slice(0, 10);
  const talentIds = opts?.talentIds ? [...opts.talentIds] : null;
  const snapshotFilter = talentIds
    ? and(
        gte(talentChannelSnapshots.snapshotDate, fromDate),
        inArray(talentChannelSnapshots.talentId, talentIds),
      )
    : gte(talentChannelSnapshots.snapshotDate, fromDate);
  const contentFilter = talentIds
    ? and(
        gte(talentContentPerformance.publishedAt, from),
        isNull(talents.archivedAt),
        inArray(talentContentPerformance.talentId, talentIds),
      )
    : and(
        gte(talentContentPerformance.publishedAt, from),
        isNull(talents.archivedAt),
      );
  const contentMonth = sql<string>`to_char(date_trunc('month', ${talentContentPerformance.publishedAt} AT TIME ZONE 'UTC'), 'YYYY-MM')`;

  const [talentRows, snapshots, topContentRows, bestContentRows, contentMonthRows] = await Promise.all([
    db.query.talents.findMany({
      where: (t, operators) => talentIds
        ? operators.and(operators.isNull(t.archivedAt), operators.inArray(t.id, talentIds))
        : operators.isNull(t.archivedAt),
      with: { socials: { orderBy: (s, { asc: orderAsc }) => [orderAsc(s.sortOrder)] } },
      orderBy: (t, { asc: orderAsc }) => [orderAsc(t.sortOrder)],
    }),
    db.select().from(talentChannelSnapshots)
      .where(snapshotFilter)
      .orderBy(asc(talentChannelSnapshots.snapshotDate)),
    db.select({
      content: talentContentPerformance,
      talentName: talents.name,
    }).from(talentContentPerformance)
      .innerJoin(talents, eq(talentContentPerformance.talentId, talents.id))
      .where(contentFilter)
      .orderBy(desc(talentContentPerformance.viewCount))
      .limit(30),
    db.selectDistinctOn([talentContentPerformance.talentId], {
      content: talentContentPerformance,
      talentName: talents.name,
    }).from(talentContentPerformance)
      .innerJoin(talents, eq(talentContentPerformance.talentId, talents.id))
      .where(contentFilter)
      .orderBy(talentContentPerformance.talentId, desc(talentContentPerformance.viewCount)),
    db.select({
      talentId: talentContentPerformance.talentId,
      month: contentMonth,
      views: sql<number>`coalesce(sum(${talentContentPerformance.viewCount}), 0)`.mapWith(Number),
    }).from(talentContentPerformance)
      .innerJoin(talents, eq(talentContentPerformance.talentId, talents.id))
      .where(contentFilter)
      .groupBy(talentContentPerformance.talentId, contentMonth),
  ]);

  const topContent = topContentRows.map(({ content: row, talentName }) => ({
    id: row.id,
    talentId: row.talentId,
    talentName,
    platform: row.platform,
    title: row.title,
    url: row.contentUrl,
    thumbnailUrl: row.thumbnailUrl,
    publishedAt: row.publishedAt.toISOString(),
    views: row.viewCount,
    likes: row.likeCount,
    comments: row.commentCount,
  } satisfies TalentIntelligenceContent));
  const bestContentByTalent = new Map(
    bestContentRows.map(({ content: row, talentName }) => [
      row.talentId,
      {
        id: row.id,
        talentId: row.talentId,
        talentName,
        platform: row.platform,
        title: row.title,
        url: row.contentUrl,
        thumbnailUrl: row.thumbnailUrl,
        publishedAt: row.publishedAt.toISOString(),
        views: row.viewCount,
        likes: row.likeCount,
        comments: row.commentCount,
      } satisfies TalentIntelligenceContent,
    ] as const),
  );
  const contentMonthsByTalent = buildContentMonths(contentMonthRows);

  const snapshotsByTalent = groupBy(snapshots, (row) => row.talentId);
  const trackedSocialIds = new Set(snapshots.map((row) => row.socialId));
  const now = Date.now();

  const creators = talentRows.map((talent) => {
    const talentSnapshots = snapshotsByTalent.get(talent.id) ?? [];
    const latestBySocial = latestRowsBy(talentSnapshots, (row) => row.socialId);
    const trackedAudience = [...latestBySocial.values()].reduce((sum, row) => sum + row.followers, 0);
    const totalAudience = talent.socials.reduce((sum, social) => sum + parseFollowers(social.followersDisplay), 0);
    const growth30 = calculateGrowth(talentSnapshots, 30);
    const growth90 = calculateGrowth(talentSnapshots, 90);
    const growth365 = calculateGrowth(talentSnapshots, 365);
    const latestDate = talentSnapshots.at(-1)?.snapshotDate ?? null;
    const stale = latestDate === null || now - new Date(`${latestDate}T12:00:00Z`).getTime() > 8 * 86_400_000;
    const direction = talentSnapshots.length === 0
      ? 'untracked'
      : growth30.pct !== null && growth30.pct >= 1
        ? 'rising'
        : growth30.pct !== null && growth30.pct < -0.25
          ? 'falling'
          : 'stable';
    const bestGrowthMonth = findBestGrowthMonth(talentSnapshots);
    const bestViewsMonth = findBestViewsMonth(talentSnapshots) ?? contentMonthsByTalent.get(talent.id) ?? null;
    const bestContent = bestContentByTalent.get(talent.id) ?? null;

    return {
      id: talent.id,
      name: talent.name,
      photoUrl: talent.photoUrl ?? null,
      initials: talent.initials,
      gradientC1: talent.gradientC1,
      gradientC2: talent.gradientC2,
      platforms: [...new Set(talent.socials.map((social) => social.platform))],
      totalAudience,
      trackedAudience,
      growth30: growth30.absolute,
      growthPct30: growth30.pct,
      growth90: growth90.absolute,
      growthPct90: growth90.pct,
      growth365: growth365.absolute,
      growthPct365: growth365.pct,
      direction,
      latestSnapshotAt: latestDate,
      stale,
      bestGrowthMonth,
      bestViewsMonth,
      bestContent,
      reason: buildTrendReason(direction, growth30.absolute, growth30.pct, bestContent, stale),
    } satisfies TalentIntelligenceCreator;
  });

  const platformCoverage = new Map<string, { channels: number; tracked: number }>();
  for (const talent of talentRows) {
    for (const social of talent.socials) {
      const current = platformCoverage.get(social.platform) ?? { channels: 0, tracked: 0 };
      current.channels += 1;
      if (trackedSocialIds.has(social.id)) current.tracked += 1;
      platformCoverage.set(social.platform, current);
    }
  }

  const dailyTrend = buildDailyTrend(snapshots);
  return {
    generatedAt: new Date().toISOString(),
    coverage: {
      talents: talentRows.length,
      channels: talentRows.reduce((sum, talent) => sum + talent.socials.length, 0),
      trackedChannels: trackedSocialIds.size,
      platforms: [...platformCoverage].map(([platform, values]) => ({ platform, ...values })),
    },
    summary: {
      totalAudience: creators.reduce((sum, row) => sum + row.totalAudience, 0),
      improving: creators.filter((row) => row.direction === 'rising').length,
      falling: creators.filter((row) => row.direction === 'falling').length,
      stale: creators.filter((row) => row.stale).length,
    },
    dailyTrend,
    creators,
    topContent,
  };
}

function emptyDashboard(): TalentIntelligenceDashboard {
  return {
    generatedAt: new Date().toISOString(),
    coverage: { talents: 0, channels: 0, trackedChannels: 0, platforms: [] },
    summary: { totalAudience: 0, improving: 0, falling: 0, stale: 0 },
    dailyTrend: [],
    creators: [],
    topContent: [],
  };
}

function groupBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const row of rows) {
    const bucket = grouped.get(key(row)) ?? [];
    bucket.push(row);
    grouped.set(key(row), bucket);
  }
  return grouped;
}

function latestRowsBy<K>(rows: readonly SnapshotRow[], key: (row: SnapshotRow) => K): Map<K, SnapshotRow> {
  const latest = new Map<K, SnapshotRow>();
  for (const row of rows) latest.set(key(row), row);
  return latest;
}

function calculateGrowth(rows: readonly SnapshotRow[], days: number): { absolute: number; pct: number | null } {
  const cutoff = Date.now() - days * 86_400_000;
  const bySocial = groupBy(rows, (row) => row.socialId);
  let current = 0;
  let baseline = 0;
  let comparable = 0;

  for (const values of bySocial.values()) {
    const latest = values.at(-1);
    if (!latest) continue;
    const inRange = values.find((row) => new Date(`${row.snapshotDate}T12:00:00Z`).getTime() >= cutoff) ?? values[0];
    if (!inRange) continue;
    current += latest.followers;
    baseline += inRange.followers;
    comparable += 1;
  }

  if (comparable === 0) return { absolute: 0, pct: null };
  const absolute = current - baseline;
  return { absolute, pct: baseline > 0 ? (absolute / baseline) * 100 : null };
}

function findBestGrowthMonth(rows: readonly SnapshotRow[]): { month: string; growth: number } | null {
  const byMonth = groupBy(rows, (row) => row.snapshotDate.slice(0, 7));
  let best: { month: string; growth: number } | null = null;
  for (const [month, monthRows] of byMonth) {
    const bySocial = groupBy(monthRows, (row) => row.socialId);
    const growth = [...bySocial.values()].reduce((sum, values) => {
      const first = values[0]?.followers ?? 0;
      const last = values.at(-1)?.followers ?? first;
      return sum + last - first;
    }, 0);
    if (!best || growth > best.growth) best = { month, growth };
  }
  return best;
}

function findBestViewsMonth(rows: readonly SnapshotRow[]): TalentIntelligenceCreator['bestViewsMonth'] {
  const comparable = rows.filter((row) => row.totalViews !== null);
  const byMonth = groupBy(comparable, (row) => row.snapshotDate.slice(0, 7));
  let best: TalentIntelligenceCreator['bestViewsMonth'] = null;
  for (const [month, monthRows] of byMonth) {
    const bySocial = groupBy(monthRows, (row) => row.socialId);
    const views = [...bySocial.values()].reduce((sum, values) => {
      const first = values[0]?.totalViews ?? 0;
      const last = values.at(-1)?.totalViews ?? first;
      return sum + Math.max(0, last - first);
    }, 0);
    if (views > 0 && (!best || views > best.views)) best = { month, views, basis: 'channel-delta' };
  }
  return best;
}

function buildContentMonths(
  rows: ReadonlyArray<{ readonly talentId: number; readonly month: string; readonly views: number }>,
): Map<number, NonNullable<TalentIntelligenceCreator['bestViewsMonth']>> {
  const best = new Map<number, NonNullable<TalentIntelligenceCreator['bestViewsMonth']>>();
  for (const row of rows) {
    const current = best.get(row.talentId);
    if (!current || row.views > current.views) {
      best.set(row.talentId, { month: row.month, views: row.views, basis: 'published-content' });
    }
  }
  return best;
}

function buildDailyTrend(rows: readonly SnapshotRow[]): TalentIntelligenceDashboard['dailyTrend'] {
  const byDate = groupBy(rows, (row) => row.snapshotDate);
  const latestPerSocial = new Map<number, SnapshotRow>();
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, dateRows]) => {
    for (const row of dateRows) latestPerSocial.set(row.socialId, row);
    let youtube = 0;
    let twitch = 0;
    for (const row of latestPerSocial.values()) {
      if (row.platform === 'youtube') youtube += row.followers;
      if (row.platform === 'twitch') twitch += row.followers;
    }
    return { date, youtube, twitch, total: youtube + twitch };
  });
}

function buildTrendReason(
  direction: TalentIntelligenceCreator['direction'],
  growth: number,
  pct: number | null,
  bestContent: TalentIntelligenceContent | null,
  stale: boolean,
): string {
  if (stale) return 'Datos automáticos desactualizados; conviene revisar la conexión del canal.';
  const formattedPct = pct === null ? null : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  if (direction === 'rising') {
    return `Mejora ${formattedPct ?? ''} en 30 días (${growth >= 0 ? '+' : ''}${growth.toLocaleString('es-ES')}).`;
  }
  if (direction === 'falling') {
    return `Pierde ${formattedPct ?? ''} en 30 días; revisar frecuencia y rendimiento del contenido.`;
  }
  if (bestContent) return `Audiencia estable; su mejor pieza reciente suma ${bestContent.views.toLocaleString('es-ES')} vistas.`;
  if (direction === 'untracked') return 'Canal sin histórico automático conectado.';
  return 'Audiencia estable en los últimos 30 días.';
}
