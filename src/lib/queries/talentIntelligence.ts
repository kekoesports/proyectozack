import 'server-only';

import { and, asc, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';

import {
  talentChannelSnapshots,
  talentContentPerformance,
  talents,
} from '@/db/schema';
import { db } from '@/lib/db';
import {
  calculateComparableGrowth,
  TALENT_GROWTH_PERIODS,
  type TalentGrowthMetric,
  type TalentGrowthPeriod,
} from '@/lib/talent-intelligence/growth';
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
  readonly socialId: number;
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

export type TalentIntelligenceChannel = {
  readonly socialId: number;
  readonly talentId: number;
  readonly talentName: string;
  readonly photoUrl: string | null;
  readonly initials: string;
  readonly gradientC1: string;
  readonly gradientC2: string;
  readonly platform: string;
  readonly handle: string;
  readonly profileUrl: string | null;
  readonly declaredAudience: number;
  readonly currentAudience: number | null;
  readonly verifiedAudience: boolean;
  readonly growth: Readonly<Record<TalentGrowthPeriod, TalentGrowthMetric>>;
  readonly latestSnapshotAt: string | null;
  readonly stale: boolean;
  readonly recentViews30d: number | null;
  readonly avgViews30d: number | null;
  readonly uploads30d: number | null;
  readonly engagementRate30d: number | null;
  readonly avgCcv30d: number | null;
  readonly peakCcv30d: number | null;
  readonly hoursLive30d: number | null;
  readonly bestGrowthMonth: { readonly month: string; readonly growth: number } | null;
  readonly bestViewsMonth: {
    readonly month: string;
    readonly views: number;
    readonly basis: 'channel-delta' | 'published-content';
  } | null;
  readonly bestContent: TalentIntelligenceContent | null;
};

export type TalentIntelligenceDashboard = {
  readonly generatedAt: string;
  readonly coverage: {
    readonly talents: number;
    readonly channels: number;
    readonly trackedChannels: number;
    readonly platforms: ReadonlyArray<{
      readonly platform: string;
      readonly channels: number;
      readonly tracked: number;
      readonly fresh: number;
      readonly comparable: Readonly<Record<TalentGrowthPeriod, number>>;
    }>;
  };
  readonly summary: {
    readonly verifiedAudience: number;
    readonly improving30: number;
    readonly falling30: number;
    readonly excluded30: number;
    readonly stale: number;
  };
  readonly dailyTrend: ReadonlyArray<{
    readonly date: string;
    readonly values: Readonly<Record<string, number>>;
  }>;
  readonly channels: readonly TalentIntelligenceChannel[];
  readonly topContent: readonly TalentIntelligenceContent[];
};

type SnapshotRow = typeof talentChannelSnapshots.$inferSelect;

export async function getTalentIntelligenceDashboard(opts?: {
  readonly talentIds?: readonly number[] | null;
}): Promise<TalentIntelligenceDashboard> {
  if (opts?.talentIds && opts.talentIds.length === 0) return emptyDashboard();

  const generatedAt = new Date();
  const asOfDate = generatedAt.toISOString().slice(0, 10);
  const from = new Date(generatedAt);
  from.setUTCDate(from.getUTCDate() - 130);
  const contentFrom = new Date(generatedAt);
  contentFrom.setUTCDate(contentFrom.getUTCDate() - 370);
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
        gte(talentContentPerformance.publishedAt, contentFrom),
        isNull(talents.archivedAt),
        inArray(talentContentPerformance.talentId, talentIds),
      )
    : and(
        gte(talentContentPerformance.publishedAt, contentFrom),
        isNull(talents.archivedAt),
      );
  const contentMonth = sql<string>`to_char(date_trunc('month', ${talentContentPerformance.publishedAt} AT TIME ZONE 'UTC'), 'YYYY-MM')`;

  const [talentRows, allSnapshots, topContentRows, bestContentRows, contentMonthRows] = await Promise.all([
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
    db.select({ content: talentContentPerformance, talentName: talents.name })
      .from(talentContentPerformance)
      .innerJoin(talents, eq(talentContentPerformance.talentId, talents.id))
      .where(contentFilter)
      .orderBy(desc(talentContentPerformance.viewCount))
      .limit(30),
    db.selectDistinctOn([talentContentPerformance.socialId], {
      content: talentContentPerformance,
      talentName: talents.name,
    }).from(talentContentPerformance)
      .innerJoin(talents, eq(talentContentPerformance.talentId, talents.id))
      .where(contentFilter)
      .orderBy(talentContentPerformance.socialId, desc(talentContentPerformance.viewCount)),
    db.select({
      socialId: talentContentPerformance.socialId,
      month: contentMonth,
      views: sql<number>`coalesce(sum(${talentContentPerformance.viewCount}), 0)`.mapWith(Number),
    }).from(talentContentPerformance)
      .innerJoin(talents, eq(talentContentPerformance.talentId, talents.id))
      .where(contentFilter)
      .groupBy(talentContentPerformance.socialId, contentMonth),
  ]);

  const activeTalentIds = new Set(talentRows.map((talent) => talent.id));
  const snapshots = allSnapshots.filter((row) => activeTalentIds.has(row.talentId));
  const topContent = topContentRows.map(({ content: row, talentName }) => mapContent(row, talentName));
  const bestContentBySocial = new Map(
    bestContentRows.map(({ content: row, talentName }) => [row.socialId, mapContent(row, talentName)] as const),
  );
  const contentMonthsBySocial = buildContentMonths(contentMonthRows);
  const snapshotsBySocial = groupBy(snapshots, (row) => row.socialId);

  const channels: TalentIntelligenceChannel[] = [];
  for (const talent of talentRows) {
    for (const social of talent.socials) {
      const channelSnapshots = snapshotsBySocial.get(social.id) ?? [];
      const latest = channelSnapshots.at(-1) ?? null;
      const growth = Object.fromEntries(TALENT_GROWTH_PERIODS.map((period) => [
        period,
        calculateComparableGrowth(channelSnapshots, period, asOfDate),
      ])) as Record<TalentGrowthPeriod, TalentGrowthMetric>;

      channels.push({
        socialId: social.id,
        talentId: talent.id,
        talentName: talent.name,
        photoUrl: talent.photoUrl ?? null,
        initials: talent.initials,
        gradientC1: talent.gradientC1,
        gradientC2: talent.gradientC2,
        platform: social.platform,
        handle: social.handle,
        profileUrl: social.profileUrl ?? null,
        declaredAudience: parseFollowers(social.followersDisplay),
        currentAudience: latest?.followers ?? null,
        verifiedAudience: Boolean(latest && isFreshSnapshot(latest.snapshotDate, asOfDate) && latest.followers > 0),
        growth,
        latestSnapshotAt: latest?.snapshotDate ?? null,
        stale: !latest || !isFreshSnapshot(latest.snapshotDate, asOfDate),
        recentViews30d: latest?.recentViews30d ?? null,
        avgViews30d: latest?.avgViews30d ?? null,
        uploads30d: latest?.uploads30d ?? null,
        engagementRate30d: latest?.engagementRate30d === null || latest?.engagementRate30d === undefined
          ? null
          : Number(latest.engagementRate30d),
        avgCcv30d: latest?.avgCcv30d ?? null,
        peakCcv30d: latest?.peakCcv30d ?? null,
        hoursLive30d: latest?.hoursLive30d === null || latest?.hoursLive30d === undefined
          ? null
          : Number(latest.hoursLive30d),
        bestGrowthMonth: findBestGrowthMonth(channelSnapshots),
        bestViewsMonth: findBestViewsMonth(channelSnapshots) ?? contentMonthsBySocial.get(social.id) ?? null,
        bestContent: bestContentBySocial.get(social.id) ?? null,
      });
    }
  }

  const platformNames = [...new Set(channels.map((channel) => channel.platform))];
  const platforms = platformNames.map((platform) => {
    const platformChannels = channels.filter((channel) => channel.platform === platform);
    return {
      platform,
      channels: platformChannels.length,
      tracked: platformChannels.filter((channel) => channel.latestSnapshotAt !== null).length,
      fresh: platformChannels.filter((channel) => channel.verifiedAudience).length,
      comparable: Object.fromEntries(TALENT_GROWTH_PERIODS.map((period) => [
        period,
        platformChannels.filter((channel) => channel.growth[period].eligible).length,
      ])) as Record<TalentGrowthPeriod, number>,
    };
  });
  const growth30 = channels.map((channel) => channel.growth[30]);

  return {
    generatedAt: generatedAt.toISOString(),
    coverage: {
      talents: talentRows.length,
      channels: channels.length,
      trackedChannels: channels.filter((channel) => channel.latestSnapshotAt !== null).length,
      platforms,
    },
    summary: {
      verifiedAudience: channels.reduce((sum, channel) => sum + (channel.verifiedAudience ? channel.currentAudience ?? 0 : 0), 0),
      improving30: growth30.filter((metric) => metric.eligible && (metric.pct ?? 0) >= 1).length,
      falling30: growth30.filter((metric) => metric.eligible && (metric.pct ?? 0) < -0.25).length,
      excluded30: growth30.filter((metric) => !metric.eligible).length,
      stale: channels.filter((channel) => channel.stale).length,
    },
    dailyTrend: buildDailyTrend(snapshots),
    channels,
    topContent,
  };
}

