'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { talents, talentSocials } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { initialsOf, slugify } from '@/lib/utils/import-utils';

type ActionState = { readonly success: boolean; readonly error?: string };

/**
 * Crea un nuevo talent con plataforma principal y opcionalmente plataformas secundarias y contactos.
 */
export async function createTalentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const name    = (formData.get('name')     as string | null)?.trim() ?? '';
  const platform = (formData.get('platform') as string | null)?.trim() ?? 'twitch';
  const handle  = (formData.get('handle')   as string | null)?.trim() ?? '';
  const country = (formData.get('country')  as string | null)?.toUpperCase().slice(0, 2) ?? undefined;
  const status  = (formData.get('status')   as 'active' | 'inactive' | null) ?? 'inactive';
  const visibility = (formData.get('visibility') as 'internal' | 'public' | null) ?? 'internal';

  if (!name || !handle) {
    return { success: false, error: 'Nombre y handle son obligatorios' };
  }

  const slug = slugify(name);

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
        game: (formData.get('game') as string | null)?.trim() || 'General',
        platform: platform === 'twitch' || platform === 'youtube' ? platform : 'twitch',
        status,
        bio: '',
        gradientC1: '#f5632a',
        gradientC2: '#8b3aad',
        initials: initialsOf(name),
        sortOrder: nextSort,
        visibility,
        creatorCountry: country || undefined,
      })
      .returning({ id: talents.id });

    if (!inserted) throw new Error('Insert failed');

    const PLATFORM_COLORS: Record<string, string> = {
      twitch: '#9147ff', youtube: '#ff0000', instagram: '#e1306c',
      tiktok: '#010101', kick: '#53fc18', x: '#1da1f2', twitter: '#1da1f2',
    };
    const hexColor = PLATFORM_COLORS[platform] ?? '#888888';

    await db.insert(talentSocials).values({
      talentId: inserted.id,
      platform,
      handle,
      followersDisplay: '-',
      hexColor,
      sortOrder: 1,
    });

    // Secondary platforms
    for (let i = 2; i <= 4; i++) {
      const p = (formData.get(`platform_${i}`) as string | null)?.trim();
      const h = (formData.get(`handle_${i}`)   as string | null)?.trim();
      if (p && h) {
        await db.insert(talentSocials).values({
          talentId: inserted.id,
          platform: p,
          handle: h,
          followersDisplay: '-',
          hexColor: PLATFORM_COLORS[p] ?? '#888888',
          sortOrder: i,
        });
      }
    }

    revalidatePath('/admin/talents');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, error: `Error al crear talent: ${msg}` };
  }
}
