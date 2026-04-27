import { eq, and, gte, lte, inArray, asc, desc, sql, max, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talentMetricSnapshots, talentSocials, talents } from '@/db/schema';
import { normalizeTrackablePlatform, TRACKABLE_SOCIAL_PLATFORM_KEYS } from '@/lib/platform';
import type { TalentMetricSnapshot } from '@/types';

/** Fetch all talent_socials rows that have a platformId for YouTube or Twitch */
export async function getTrackableSocials() {
  const rows = await db
    .select({
      talentId: talentSocials.talentId,
      platform: talentSocials.platform,
      platformId: talentSocials.platformId,
    })
    .from(talentSocials)
    .where(
      and(
        sql`${talentSocials.platformId} IS NOT NULL`,
        inArray(talentSocials.platform, [...TRACKABLE_SOCIAL_PLATFORM_KEYS]),
      ),
    );

  return rows.flatMap((r) => {
    const platform = normalizeTrackablePlatform(r.platform);

    if (!platform) {
      return [];
    }

    return [{
      talentId: r.talentId,
      platform,
      platformId: r.platformId!,
    }];
  });
}

/** Insert a snapshot, ignoring duplicates */
export async function insertSnapshot(data: {
  talentId: number;
  platform: string;
  metricType: string;
  value: number;
  snapshotDate: string; // YYYY-MM-DD
}) {
  await db
    .insert(talentMetricSnapshots)
    .values({
      talentId: data.talentId,
      platform: data.platform,
      metricType: data.metricType,
      value: data.value,
      snapshotDate: data.snapshotDate,
    })
    .onConflictDoNothing({
      target: [
        talentMetricSnapshots.talentId,
        talentMetricSnapshots.platform,
        talentMetricSnapshots.metricType,
        talentMetricSnapshots.snapshotDate,
      ],
    });
}

/** Get snapshots for a date range, optionally filtered by talent/platform */
export async function getSnapshots(opts: {
  from: string;
  to: string;
  talentIds?: number[];
  platform?: 'youtube' | 'twitch';
}): Promise<TalentMetricSnapshot[]> {
  const conditions = [
    gte(talentMetricSnapshots.snapshotDate, opts.from),
    lte(talentMetricSnapshots.snapshotDate, opts.to),
  ];

  if (opts.talentIds && opts.talentIds.length > 0) {
    conditions.push(inArray(talentMetricSnapshots.talentId, opts.talentIds));
  }
  if (opts.platform) {
    conditions.push(eq(talentMetricSnapshots.platform, opts.platform));
  }

  return db
    .select()
    .from(talentMetricSnapshots)
    .where(and(...conditions))
    .orderBy(asc(talentMetricSnapshots.snapshotDate));
}

/** Get the latest snapshot per talent per platform */
export async function getLatestSnapshots(): Promise<TalentMetricSnapshot[]> {
  const latestDates = db
    .select({
      talentId: talentMetricSnapshots.talentId,
      platform: talentMetricSnapshots.platform,
      metricType: talentMetricSnapshots.metricType,
      maxDate: sql<string>`max(${talentMetricSnapshots.snapshotDate})`.as('max_date'),
    })
    .from(talentMetricSnapshots)
    .groupBy(
      talentMetricSnapshots.talentId,
      talentMetricSnapshots.platform,
      talentMetricSnapshots.metricType,
    )
    .as('latest');

  return db
    .select({
      id: talentMetricSnapshots.id,
      talentId: talentMetricSnapshots.talentId,
      platform: talentMetricSnapshots.platform,
      metricType: talentMetricSnapshots.metricType,
      value: talentMetricSnapshots.value,
      snapshotDate: talentMetricSnapshots.snapshotDate,
      topGeos: talentMetricSnapshots.topGeos,
      notes: talentMetricSnapshots.notes,
      updatedByUserId: talentMetricSnapshots.updatedByUserId,
      createdAt: talentMetricSnapshots.createdAt,
    })
    .from(talentMetricSnapshots)
    .innerJoin(
      latestDates,
      and(
        eq(talentMetricSnapshots.talentId, latestDates.talentId),
        eq(talentMetricSnapshots.platform, latestDates.platform),
        eq(talentMetricSnapshots.metricType, latestDates.metricType),
        eq(talentMetricSnapshots.snapshotDate, latestDates.maxDate),
      ),
    );
}

