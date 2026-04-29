'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { talents, talentSocials, talentVerticals, talentBusiness } from '@/db/schema';
import { requireRole, requireAnyRole } from '@/lib/auth-guard';

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

const GRADIENT_PAIRS = [
  ['#f5632a', '#e03070'], ['#e03070', '#8b3aad'],
  ['#8b3aad', '#5b9bd5'], ['#5b9bd5', '#53fc18'],
  ['#c42880', '#f5632a'], ['#f5632a', '#8b3aad'],
] as const;

const PLATFORM_COLORS: Record<string, string> = {
  twitch:    '#9147ff',
  kick:      '#53fc18',
  youtube:   '#ff0000',
  instagram: '#e1306c',
  tiktok:    '#010101',
  x:         '#1da1f2',
  twitter:   '#1da1f2',
};

const PLATFORM_URL: Record<string, (h: string) => string> = {
  twitch:    (h) => `https://twitch.tv/${h}`,
  kick:      (h) => `https://kick.com/${h}`,
  youtube:   (h) => `https://youtube.com/@${h}`,
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok:    (h) => `https://tiktok.com/@${h}`,
  x:         (h) => `https://x.com/${h}`,
  twitter:   (h) => `https://x.com/${h}`,
};

// Plataformas válidas para talents.platform (enum DB)
const DB_PLATFORM_ENUM = ['twitch', 'youtube'] as const;

const VALID_VERTICALS = [
  'casino', 'cs2_cases', 'cs2_marketplace', 'cs2_skin_trading',
  'sports_betting', 'crypto', 'gaming_brands', 'fmcg', 'tech', 'otros',
] as const;
type ValidVertical = (typeof VALID_VERTICALS)[number];

export type CreateTalentResult = { success: boolean; error?: string };

