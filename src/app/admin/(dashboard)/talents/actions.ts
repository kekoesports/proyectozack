'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { requirePermission } from '@/lib/permissions';
import { assertCanDelete } from '@/lib/permissions';
import { db } from '@/lib/db';
import { talents, talentSocials, talentStats, talentTags } from '@/db/schema';
import { initialsOf, slugify } from '@/lib/utils/import-utils';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';
import { SocialPlatformSchema } from '@/lib/schemas/talentSocials';

type ActionState = { readonly success: boolean; readonly error?: string };

const TalentCreate = z.object({
  name: z.string().trim().min(1, 'Nombre obligatorio').max(120),
  platform: SocialPlatformSchema.default('twitch'),
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
  platform: SocialPlatformSchema,
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
  await requirePermission('talentos', 'write');

  const parsed = parseFormData(formData, TalentCreate);
  if (!parsed.ok) return { success: false, error: firstError(parsed.fieldErrors) };
  const { name, platform, handle, country, status, visibility, game } = parsed.data;

  const slug = slugify(name);
  if (!slug) return { success: false, error: 'El nombre no genera un slug válido. Usa letras y números.' };

  const primaryPlatform = platform === 'twitch' || platform === 'youtube' ? platform : 'twitch';

  // Comprobar slug duplicado antes de intentar el insert
  const existing = await db.select({ id: talents.id, name: talents.name }).from(talents).where(eq(talents.slug, slug)).limit(1);
  if (existing.length > 0) {
    return { success: false, error: `Ya existe un talento con ese nombre (slug "${slug}" en uso por "${existing[0]?.name ?? slug}"). Usa un nombre distinto.` };
  }

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
        isPublished:   visibility === 'public',
        showInRoster:  visibility === 'public',
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
    const msg = err instanceof Error ? err.message : '';
    // Duplicate key from DB (safety net in case of race condition)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { success: false, error: `Ya existe un talento con el nombre "${name}". Usa un nombre distinto.` };
    }
    return { success: false, error: 'Error al crear talento. Revisa los datos e inténtalo de nuevo.' };
  }
}

export async function deleteTalentAction(formData: FormData): Promise<void> {
  const session = await requirePermission('talentos', 'read');
  assertCanDelete(session.user.role);
  const parsed = parseFormData(formData, IdOnly);
  if (!parsed.ok) return;
  await db.delete(talents).where(eq(talents.id, parsed.data.id));
  revalidatePath('/admin/talents');
  revalidatePath('/');
}