/** Get the earliest snapshot per talent per platform within a date range */
export async function getEarliestSnapshots(from: string): Promise<TalentMetricSnapshot[]> {
  const earliestDates = db
    .select({
      talentId: talentMetricSnapshots.talentId,
      platform: talentMetricSnapshots.platform,
      metricType: talentMetricSnapshots.metricType,
      minDate: sql<string>`min(${talentMetricSnapshots.snapshotDate})`.as('min_date'),
    })
    .from(talentMetricSnapshots)
    .where(gte(talentMetricSnapshots.snapshotDate, from))
    .groupBy(
      talentMetricSnapshots.talentId,
      talentMetricSnapshots.platform,
      talentMetricSnapshots.metricType,
    )
    .as('earliest');

  return db
    .select({
      id: talentMetricSnapshots.id,
      talentId: talentMetricSnapshots.talentId,
      platform: talentMetricSnapshots.platform,
      metricType: talentMetricSnapshots.metricType,
      value: talentMetricSnapshots.value,
      snapshotDate: talentMetricSnapshots.snapshotDate,
      topGeos: talentMetricSnapshots.topGeos,
      notes: talentMetricSnapshots.notes,
      updatedByUserId: talentMetricSnapshots.updatedByUserId,
      createdAt: talentMetricSnapshots.createdAt,
    })
    .from(talentMetricSnapshots)
    .innerJoin(
      earliestDates,
      and(
        eq(talentMetricSnapshots.talentId, earliestDates.talentId),
        eq(talentMetricSnapshots.platform, earliestDates.platform),
        eq(talentMetricSnapshots.metricType, earliestDates.metricType),
        eq(talentMetricSnapshots.snapshotDate, earliestDates.minDate),
      ),
    );
}