function emptyDashboard(): TalentIntelligenceDashboard {
  return {
    generatedAt: new Date().toISOString(),
    coverage: { talents: 0, channels: 0, trackedChannels: 0, platforms: [] },
    summary: { verifiedAudience: 0, improving30: 0, falling30: 0, excluded30: 0, stale: 0 },
    dailyTrend: [],
    channels: [],
    topContent: [],
  };
}

function mapContent(
  row: typeof talentContentPerformance.$inferSelect,
  talentName: string,
): TalentIntelligenceContent {
  return {
    id: row.id,
    talentId: row.talentId,
    socialId: row.socialId,
    talentName,
    platform: row.platform,
    title: row.title,
    url: row.contentUrl,
    thumbnailUrl: row.thumbnailUrl,
    publishedAt: row.publishedAt.toISOString(),
    views: row.viewCount,
    likes: row.likeCount,
    comments: row.commentCount,
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

function findBestGrowthMonth(rows: readonly SnapshotRow[]): { month: string; growth: number } | null {
  const byMonth = groupBy(rows, (row) => row.snapshotDate.slice(0, 7));
  let best: { month: string; growth: number } | null = null;
  for (const [month, values] of byMonth) {
    const first = values[0]?.followers ?? 0;
    const last = values.at(-1)?.followers ?? first;
    const growth = last - first;
    if (!best || growth > best.growth) best = { month, growth };
  }
  return best;
}

function findBestViewsMonth(rows: readonly SnapshotRow[]): TalentIntelligenceChannel['bestViewsMonth'] {
  const comparable = rows.filter((row) => row.totalViews !== null);
  const byMonth = groupBy(comparable, (row) => row.snapshotDate.slice(0, 7));
  let best: TalentIntelligenceChannel['bestViewsMonth'] = null;
  for (const [month, values] of byMonth) {
    const first = values[0]?.totalViews ?? 0;
    const last = values.at(-1)?.totalViews ?? first;
    const views = Math.max(0, last - first);
    if (views > 0 && (!best || views > best.views)) best = { month, views, basis: 'channel-delta' };
  }
  return best;
}

function buildContentMonths(
  rows: ReadonlyArray<{ readonly socialId: number; readonly month: string; readonly views: number }>,
): Map<number, NonNullable<TalentIntelligenceChannel['bestViewsMonth']>> {
  const best = new Map<number, NonNullable<TalentIntelligenceChannel['bestViewsMonth']>>();
  for (const row of rows) {
    const current = best.get(row.socialId);
    if (!current || row.views > current.views) {
      best.set(row.socialId, { month: row.month, views: row.views, basis: 'published-content' });
    }
  }
  return best;
}

function buildDailyTrend(rows: readonly SnapshotRow[]): TalentIntelligenceDashboard['dailyTrend'] {
  const byDate = groupBy(rows, (row) => row.snapshotDate);
  const latestPerSocial = new Map<number, SnapshotRow>();
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, dateRows]) => {
    for (const row of dateRows) latestPerSocial.set(row.socialId, row);
    const values: Record<string, number> = {};
    for (const row of latestPerSocial.values()) {
      values[row.platform] = (values[row.platform] ?? 0) + row.followers;
    }
    return { date, values };
  });
}

function isFreshSnapshot(snapshotDate: string, asOfDate: string): boolean {
  const age = new Date(`${asOfDate}T12:00:00Z`).getTime() - new Date(`${snapshotDate}T12:00:00Z`).getTime();
  return age <= 8 * 86_400_000;
}
