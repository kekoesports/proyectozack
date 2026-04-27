import { eq, and, gte, lte, inArray, asc, desc, sql, max, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talentMetricSnapshots, talentSocials, talents } from '@/db/schema';
import { toLocalIsoDate } from '@/lib/utils/date';
import { normalizeTrackablePlatform, TRACKABLE_SOCIAL_PLATFORM_KEYS } from '@/lib/utils/platform';
import type { TalentMetricSnapshot } from '@/types';

/**
 * Devuelve los talent_socials con `platformId` para plataformas trackeables (YouTube/Twitch).
 *
 * @cache none
 * @visibility admin
 * @returns array `{ talentId, platform, platformId }` listo para los cron jobs de stats.
 */
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

/**
 * Inserta un snapshot de métrica, ignorando duplicados (talentId+platform+metricType+date).
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
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

/**
 * Snapshots dentro de un rango de fechas, opcionalmente filtrados por talent/platform.
 *
 * @cache none
 * @visibility admin
 * @returns array ordenado por `snapshotDate ASC`.
 */
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

/**
 * Último snapshot por (talent, platform, metricType) — usado en growth reports.
 *
 * @cache none
 * @visibility admin
 * @returns array de snapshots, uno por combinación talent+platform+metricType.
 */
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

/**
 * Primer snapshot por (talent, platform, metricType) dentro de un rango — baseline de growth.
 *
 * @cache none
 * @visibility admin
 * @returns array de snapshots con `snapshotDate >= from` agregado por mín.
 */
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

/**
 * Cuenta talents con al menos un `platformId` configurado en plataformas trackeables.
 *
 * @cache none
 * @visibility admin
 * @returns número de talents distintos con tracking activo.
 */
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

/**
 * Todos los snapshots de un talent agrupados por platform y ordenados `snapshotDate DESC`.
 *
 * @cache none
 * @visibility admin
 * @returns objeto `{ [platform]: TalentMetricSnapshot[] }`.
 */
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

/**
 * Snapshots de un talent concreto en un rango — alimenta `/admin/analytics/report/[talentSlug]`.
 *
 * @cache none
 * @visibility admin
 * @returns array ordenado por `snapshotDate ASC`.
 */
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
 * Creators con último snapshot más antiguo que `daysThreshold` días (o sin snapshots).
 * Usado por el widget "stats desactualizadas" del dashboard.
 *
 * Nota: el comentario JSDoc previo decía que usa `talents.lastStatsUpdateAt`, pero
 * realmente sólo agrega `max(snapshotDate)` desde `talentMetricSnapshots`.
 *
 * @cache none
 * @visibility admin
 * @returns array ordenado por `lastSnapshotDate ASC` (los más antiguos primero).
 */
export async function getStaleStatsCreators(daysThreshold: number): Promise<StaleCreator[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);
  const cutoffStr = toLocalIsoDate(cutoff); // YYYY-MM-DD (local tz)

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
 * Top creators por followers totales (suma del último snapshot por plataforma).
 *
 * Nota: el comentario previo decía "falls back to talentSocials.followersDisplay" pero
 * el fallback no está implementado — talents sin snapshot devuelven `totalFollowers: 0`.
 *
 * @cache none
 * @visibility admin
 * @returns array de tamaño `<= limit` ordenado por `totalFollowers DESC`.
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
