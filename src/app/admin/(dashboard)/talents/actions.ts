'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
import { db } from '@/lib/db';
import { talents, talentSocials } from '@/db/schema';
import { initialsOf, slugify } from '@/lib/utils/import-utils';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';

type ActionState = { readonly success: boolean; readonly error?: string };

const TalentCreate = z.object({
  name: z.string().trim().min(1, 'Nombre obligatorio').max(120),
  platform: z.string().trim().min(1).max(40).default('twitch'),
  handle: z.string().trim().min(1, 'Handle obligatorio').max(120),
  country: z
    .string()
    .trim()
    .max(2)
    .transform((s) => s.toUpperCase())
    .optional(),
  status: z.enum(['active', 'available', 'inactive']).default('inactive'),
  visibility: z.enum(['internal', 'public']).default('internal'),
  game: z.string().trim().max(120).optional(),
});

const TalentSecondary = z.object({
  platform: z.string().trim().min(1).max(40),
  handle: z.string().trim().min(1).max(120),
});

const IdOnly = z.object({ id: IdSchema });
const BioUpdate = z.object({
  id: IdSchema,
  bio: z.string().min(1).max(5000),
});

const PLATFORM_COLORS: Record<string, string> = {
  twitch: '#9147ff',
  youtube: '#ff0000',
  instagram: '#e1306c',
  tiktok: '#010101',
  kick: '#53fc18',
  x: '#1da1f2',
  twitter: '#1da1f2',
};

export async function createTalentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, TalentCreate);
  if (!parsed.ok) return { success: false, error: firstError(parsed.fieldErrors) };
  const { name, platform, handle, country, status, visibility, game } = parsed.data;

  const slug = slugify(name);
  const primaryPlatform = platform === 'twitch' || platform === 'youtube' ? platform : 'twitch';

  try {
    const [maxRow] = await db
      .select({ max: sql<number>`COALESCE(MAX(${talents.sortOrder}), 0)` })
      .from(talents);
    const nextSort = (maxRow?.max ?? 0) + 1;

    const [inserted] = await db
      .insert(talents)
      .values({
        slug,
        name,
        role: 'Creator',
        game: game ?? 'General',
        platform: primaryPlatform,
        status,
        bio: '',
        gradientC1: '#f5632a',
        gradientC2: '#8b3aad',
        initials: initialsOf(name),
        sortOrder: nextSort,
        visibility,
        creatorCountry: country ?? undefined,
      })
      .returning({ id: talents.id });

    if (!inserted) throw new Error('Insert failed');

    const hexColor = PLATFORM_COLORS[platform] ?? '#888888';

    await db.insert(talentSocials).values({
      talentId: inserted.id,
      platform,
      handle,
      followersDisplay: '-',
      hexColor,
      sortOrder: 1,
    });

    for (let i = 2; i <= 4; i++) {
      const candidate = TalentSecondary.safeParse({
        platform: formData.get(`platform_${i}`) ?? '',
        handle: formData.get(`handle_${i}`) ?? '',
      });
      if (!candidate.success) continue;
      const { platform: p, handle: h } = candidate.data;
      await db.insert(talentSocials).values({
        talentId: inserted.id,
        platform: p,
        handle: h,
        followersDisplay: '-',
        hexColor: PLATFORM_COLORS[p] ?? '#888888',
        sortOrder: i,
      });
    }

    revalidatePath('/admin/talents');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] createTalent error:', err);
    return { success: false, error: 'Error al crear talent' };
  }
}

export async function deleteTalentAction(formData: FormData): Promise<void> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  assertCanDelete(session.user.role);
  const parsed = parseFormData(formData, IdOnly);
  if (!parsed.ok) return;
  await db.delete(talents).where(eq(talents.id, parsed.data.id));
  revalidatePath('/admin/talents');
  revalidatePath('/');
}

export async function updateTalentBioAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const parsed = parseFormData(formData, BioUpdate);
  if (!parsed.ok) return;
  await db.update(talents).set({ bio: parsed.data.bio }).where(eq(talents.id, parsed.data.id));
  revalidatePath('/admin/talents');
  revalidatePath('/');
}

const STATUS_VALUES = ['active', 'available', 'inactive'] as const;
type TalentStatus = (typeof STATUS_VALUES)[number];

export async function setTalentStatusAction(
  talentId: number,
  status: TalentStatus,
): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  if (!STATUS_VALUES.includes(status)) return { success: false, error: 'Estado inválido' };
  if (!talentId) return { success: false, error: 'ID inválido' };
  try {
    await db.update(talents).set({ status }).where(eq(talents.id, talentId));
    revalidatePath('/admin/talents');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] setTalentStatus error:', err);
    return { success: false, error: 'Error al actualizar estado' };
  }
}

type GeoEntry = { country: string; pct: number };

export async function updateSocialGeoAction(
  socialId: number,
  topGeos: readonly GeoEntry[],
): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  if (!socialId) return { success: false, error: 'ID inválido' };

  const cleaned: GeoEntry[] = [];
  for (const entry of topGeos) {
    if (typeof entry?.country !== 'string' || typeof entry?.pct !== 'number') continue;
    const country = entry.country.trim().toUpperCase().slice(0, 3);
    if (!country) continue;
    const pct = Math.max(0, Math.min(100, Math.round(entry.pct * 10) / 10));
    cleaned.push({ country, pct });
  }

  try {
    await db
      .update(talentSocials)
      .set({ topGeos: cleaned.length > 0 ? cleaned : null })
      .where(eq(talentSocials.id, socialId));
    revalidatePath('/admin/talents');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] updateSocialGeo error:', err);
    return { success: false, error: 'Error al guardar geo' };
  }
}
