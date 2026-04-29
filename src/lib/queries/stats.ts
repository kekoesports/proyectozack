import { eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents, talentSocials, statsShares } from '@/db/schema';
import { parseFollowers, formatCompact } from '@/lib/utils/format';

export type StatsGeoEntry = {
  readonly country: string;
  readonly pct: number;
};

export type StatsRow = {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly platform: 'youtube' | 'twitch';
  readonly socials: ReadonlyArray<{
    readonly id: number;
    readonly platform: string;
    readonly handle: string;
    readonly followersDisplay: string;
    readonly profileUrl: string | null;
    readonly avgViewers: number | null;
  }>;
  readonly totalFollowers: number;
  readonly totalFormatted: string;
  readonly avgViewers: number | null;
  readonly avgViewersFormatted: string;
  readonly topGeos: StatsGeoEntry[] | null;
  readonly audienceLanguage: string | null;
};

export type StatsRollup = {
  readonly totalReach: number;
  readonly totalReachFormatted: string;
  readonly channelCount: number;
  readonly avgReachPerChannel: number;
  readonly avgReachFormatted: string;
  readonly rows: StatsRow[];
};

function buildRollup(
  rows: Array<typeof talents.$inferSelect & { socials: Array<typeof talentSocials.$inferSelect> }>,
): StatsRollup {
  let totalReach = 0;
  const statsRows: StatsRow[] = rows
    .map((t) => {
      const totalFollowers = t.socials.reduce(
        (sum, s) => sum + parseFollowers(s.followersDisplay),
        0,
      );
      // Sum avgViewers across all socials that have a value (Twitch live CCV).
      // null means "no scraped data"; 0 stays 0 (real channel with no current viewers).
      const avgViewersValues = t.socials
        .map((s) => s.avgViewers)
        .filter((v): v is number => v !== null);
      const avgViewers =
        avgViewersValues.length > 0
          ? avgViewersValues.reduce((sum, v) => sum + v, 0)
          : null;
      totalReach += totalFollowers;
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        platform: t.platform,
        socials: t.socials.map((s) => ({
          id: s.id,
          platform: s.platform,
          handle: s.handle,
          followersDisplay: s.followersDisplay,
          profileUrl: s.profileUrl,
          avgViewers: s.avgViewers ?? null,
        })),
        totalFollowers,
        totalFormatted: totalFollowers > 0 ? formatCompact(totalFollowers) : '-',
        avgViewers,
        avgViewersFormatted:
          avgViewers !== null && avgViewers > 0 ? formatCompact(avgViewers) : '-',
        topGeos: t.topGeos ?? null,
        audienceLanguage: t.audienceLanguage ?? null,
      } satisfies StatsRow;
    })
    .sort((a, b) => {
      // Talents with no followers go to the bottom
      if (a.totalFollowers === 0 && b.totalFollowers === 0) return 0;
      if (a.totalFollowers === 0) return 1;
      if (b.totalFollowers === 0) return -1;
      return b.totalFollowers - a.totalFollowers;
    });

  const channelCount = statsRows.length;
  const avgReachPerChannel = channelCount > 0 ? Math.round(totalReach / channelCount) : 0;

  return {
    totalReach,
    totalReachFormatted: totalReach > 0 ? formatCompact(totalReach) : '0',
    channelCount,
    avgReachPerChannel,
    avgReachFormatted: avgReachPerChannel > 0 ? formatCompact(avgReachPerChannel) : '0',
    rows: statsRows,
  };
}

async function fetchAllTalentsWithSocials(): Promise<
  Array<typeof talents.$inferSelect & { socials: Array<typeof talentSocials.$inferSelect> }>
> {
  return db.query.talents.findMany({
    with: {
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });
}

/**
 * Calcula el rollup global de stats sobre todos los talents (reach total, channel count, avg reach, filas), para vistas internas/admin de stats.
 *
 * @cache none
 * @visibility admin
 * @returns StatsRollup `{ totalReach, totalReachFormatted, channelCount, avgReachPerChannel, avgReachFormatted, rows }`.
 */
export async function getStatsRollup(): Promise<StatsRollup> {
  const rows = await fetchAllTalentsWithSocials();
  return buildRollup(rows);
}

/**
 * Igual que `getStatsRollup` pero protegido por un token de share válido (no revocado), para `/stats/[token]`.
 *
 * @cache none
 * @visibility public
 * @returns StatsRollup si el token existe y no está revocado; `null` si no es válido.
 */
export async function getStatsRollupByToken(token: string): Promise<StatsRollup | null> {
  const share = await db
    .select()
    .from(statsShares)
    .where(eq(statsShares.token, token))
    .limit(1)
    .then((r) => r[0]);

  if (!share || share.revokedAt !== null) return null;

  const rows = await fetchAllTalentsWithSocials();
  return buildRollup(rows);
}

/**
 * Lista los tokens de stats share activos (sin `revokedAt`), para gestión de enlaces compartidos en admin.
 *
 * @cache none
 * @visibility admin
 * @returns array de filas de `statsShares` activas (puede ser vacío). Nunca null.
 */
export async function getActiveStatsShares(): Promise<
  Array<typeof statsShares.$inferSelect>
> {
  return db.select().from(statsShares).where(isNull(statsShares.revokedAt));
}
