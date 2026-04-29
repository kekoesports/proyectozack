import { cache } from 'react';
import { eq, and, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents, talentTags, talentStats, talentSocials } from '@/db/schema';
import type { TalentWithRelations } from '@/types';

export type TalentFilters = {
  platform?: 'twitch' | 'youtube';
  tags?: string[];
  followersMin?: number;
  followersMax?: number;
  region?: string;
  status?: 'active' | 'available';
}

export async function getTalentSlugs(): Promise<{ slug: string }[]> {
  return db.select({ slug: talents.slug }).from(talents).where(eq(talents.visibility, 'public'));
}

export async function getTalents(filters?: TalentFilters): Promise<TalentWithRelations[]> {
  const conditions: SQL[] = [eq(talents.visibility, 'public')];

  if (filters?.platform) {
    conditions.push(eq(talents.platform, filters.platform));
  }
  if (filters?.status) {
    conditions.push(eq(talents.status, filters.status));
  }

  // Pre-filter by tags at DB level via subquery
  if (filters?.tags && filters.tags.length > 0) {
    const lowerTags = filters.tags.map((t) => t.toLowerCase());
    const matchingIds = db
      .select({ talentId: talentTags.talentId })
      .from(talentTags)
      .where(inArray(sql`lower(${talentTags.tag})`, lowerTags));
    conditions.push(inArray(talents.id, matchingIds));
  }

  const rows = await db.query.talents.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      tags: true,
      stats: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });

  return rows;
}

export const getTalentBySlug = cache(async (slug: string): Promise<TalentWithRelations | undefined> => {
  const row = await db.query.talents.findFirst({
    where: and(eq(talents.slug, slug), eq(talents.visibility, 'public')),
    with: {
      tags: true,
      stats: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
  });
  return row ?? undefined;
});

export async function getTalentsByIds(ids: number[]): Promise<TalentWithRelations[]> {
  if (ids.length === 0) return [];
  return db.query.talents.findMany({
    where: inArray(talents.id, ids),
    with: {
      tags: true,
      stats: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
  });
}

// ── Admin queries (no visibility filter) ────────────────────────────

export async function getAllTalents(): Promise<TalentWithRelations[]> {
  return db.query.talents.findMany({
    with: {
      tags: true,
      stats: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });
}

export async function getAllTalentSlugs(): Promise<{ slug: string }[]> {
  return db.select({ slug: talents.slug }).from(talents);
}

/** Carga un talento por ID con todas sus relaciones para el perfil admin. */
export async function getTalentById(id: number): Promise<TalentWithRelations | null> {
  const row = await db.query.talents.findFirst({
    where: eq(talents.id, id),
    with: {
      tags: true,
      stats: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
  });
  return row ?? null;
}

export const getTalentBySlugAdmin = cache(async (slug: string): Promise<TalentWithRelations | undefined> => {
  const row = await db.query.talents.findFirst({
    where: eq(talents.slug, slug),
    with: {
      tags: true,
      stats: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
  });
  return row ?? undefined;
});

// ── Admin roster with 30-day growth data ─────────────────────────────

export type GrowthData = {
  /** platform key in snapshot space ('youtube' | 'twitch') */
  platform: string;
  latestValue: number;
  earliestValue: number;
  growthPct: number | null;
};

export type AdminRosterRow = TalentWithRelations & {
  growth: GrowthData[];
};

/**
 * Fetch all talents with their socials + 30-day growth from snapshots.
 * Merges `talentMetricSnapshots` data into each talent row.
 */
export async function getAdminRosterWithGrowth(): Promise<AdminRosterRow[]> {
  const { getLatestSnapshots, getEarliestSnapshots } = await import('./analytics');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]!;

  const [allTalents, latestSnaps, earliestSnaps] = await Promise.all([
    getAllTalents(),
    getLatestSnapshots(),
    getEarliestSnapshots(fromDate),
  ]);

  // Build maps: talentId-platform → snapshot value
  const latestMap = new Map<string, number>();
  for (const s of latestSnaps) {
    latestMap.set(`${s.talentId}-${s.platform}`, s.value);
  }
  const earliestMap = new Map<string, number>();
  for (const s of earliestSnaps) {
    earliestMap.set(`${s.talentId}-${s.platform}`, s.value);
  }

  return allTalents.map((t) => {
    const growth: GrowthData[] = [];

    for (const platform of ['youtube', 'twitch'] as const) {
      const key = `${t.id}-${platform}`;
      const latest = latestMap.get(key);
      const earliest = earliestMap.get(key);

      if (latest !== undefined) {
        growth.push({
          platform,
          latestValue: latest,
          earliestValue: earliest ?? latest,
          growthPct: earliest && earliest > 0
            ? ((latest - earliest) / earliest) * 100
            : null,
        });
      }
    }

    return { ...t, growth };
  });
}

// Re-export for convenience
export { talents, talentTags, talentStats, talentSocials };
