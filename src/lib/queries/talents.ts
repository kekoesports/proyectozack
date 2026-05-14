import { cache } from 'react';
import { eq, and, inArray, sql, count, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents, talentTags, talentStats, talentSocials, talentBusiness, talentVerticals, campaigns } from '@/db/schema';
import { parseFollowers, formatFollowers, slugify, initialsOf } from '@/lib/utils/import-utils';
import { normalizePlatform } from '@/lib/utils/platform';
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

/**
 * Devuelve los slugs de talents públicos, usado para `generateStaticParams` en `/talentos/[slug]`.
 *
 * @cache none
 * @visibility public
 * @returns array de `{ slug, updatedAt }` (puede ser vacío). Nunca null.
 */
export async function getTalentSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db.select({ slug: talents.slug, updatedAt: talents.updatedAt })
    .from(talents)
    .where(eq(talents.isPublished, true));
}

/**
 * Lista talents públicos con tags/stats/socials, filtrables por platform, tags, status, etc., ordenados por sortOrder ASC.
 *
 * @cache none
 * @visibility public
 * @returns array de TalentWithRelations (puede ser vacío). Nunca null.
 */
export async function getTalents(filters?: TalentFilters): Promise<TalentWithRelations[]> {
  // Public listing: only talents explicitly published AND listed in roster.
  const conditions: SQL[] = [eq(talents.isPublished, true), eq(talents.showInRoster, true)];

  if (filters?.platform) {
    conditions.push(eq(talents.platform, filters.platform));
  }
  if (filters?.status) {
    conditions.push(eq(talents.status, filters.status));
  }

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

/**
 * Devuelve un talent público por slug con tags/stats/socials.
 *
 * @cache wrapped in React cache() for request dedupe
 * @visibility public
 * @returns TalentWithRelations | undefined (nunca null) si el slug no existe o no es público.
 */
export const getTalentBySlug = cache(async (slug: string): Promise<TalentWithRelations | undefined> => {
  const row = await db.query.talents.findFirst({
    where: and(eq(talents.slug, slug), eq(talents.isPublished, true)),
    with: {
      tags: true,
      stats: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
  });
  return row ?? undefined;
});

/**
 * Devuelve talents (sin filtro de visibility) por sus ids con tags/stats/socials.
 *
 * @cache none
 * @visibility admin
 * @returns array de TalentWithRelations (vacío si `ids` está vacío). Nunca null.
 */
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

/**
 * Lista todos los talents (sin filtro de visibility) con tags/stats/socials ordenados por sortOrder ASC.
 *
 * @cache none
 * @visibility admin
 * @returns array de TalentWithRelations (puede ser vacío). Nunca null.
 */
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

/**
 * Devuelve los slugs de todos los talents (incluidos internos).
 *
 * @cache none
 * @visibility admin
 * @returns array de `{ slug }` (puede ser vacío). Nunca null.
 */
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

/**
 * Devuelve un talent por slug sin filtro de visibility, para vistas admin de edición/preview.
 *
 * @cache wrapped in React cache() for request dedupe
 * @visibility admin
 * @returns TalentWithRelations | undefined (nunca null) si no existe el slug.
 */
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
  activeDealsCount: number;
};

/**
 * Lista de admin roster: todos los talents con sus relaciones más datos de crecimiento a 30 días.
 *
 * @cache none
 * @visibility admin
 * @returns array de AdminRosterRow (puede ser vacío). Nunca null.
 */
export async function getAdminRosterWithGrowth(): Promise<AdminRosterRow[]> {
  const { getLatestSnapshots, getEarliestSnapshots } = await import('./analytics');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);

  const [allTalents, latestSnaps, earliestSnaps, activeDealRows] = await Promise.all([
    getAllTalents(),
    getLatestSnapshots(),
    getEarliestSnapshots(fromDate),
    db
      .select({ talentId: campaigns.talentId, cnt: count(campaigns.id) })
      .from(campaigns)
      .where(inArray(campaigns.status, ['propuesta', 'negociacion', 'aprobada', 'activa']))
      .groupBy(campaigns.talentId),
  ]);

  const dealsMap = new Map<number, number>();
  for (const row of activeDealRows) {
    if (row.talentId !== null) dealsMap.set(row.talentId, Number(row.cnt));
  }

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

    return { ...t, growth, activeDealsCount: dealsMap.get(t.id) ?? 0 };
  });
}

// ── Full profile (admin) ─────────────────────────────────────────────

export type TalentFullProfile = Talent & {
  socials: TalentSocial[];
  business: TalentBusiness | undefined;
  verticals: TalentVertical[];
  tags: TalentTag[];
};

/**
 * Perfil completo de un talent por id: incluye tags, socials, business y verticals.
 *
 * @cache none
 * @visibility admin
 * @returns TalentFullProfile | undefined (nunca null) si el id no existe.
 */
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
 * Upsert de un talent desde datos de import.
 *
 * @cache none
 * @visibility admin
 * @returns UpsertTalentFromImportResult `{ action: 'created' | 'updated' | 'skipped', id }`.
 */
export async function upsertTalentFromImport(
  input: UpsertTalentFromImportInput,
): Promise<UpsertTalentFromImportResult> {
  const { name, slug, mapped } = input;

  const rawPlatform = normalizePlatform((mapped['platform'] ?? '').trim().toLowerCase());
  const validPlatform = rawPlatform === 'twitch' || rawPlatform === 'youtube' ? rawPlatform : 'twitch';

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

  await insertSocialsFromMapped(newId, mapped, validPlatform);
  await insertBusinessFromMapped(newId, mapped);

  return { action: 'created', id: newId };
}

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

  await upsertSocialsFromMapped(id, mapped);
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

// ── Admin ──

/**
 * Actualiza los datos de compliance CNMC y fiscalidad española del talent.
 *
 * @visibility admin
 * @returns void. Lanza en error de DB.
 */
export async function updateTalentCompliance(
  talentId: number,
  data: {
    cnmcStatus?: 'registrado' | 'pendiente' | 'en_tramite' | 'no_aplica';
    cnmcRegisteredAt?: string | null;
    cnmcNotes?: string;
    hasRcInsurance?: boolean;
    taxType?: 'autonomo_es' | 'autonomo_es_nuevo' | 'sl_sa' | 'latam' | 'no_residente' | null;
    nif?: string;
    fiscalName?: string;
    fiscalAddress?: string;
  },
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (data.cnmcStatus !== undefined) set.cnmcStatus = data.cnmcStatus;
  if (data.cnmcRegisteredAt !== undefined) {
    set.cnmcRegisteredAt = data.cnmcRegisteredAt ? new Date(data.cnmcRegisteredAt) : null;
  }
  if (data.cnmcNotes !== undefined) set.cnmcNotes = data.cnmcNotes || null;
  if (data.hasRcInsurance !== undefined) set.hasRcInsurance = data.hasRcInsurance;
  if ('taxType' in data) set.taxType = data.taxType ?? null;
  if (data.nif !== undefined) set.nif = data.nif || null;
  if (data.fiscalName !== undefined) set.fiscalName = data.fiscalName || null;
  if (data.fiscalAddress !== undefined) set.fiscalAddress = data.fiscalAddress || null;

  if (Object.keys(set).length === 0) return;

  await db.update(talents).set(set).where(eq(talents.id, talentId));
}

void slugify;

// Re-export for convenience
export { talents, talentTags, talentStats, talentSocials };