/** Count talents that have at least one platformId configured */
export async function countTrackedTalents(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(distinct ${talentSocials.talentId})` })
    .from(talentSocials)
    .where(
      and(
        sql`${talentSocials.platformId} IS NOT NULL`,
        inArray(talentSocials.platform, [...TRACKABLE_SOCIAL_PLATFORM_KEYS]),
      ),
    );
  return rows[0]?.count ?? 0;
}

/** Get all snapshots for a talent grouped by platform, ordered by snapshotDate DESC */
export async function getLatestSnapshotsByPlatform(
  talentId: number,
): Promise<Record<string, TalentMetricSnapshot[]>> {
  const rows = await db
    .select()
    .from(talentMetricSnapshots)
    .where(eq(talentMetricSnapshots.talentId, talentId))
    .orderBy(desc(talentMetricSnapshots.snapshotDate));

  const grouped: Record<string, TalentMetricSnapshot[]> = {};
  for (const row of rows) {
    const platform = row.platform;
    if (!grouped[platform]) grouped[platform] = [];
    grouped[platform]!.push(row);
  }
  return grouped;
}

/** Get snapshots for a single talent */
export async function getTalentSnapshots(
  talentId: number,
  from: string,
  to: string,
): Promise<TalentMetricSnapshot[]> {
  return db
    .select()
    .from(talentMetricSnapshots)
    .where(
      and(
        eq(talentMetricSnapshots.talentId, talentId),
        gte(talentMetricSnapshots.snapshotDate, from),
        lte(talentMetricSnapshots.snapshotDate, to),
      ),
    )
    .orderBy(asc(talentMetricSnapshots.snapshotDate));
}

export type StaleCreator = {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly lastSnapshotDate: Date | null;
};

/**
 * Creators whose last snapshot is older than daysThreshold days (or have no snapshot).
 * Uses talents.lastStatsUpdateAt if available, falls back to max(snapshotDate) from snapshots.
 */
export async function getStaleStatsCreators(daysThreshold: number): Promise<StaleCreator[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);
  const cutoffStr = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

  // Subquery: latest snapshot date per talent
  const latestPerTalent = db
    .select({
      talentId: talentMetricSnapshots.talentId,
      lastDate: max(talentMetricSnapshots.snapshotDate).as('last_date'),
    })
    .from(talentMetricSnapshots)
    .groupBy(talentMetricSnapshots.talentId)
    .as('latest_per_talent');

  const rows = await db
    .select({
      id: talents.id,
      name: talents.name,
      slug: talents.slug,
      lastDate: latestPerTalent.lastDate,
    })
    .from(talents)
    .leftJoin(latestPerTalent, eq(talents.id, latestPerTalent.talentId))
    .where(
      sql`(${latestPerTalent.lastDate} IS NULL OR ${latestPerTalent.lastDate} < ${cutoffStr})`,
    )
    .orderBy(asc(latestPerTalent.lastDate));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    lastSnapshotDate: r.lastDate !== null ? new Date(r.lastDate) : null,
  }));
}

export type TopCreatorByFollowers = {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly photoUrl: string | null;
  readonly gradientC1: string;
  readonly gradientC2: string;
  readonly initials: string;
  readonly totalFollowers: number;
  readonly platforms: string[];
};

/**
 * Top creators by total followers (sum of latest snapshot value per platform).
 * Falls back to talentSocials.followersDisplay if no snapshots exist.
 */
export async function getTopCreatorsByFollowers(limit: number): Promise<TopCreatorByFollowers[]> {
  // Get latest snapshot per talent+platform (metricType = subscribers|followers)
  const latestSnapshotDates = db
    .select({
      talentId: talentMetricSnapshots.talentId,
      platform: talentMetricSnapshots.platform,
      maxDate: max(talentMetricSnapshots.snapshotDate).as('max_date'),
    })
    .from(talentMetricSnapshots)
    .where(inArray(talentMetricSnapshots.metricType, ['subscribers', 'followers']))
    .groupBy(talentMetricSnapshots.talentId, talentMetricSnapshots.platform)
    .as('latest_snapshot_dates');

  // Join to get the actual values
  const snapshotValues = await db
    .select({
      talentId: talentMetricSnapshots.talentId,
      platform: talentMetricSnapshots.platform,
      value: talentMetricSnapshots.value,
    })
    .from(talentMetricSnapshots)
    .innerJoin(
      latestSnapshotDates,
      and(
        eq(talentMetricSnapshots.talentId, latestSnapshotDates.talentId),
        eq(talentMetricSnapshots.platform, latestSnapshotDates.platform),
        eq(talentMetricSnapshots.snapshotDate, latestSnapshotDates.maxDate),
      ),
    )
    .where(inArray(talentMetricSnapshots.metricType, ['subscribers', 'followers']));

  // Aggregate per talent
  const snapshotMap = new Map<number, { total: number; platforms: Set<string> }>();
  for (const row of snapshotValues) {
    const entry = snapshotMap.get(row.talentId) ?? { total: 0, platforms: new Set<string>() };
    entry.total += row.value;
    entry.platforms.add(row.platform);
    snapshotMap.set(row.talentId, entry);
  }

  // Get all talents
  const allTalents = await db
    .select({
      id: talents.id,
      name: talents.name,
      slug: talents.slug,
      photoUrl: talents.photoUrl,
      gradientC1: talents.gradientC1,
      gradientC2: talents.gradientC2,
      initials: talents.initials,
    })
    .from(talents);

  return allTalents
    .map((t) => {
      const snap = snapshotMap.get(t.id);
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        photoUrl: t.photoUrl ?? null,
        gradientC1: t.gradientC1,
        gradientC2: t.gradientC2,
        initials: t.initials,
        totalFollowers: snap?.total ?? 0,
        platforms: snap ? [...snap.platforms] : [],
      };
    })
    .sort((a, b) => b.totalFollowers - a.totalFollowers)
    .slice(0, limit);
}
