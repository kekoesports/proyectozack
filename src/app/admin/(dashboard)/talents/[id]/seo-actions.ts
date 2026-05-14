'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { generateSeoBio } from '@/lib/ai/seoBioGenerator';
import { logRedacted } from '@/lib/log';

// ── generateSeoBioAction ──────────────────────────────────────────────────────

export async function generateSeoBioAction(
  talentId: number,
): Promise<{ ok: true; bio: string; seoTitle: string; seoDescription: string; seoKeywords: string[]; warnings: string[] } | { ok: false; error: string }> {
  try {
    await requirePermission('talentos', 'write');

    const talent = await db.query.talents.findFirst({
      where: eq(talents.id, talentId),
      with: { tags: true, socials: true },
    });
    if (!talent) return { ok: false, error: 'Talento no encontrado.' };

    const result = await generateSeoBio({
      name:             talent.name,
      role:             talent.role,
      role2:            talent.role2,
      game:             talent.game,
      platform:         talent.platform,
      bio:              talent.bio,
      bioLong:          talent.bioLong,
      tags:             talent.tags.map((t) => t.tag),
      socials:          talent.socials.map((s) => ({ platform: s.platform, followersDisplay: s.followersDisplay })),
      topGeos:          talent.topGeos as { country: string; pct: number }[] | null,
      audienceLanguage: talent.audienceLanguage,
      creatorCountry:   talent.creatorCountry,
      highlights:       talent.highlights,
    });

    if (!result.usedAi && result.bio === '') {
      return { ok: false, error: result.warnings[0] ?? 'Error al generar con IA.' };
    }

    // Save generated draft — does NOT overwrite seoBioManual
    await db.update(talents)
      .set({
        seoBioGenerated: result.bio,
        seoTitle:        result.seoTitle || undefined,
        seoDescription:  result.seoDescription || undefined,
        seoKeywords:     result.seoKeywords.length > 0 ? result.seoKeywords : undefined,
        seoBioStatus:    'generated',
      })
      .where(eq(talents.id, talentId));

    revalidatePath(`/talentos/${talent.slug}`);
    revalidatePath('/talentos');

    return {
      ok: true,
      bio:            result.bio,
      seoTitle:       result.seoTitle,
      seoDescription: result.seoDescription,
      seoKeywords:    result.seoKeywords,
      warnings:       result.warnings,
    };
  } catch (err) {
    logRedacted('error', '[generateSeoBioAction]', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

// ── saveSeoBioManualAction ────────────────────────────────────────────────────

const saveSchema = z.object({
  seoBioManual:   z.string().max(5000).optional(),
  seoTitle:       z.string().max(200).optional(),
  seoDescription: z.string().max(300).optional(),
  seoKeywords:    z.array(z.string().max(100)).max(20).optional(),
});

export async function saveSeoBioManualAction(
  talentId: number,
  data: z.infer<typeof saveSchema>,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  try {
    await requirePermission('talentos', 'write');

    const parsed = saveSchema.safeParse(data);
    if (!parsed.success) return { ok: false, error: 'Datos inválidos.' };

    const talent = await db.query.talents.findFirst({ where: eq(talents.id, talentId) });
    if (!talent) return { ok: false, error: 'Talento no encontrado.' };

    const manual = parsed.data.seoBioManual?.trim() ?? '';
    await db.update(talents)
      .set({
        seoBioManual:   manual || null,
        seoTitle:       parsed.data.seoTitle?.trim() || undefined,
        seoDescription: parsed.data.seoDescription?.trim() || undefined,
        seoKeywords:    parsed.data.seoKeywords,
        seoBioStatus:   manual ? 'edited' : talent.seoBioStatus,
      })
      .where(eq(talents.id, talentId));

    revalidatePath(`/talentos/${talent.slug}`);
    revalidatePath('/talentos');

    return { ok: true, slug: talent.slug };
  } catch (err) {
    logRedacted('error', '[saveSeoBioManualAction]', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

// ── approveSeoBioAction ───────────────────────────────────────────────────────

export async function approveSeoBioAction(
  talentId: number,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  try {
    await requirePermission('talentos', 'write');

    const talent = await db.query.talents.findFirst({ where: eq(talents.id, talentId) });
    if (!talent) return { ok: false, error: 'Talento no encontrado.' };
    if (talent.seoBioStatus === 'empty') return { ok: false, error: 'No hay bio que aprobar.' };

    await db.update(talents)
      .set({ seoBioStatus: 'approved' })
      .where(eq(talents.id, talentId));

    revalidatePath(`/talentos/${talent.slug}`);
    revalidatePath('/talentos');

    return { ok: true, slug: talent.slug };
  } catch (err) {
    logRedacted('error', '[approveSeoBioAction]', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}