export async function updateTalentBioAction(formData: FormData): Promise<void> {
  await requirePermission('talentos', 'read');
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
  await requirePermission('talentos', 'read');
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
  await requirePermission('talentos', 'read');
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

export async function updateTalentStatsAction(
  talentId: number,
  entries: Array<{ id: number; value: string }>,
): Promise<{ ok: boolean; error?: string }> {
  await requirePermission('talentos', 'write');
  if (!talentId) return { ok: false, error: 'ID inválido' };
  try {
    const current = await db.select({ slug: talents.slug }).from(talents).where(eq(talents.id, talentId)).limit(1);
    const slug = current[0]?.slug;
    for (const entry of entries) {
      const val = entry.value.trim();
      if (!val) continue;
      await db.update(talentStats).set({ value: val }).where(eq(talentStats.id, entry.id));
    }
    revalidatePath(`/admin/talents/${talentId}`);
    revalidatePath('/talentos');
    if (slug) revalidatePath(`/talentos/${slug}`);
    return { ok: true };
  } catch (err) {
    logRedacted('error', '[admin] updateTalentStats error:', err);
    return { ok: false, error: 'Error al guardar métricas' };
  }
}

export async function createTalentStatAction(
  talentId: number,
  entry: { icon: string; label: string; value: string; sortOrder: number },
): Promise<{ ok: boolean; id?: number; error?: string }> {
  await requirePermission('talentos', 'write');
  if (!talentId) return { ok: false, error: 'ID inválido' };
  const icon  = entry.icon.trim().slice(0, 10);
  const label = entry.label.trim().slice(0, 100);
  const value = entry.value.trim().slice(0, 50);
  if (!label) return { ok: false, error: 'El label es obligatorio' };
  try {
    const current = await db.select({ slug: talents.slug }).from(talents).where(eq(talents.id, talentId)).limit(1);
    const slug = current[0]?.slug;
    const [row] = await db.insert(talentStats).values({ talentId, icon, label, value, sortOrder: entry.sortOrder }).returning({ id: talentStats.id });
    if (!row) return { ok: false, error: 'Error al crear métrica' };
    revalidatePath(`/admin/talents/${talentId}`);
    revalidatePath('/talentos');
    if (slug) revalidatePath(`/talentos/${slug}`);
    return { ok: true, id: row.id };
  } catch (err) {
    logRedacted('error', '[admin] createTalentStat error:', err);
    return { ok: false, error: 'Error al crear métrica' };
  }
}

export async function bulkUpdateSortOrderAction(
  updates: Array<{ id: number; sortOrder: number }>,
): Promise<{ ok: boolean }> {
  await requirePermission('talentos', 'write');
  for (const u of updates) {
    await db.update(talents).set({ sortOrder: u.sortOrder }).where(eq(talents.id, u.id));
  }
  revalidatePath('/admin/talents');
  revalidatePath('/talentos');
  return { ok: true };
}

export async function updateSortOrderAction(
  talentId: number,
  sortOrder: number,
): Promise<{ ok: boolean }> {
  await requirePermission('talentos', 'write');
  if (!talentId || !Number.isFinite(sortOrder)) return { ok: false };
  await db.update(talents).set({ sortOrder }).where(eq(talents.id, talentId));
  revalidatePath('/admin/talents');
  revalidatePath('/talentos');
  return { ok: true };
}

/** Void form-action wrapper para cambio de status desde roster (sin useActionState). */
export async function setTalentStatusVoidAction(formData: FormData): Promise<void> {
  const idRaw     = formData.get('talentId');
  const statusRaw = formData.get('status');
  const id        = typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (isNaN(id) || !STATUS_VALUES.includes(statusRaw as TalentStatus)) return;
  await setTalentStatusAction(id, statusRaw as TalentStatus);
}

/** Quick-toggle de publicación desde la ficha de talento (sin formulario completo). */
export async function setTalentPublishedAction(talentId: number, publish: boolean): Promise<void> {
  await requirePermission('talentos', 'write');
  if (!talentId || !Number.isFinite(talentId)) return;
  const current = await db.select({ slug: talents.slug }).from(talents).where(eq(talents.id, talentId)).limit(1);
  const slug = current[0]?.slug;
  await db.update(talents).set({
    isPublished: publish,
    visibility:  publish ? 'public' : 'internal',
    ...(publish ? {} : { showInRoster: false }),
  }).where(eq(talents.id, talentId));
  revalidatePath('/admin/talents');
  revalidatePath(`/admin/talents/${talentId}`);
  revalidatePath('/talentos');
  if (slug) {
    revalidatePath(`/talentos/${slug}`);
    revalidatePath('/sitemap.xml');
  }
}

// ── Profile edit ─────────────────────────────────────────────────────────────

const TalentProfileUpdate = z.object({
  id: IdSchema,
  name:          z.string().trim().min(1, 'Nombre obligatorio').max(120),
  role:          z.string().trim().min(1, 'Rol obligatorio').max(150),
  role2:         z.string().trim().max(150).optional().transform((v) => v === '' ? null : v ?? null),
  game:          z.string().trim().max(100).default('General'),
  platform:      z.enum(['twitch', 'youtube']),
  creatorCountry: z.string().trim().toUpperCase()
    .refine((s) => s === '' || /^[A-Z]{2}$/.test(s), 'Código de país inválido (ISO-2)')
    .transform((s) => s === '' ? null : s),
  status:       z.enum(['active', 'available', 'inactive']),
  isPublished:  z.string().optional().transform((v) => v === 'on'),
  showInRoster: z.string().optional().transform((v) => v === 'on'),
  initials:     z.string().trim().min(1).max(4),
  gradientC1: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hex inválido'),
  gradientC2: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hex inválido'),
  sortOrder:  z.coerce.number().int().min(0).max(9999).default(0),
  bio:        z.string().max(5000).default(''),
  bioLong:    z.string().max(10000).optional(),
});

export async function updateTalentProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('talentos', 'write');

  const parsed = parseFormData(formData, TalentProfileUpdate);
  if (!parsed.ok) return { success: false, error: firstError(parsed.fieldErrors) };

  const { id, ...data } = parsed.data;

  // Regla: no se puede estar en roster sin estar publicado
  const isPublished  = data.isPublished;
  const showInRoster = isPublished ? data.showInRoster : false;
  if (data.showInRoster && !isPublished) {
    return { success: false, error: 'Para aparecer en el roster, el perfil debe estar publicado.' };
  }

  try {
    // Obtener slug actual para revalidar la ruta pública individual
    const current = await db.select({ slug: talents.slug }).from(talents).where(eq(talents.id, id)).limit(1);
    const slug = current[0]?.slug;

    await db.update(talents).set({
      name:          data.name,
      role:          data.role,
      role2:         data.role2,
      game:          data.game,
      platform:      data.platform,
      creatorCountry: data.creatorCountry,
      status:        data.status,
      // Sync legacy visibility field from isPublished (backwards compat)
      visibility:    isPublished ? 'public' : 'internal',
      isPublished,
      showInRoster,
      initials:      data.initials,
      gradientC1:    data.gradientC1,
      gradientC2:    data.gradientC2,
      sortOrder:     data.sortOrder,
      bio:           data.bio,
      bioLong:       data.bioLong ?? null,
    }).where(eq(talents.id, id));

    revalidatePath('/admin/talents');
    revalidatePath(`/admin/talents/${id}`);
    revalidatePath('/talentos');
    if (slug) {
      revalidatePath(`/talentos/${slug}`);
      revalidatePath('/sitemap.xml');
    }
  } catch (err) {
    logRedacted('error', '[admin] updateTalentProfile error:', err);
    return { success: false, error: 'Error al guardar perfil' };
  }

  redirect(`/admin/talents/${id}`);
}