export async function createTalentAction(_prev: CreateTalentResult, formData: FormData): Promise<CreateTalentResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');

  const name        = (formData.get('name') as string ?? '').trim();
  const mainPlatform = (formData.get('platform') as string ?? 'twitch').trim().toLowerCase();
  const handle      = (formData.get('handle') as string ?? '').trim().replace(/^@/, '');
  const country     = (formData.get('country') as string ?? '').trim().toUpperCase().slice(0, 2) || null;
  const game        = (formData.get('game') as string ?? '').trim() || null;
  const status      = (formData.get('status') as string ?? 'active') as 'active' | 'inactive';
  const visibility  = (formData.get('visibility') as string ?? 'internal') as 'public' | 'internal';
  const verticalsRaw = (formData.get('verticals') as string ?? '').split(',').map((v) => v.trim()).filter(Boolean);

  if (!name || !handle || !mainPlatform) {
    return { success: false, error: 'Nombre, plataforma y handle son obligatorios.' };
  }

  // El enum DB solo acepta twitch|youtube — usamos la primera que sea válida, o twitch por defecto
  const dbPlatform: 'twitch' | 'youtube' =
    DB_PLATFORM_ENUM.includes(mainPlatform as 'twitch' | 'youtube')
      ? (mainPlatform as 'twitch' | 'youtube')
      : 'twitch';

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  const init = initials(name);
  const [gradientC1, gradientC2] = GRADIENT_PAIRS[name.charCodeAt(0) % GRADIENT_PAIRS.length]!;

  try {
    const [talent] = await db.insert(talents).values({
      name,
      slug,
      role: game ?? 'Streamer',
      game: game ?? '',
      platform: dbPlatform,
      status,
      bio: '',
      gradientC1,
      gradientC2,
      initials: init || name.slice(0, 2).toUpperCase(),
      visibility,
      creatorCountry: country || undefined,
    }).returning({ id: talents.id });

    if (!talent) throw new Error('No se pudo crear el talento');

    // ── Social principal ──────────────────────────────────────────
    const socialInserts = [];
    const makeProfileUrl = PLATFORM_URL[mainPlatform] ?? ((h: string) => `https://${mainPlatform}.com/${h}`);
    socialInserts.push({
      talentId: talent.id,
      platform: mainPlatform,
      handle,
      followersDisplay: '0',
      profileUrl: makeProfileUrl(handle),
      hexColor: PLATFORM_COLORS[mainPlatform] ?? '#888',
      sortOrder: 0,
    });

    // ── Plataformas secundarias (platform_2, platform_3, platform_4) ──
    for (let i = 2; i <= 4; i++) {
      const secPlatform = (formData.get(`platform_${i}`) as string ?? '').trim().toLowerCase();
      const secHandle   = (formData.get(`handle_${i}`) as string ?? '').trim().replace(/^@/, '');
      if (secPlatform && secHandle) {
        const makeUrl = PLATFORM_URL[secPlatform] ?? ((h: string) => `https://${secPlatform}.com/${h}`);
        socialInserts.push({
          talentId: talent.id,
          platform: secPlatform,
          handle: secHandle,
          followersDisplay: '0',
          profileUrl: makeUrl(secHandle),
          hexColor: PLATFORM_COLORS[secPlatform] ?? '#888',
          sortOrder: i - 1,
        });
      }
    }

    if (socialInserts.length > 0) {
      await db.insert(talentSocials).values(socialInserts);
    }

    // ── Sectores / verticals ──────────────────────────────────────
    const validVerts = verticalsRaw.filter((v): v is ValidVertical =>
      VALID_VERTICALS.includes(v as ValidVertical)
    );
    if (validVerts.length > 0) {
      await db.insert(talentVerticals).values(
        validVerts.map((v) => ({ talentId: talent.id, vertical: v }))
      ).onConflictDoNothing();
    }

    // ── Contactos (hasta 2) → talent_business ────────────────────
    const contact1Type  = (formData.get('contact_1_type') as string ?? '').trim();
    const contact1Value = (formData.get('contact_1_value') as string ?? '').trim();
    const contact2Type  = (formData.get('contact_2_type') as string ?? '').trim();
    const contact2Value = (formData.get('contact_2_value') as string ?? '').trim();

    const businessValues: Record<string, string> = {};
    const addContact = (type: string, value: string): void => {
      if (!type || !value) return;
      if (type === 'telegram')  businessValues['telegram']     = value;
      if (type === 'discord')   businessValues['discord']      = value;
      if (type === 'whatsapp')  businessValues['whatsapp']     = value;
      if (type === 'email')     businessValues['contactEmail'] = value;
    };
    addContact(contact1Type, contact1Value);
    addContact(contact2Type, contact2Value);

    if (Object.keys(businessValues).length > 0) {
      await db.insert(talentBusiness).values({ talentId: talent.id, ...businessValues })
        .onConflictDoNothing();
    }

    revalidatePath('/admin/talents');
    return { success: true };
  } catch (e) {
    console.error('[createTalent]', e);
    return { success: false, error: 'Error al crear el talento. Intenta de nuevo.' };
  }
}

export async function deleteTalentAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');
  const id = Number(formData.get('id'));
  if (!id) return;
  await db.delete(talents).where(eq(talents.id, id));
  revalidatePath('/admin/talents');
  revalidatePath('/');
}

export async function updateTalentBioAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');
  const id = Number(formData.get('id'));
  const bio = String(formData.get('bio') ?? '');
  if (!id || !bio) return;
  await db.update(talents).set({ bio }).where(eq(talents.id, id));
  revalidatePath('/admin/talents');
  revalidatePath('/');
}

const STATUS_VALUES = ['active', 'available', 'inactive'] as const;
type TalentStatus = (typeof STATUS_VALUES)[number];

export async function setTalentStatusAction(talentId: number, status: TalentStatus): Promise<{ success: boolean; error?: string }> {
  await requireRole('admin', '/admin/login');
  if (!STATUS_VALUES.includes(status)) return { success: false, error: 'Estado inválido' };
  if (!talentId) return { success: false, error: 'ID inválido' };
  try {
    await db.update(talents).set({ status }).where(eq(talents.id, talentId));
    revalidatePath('/admin/talents');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('[admin] setTalentStatus error:', err);
    return { success: false, error: 'Error al actualizar estado' };
  }
}

type GeoEntry = { country: string; pct: number };

export async function updateSocialGeoAction(socialId: number, topGeos: readonly GeoEntry[]): Promise<{ success: boolean; error?: string }> {
  await requireRole('admin', '/admin/login');
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
    console.error('[admin] updateSocialGeo error:', err);
    return { success: false, error: 'Error al guardar geo' };
  }
}
