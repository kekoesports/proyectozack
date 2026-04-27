import { cache } from 'react';
import { eq, and, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents, talentTags, talentStats, talentSocials, talentBusiness, talentVerticals } from '@/db/schema';
import { parseFollowers, formatFollowers, slugify, initialsOf } from '@/lib/import-utils';
import type { TalentWithRelations, TalentBusiness, TalentVertical, TalentSocial, TalentTag } from '@/types';
import type { Talent } from '@/types';

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

// ── Full profile (admin) ─────────────────────────────────────────────

export type TalentFullProfile = Talent & {
  socials: TalentSocial[];
  business: TalentBusiness | undefined;
  verticals: TalentVertical[];
  tags: TalentTag[];
};

export async function getTalentFullProfile(id: number): Promise<TalentFullProfile | undefined> {
  const row = await db.query.talents.findFirst({
    where: eq(talents.id, id),
    with: {
      tags: true,
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
  });
  if (!row) return undefined;

  const [businessRows, verticalRows] = await Promise.all([
    db.select().from(talentBusiness).where(eq(talentBusiness.talentId, id)).limit(1),
    db.select({ vertical: talentVerticals.vertical }).from(talentVerticals).where(eq(talentVerticals.talentId, id)),
  ]);

  return {
    ...row,
    business: businessRows[0] ?? undefined,
    verticals: verticalRows.map((r) => r.vertical),
  };
}

// ── Import upsert ────────────────────────────────────────────────────

const PLATFORM_HEX: Record<string, string> = {
  twitch: '#9146ff',
  youtube: '#ff0000',
  instagram: '#e1306c',
  tiktok: '#010101',
  kick: '#53fc18',
};

export type UpsertTalentFromImportInput = {
  readonly name: string;
  readonly slug: string;
  /** All mapped talent fields (keyed by talentField name) */
  readonly mapped: Record<string, string>;
};

export type UpsertTalentFromImportResult = {
  readonly action: 'created' | 'updated' | 'skipped';
  readonly id: number;
};

/**
 * Upsert a talent from import data.
 * Deduplication: first by slug, then by (platform, handle) in talentSocials.
 * - Match → UPDATE fields
 * - No match → INSERT new talent (inactive + internal)
 */
export async function upsertTalentFromImport(
  input: UpsertTalentFromImportInput,
): Promise<UpsertTalentFromImportResult> {
  const { name, slug, mapped } = input;

  const platform = (mapped['platform'] ?? '').trim().toLowerCase();
  const validPlatform = platform === 'twitch' || platform === 'youtube' ? platform : 'twitch';

  // ── 1. Try to find by slug ──────────────────────────────────────────
  const bySlug = await db
    .select({ id: talents.id })
    .from(talents)
    .where(eq(talents.slug, slug))
    .limit(1);

  if (bySlug.length > 0 && bySlug[0]) {
    const id = bySlug[0].id;
    await updateTalentFields(id, name, mapped);
    return { action: 'updated', id };
  }

  // ── 2. Try to find by (platform, handle) in talentSocials ──────────
  const primaryHandle = getPrimaryHandle(mapped, validPlatform);
  if (primaryHandle) {
    const bySocial = await db
      .select({ talentId: talentSocials.talentId })
      .from(talentSocials)
      .where(and(eq(talentSocials.platform, validPlatform), eq(talentSocials.handle, primaryHandle)))
      .limit(1);

    if (bySocial.length > 0 && bySocial[0]) {
      const id = bySocial[0].talentId;
      await updateTalentFields(id, name, mapped);
      return { action: 'updated', id };
    }
  }

  // ── 3. INSERT new talent ────────────────────────────────────────────
  const [maxRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(${talents.sortOrder}), 0)` })
    .from(talents);
  const nextSort = (maxRow?.max ?? 0) + 1;

  const country = (mapped['country'] ?? '').trim().toUpperCase().slice(0, 2) || undefined;

  const [inserted] = await db
    .insert(talents)
    .values({
      slug,
      name,
      role: 'Creator',
      game: 'General',
      platform: validPlatform,
      status: 'inactive',
      bio: '',
      gradientC1: '#f5632a',
      gradientC2: '#8b3aad',
      initials: initialsOf(name),
      sortOrder: nextSort,
      visibility: 'internal',
      creatorCountry: country,
      audienceLanguage: (mapped['language'] ?? '').trim() || undefined,
    })
    .returning({ id: talents.id });

  if (!inserted) throw new Error('insert devolvió vacío');

  const newId = inserted.id;

  // Insert socials for all mapped handles
  await insertSocialsFromMapped(newId, mapped, validPlatform);

  // Insert business data if present
  await insertBusinessFromMapped(newId, mapped);

  return { action: 'created', id: newId };
}

/** Get the primary handle for a platform from mapped fields */
function getPrimaryHandle(mapped: Record<string, string>, platform: string): string | null {
  const fieldMap: Record<string, string> = {
    twitch: 'twitchHandle',
    youtube: 'youtubeHandle',
    instagram: 'instagramHandle',
    tiktok: 'tiktokHandle',
    kick: 'kickHandle',
  };
  const field = fieldMap[platform];
  if (!field) return null;
  const handle = (mapped[field] ?? '').trim();
  return handle || null;
}

/** Update mutable fields on an existing talent */
async function updateTalentFields(
  id: number,
  name: string,
  mapped: Record<string, string>,
): Promise<void> {
  const country = (mapped['country'] ?? '').trim().toUpperCase().slice(0, 2) || undefined;
  const language = (mapped['language'] ?? '').trim() || undefined;

  await db
    .update(talents)
    .set({
      name,
      ...(country !== undefined ? { creatorCountry: country } : {}),
      ...(language !== undefined ? { audienceLanguage: language } : {}),
    })
    .where(eq(talents.id, id));

  // Update socials if handles are provided
  await upsertSocialsFromMapped(id, mapped);

  // Update business data if present
  await insertBusinessFromMapped(id, mapped);
}

type SocialEntry = {
  platform: string;
  handleField: string;
  followersField?: string;
};

const SOCIAL_ENTRIES: readonly SocialEntry[] = [
  { platform: 'twitch', handleField: 'twitchHandle', followersField: 'followers' },
  { platform: 'youtube', handleField: 'youtubeHandle', followersField: 'followers' },
  { platform: 'instagram', handleField: 'instagramHandle' },
  { platform: 'tiktok', handleField: 'tiktokHandle' },
  { platform: 'kick', handleField: 'kickHandle' },
];

async function insertSocialsFromMapped(
  talentId: number,
  mapped: Record<string, string>,
  primaryPlatform: string,
): Promise<void> {
  const followersRaw = (mapped['followers'] ?? '').trim();
  const followersNum = parseFollowers(followersRaw);
  const followersDisplay = formatFollowers(followersNum);

  let sortOrder = 0;
  for (const entry of SOCIAL_ENTRIES) {
    const handle = (mapped[entry.handleField] ?? '').trim();
    if (!handle) continue;

    const isPrimary = entry.platform === primaryPlatform;
    const display = isPrimary ? followersDisplay : '-';

    await db.insert(talentSocials).values({
      talentId,
      platform: entry.platform,
      handle,
      followersDisplay: display,
      hexColor: PLATFORM_HEX[entry.platform] ?? '#888',
      sortOrder: sortOrder++,
    });
  }
}

async function upsertSocialsFromMapped(
  talentId: number,
  mapped: Record<string, string>,
): Promise<void> {
  const followersRaw = (mapped['followers'] ?? '').trim();
  const followersNum = parseFollowers(followersRaw);
  const followersDisplay = formatFollowers(followersNum);

  for (const entry of SOCIAL_ENTRIES) {
    const handle = (mapped[entry.handleField] ?? '').trim();
    if (!handle) continue;

    const existing = await db
      .select({ id: talentSocials.id })
      .from(talentSocials)
      .where(and(eq(talentSocials.talentId, talentId), eq(talentSocials.platform, entry.platform)))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      await db
        .update(talentSocials)
        .set({ handle, followersDisplay })
        .where(eq(talentSocials.id, existing[0].id));
    } else {
      await db.insert(talentSocials).values({
        talentId,
        platform: entry.platform,
        handle,
        followersDisplay,
        hexColor: PLATFORM_HEX[entry.platform] ?? '#888',
        sortOrder: 0,
      });
    }
  }
}

async function insertBusinessFromMapped(
  talentId: number,
  mapped: Record<string, string>,
): Promise<void> {
  const email = (mapped['email'] ?? '').trim();
  const telegram = (mapped['telegram'] ?? '').trim();
  const notes = (mapped['notes'] ?? '').trim();

  if (!email && !telegram && !notes) return;

  const existing = await db
    .select({ talentId: talentBusiness.talentId })
    .from(talentBusiness)
    .where(eq(talentBusiness.talentId, talentId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(talentBusiness)
      .set({
        ...(email ? { contactEmail: email } : {}),
        ...(telegram ? { telegram } : {}),
        ...(notes ? { internalNotes: notes } : {}),
      })
      .where(eq(talentBusiness.talentId, talentId));
  } else {
    await db.insert(talentBusiness).values({
      talentId,
      ...(email ? { contactEmail: email } : {}),
      ...(telegram ? { telegram } : {}),
      ...(notes ? { internalNotes: notes } : {}),
    });
  }
}

// Re-export for convenience
export { talents, talentTags, talentStats, talentSocials };