// ── upsertTalentSocialsAction ─────────────────────────────────────────────────

export type SocialEntryInput = {
  readonly id?:               number;
  readonly platform:          string;
  readonly handle:            string;
  readonly profileUrl?:       string;
  readonly followersDisplay?: string;
  readonly sortOrder?:        number;
};

export async function upsertTalentSocialsAction(
  talentId: number,
  entries: SocialEntryInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission('talentos', 'write');

    const talent = await db.query.talents.findFirst({ where: eq(talents.id, talentId) });
    if (!talent) return { ok: false, error: 'Talento no encontrado.' };

    if (entries.some((e) => !e.platform?.trim() || !e.handle?.trim())) {
      return { ok: false, error: 'Plataforma y handle son obligatorios en todas las redes.' };
    }

    const keptIds: number[] = [];

    for (const [i, entry] of entries.entries()) {
      const platform = entry.platform.trim().toLowerCase();
      const handle   = entry.handle.trim();
      const profileUrl = entry.profileUrl?.trim() || null;
      const followersDisplay = entry.followersDisplay?.trim() || '-';
      const hexColor = PLATFORM_COLORS[platform] ?? '#888888';
      const sortOrder = entry.sortOrder ?? i;

      if (entry.id) {
        await db.update(talentSocials)
          .set({ platform, handle, profileUrl, followersDisplay, hexColor, sortOrder })
          .where(eq(talentSocials.id, entry.id));
        keptIds.push(entry.id);
      } else {
        const [inserted] = await db.insert(talentSocials).values({
          talentId, platform, handle, profileUrl: profileUrl ?? undefined,
          followersDisplay, hexColor, sortOrder,
        }).returning({ id: talentSocials.id });
        if (inserted) keptIds.push(inserted.id);
      }
    }

    // Borrar redes eliminadas
    const existing = await db.select({ id: talentSocials.id }).from(talentSocials).where(eq(talentSocials.talentId, talentId));
    const toDelete = existing.map((s) => s.id).filter((sid) => !keptIds.includes(sid));
    if (toDelete.length > 0) {
      await db.delete(talentSocials).where(inArray(talentSocials.id, toDelete));
    }

    revalidatePath(`/admin/talents/${talentId}`);
    revalidatePath(`/talentos/${talent.slug}`);
    return { ok: true };
  } catch (err) {
    logRedacted('error', '[admin] upsertTalentSocials error:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Error al guardar redes.' };
  }
}

const AddTagSchema = z.object({
  talentId: IdSchema,
  tag: z.string().trim().min(1, 'Etiqueta requerida').max(100),
});

export async function addTalentTagAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('talentos', 'write');
  const parsed = AddTagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };

  const { talentId, tag } = parsed.data;
  const talent = await db.query.talents.findFirst({ where: eq(talents.id, talentId), columns: { slug: true } });
  if (!talent) return { success: false, error: 'Talento no encontrado.' };

  await db.insert(talentTags).values({ talentId, tag });

  revalidatePath(`/admin/talents/${talentId}/edit`);
  revalidatePath(`/admin/talents/${talentId}`);
  revalidatePath(`/talentos/${talent.slug}`);
  return { success: true };
}

const RemoveTagSchema = z.object({
  tagId: IdSchema,
  talentId: IdSchema,
});

export async function removeTalentTagAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('talentos', 'write');
  const parsed = RemoveTagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };

  const { tagId, talentId } = parsed.data;
  const talent = await db.query.talents.findFirst({ where: eq(talents.id, talentId), columns: { slug: true } });
  if (!talent) return { success: false, error: 'Talento no encontrado.' };

  await db.delete(talentTags).where(eq(talentTags.id, tagId));

  revalidatePath(`/admin/talents/${talentId}/edit`);
  revalidatePath(`/admin/talents/${talentId}`);
  revalidatePath(`/talentos/${talent.slug}`);
  return { success: true };
}
