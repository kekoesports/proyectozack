'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { talents, talentSocials } from '@/db/schema';
import { generateSeoBio } from '@/lib/ai/seoBioGenerator';
import { getCodesByTalent } from '@/lib/queries/creatorCodes';
import { getActiveGiveaways } from '@/lib/queries/giveaways';
import { listCampaigns } from '@/lib/queries/campaigns';
import { logRedacted } from '@/lib/log';

// ── Contexto que el generador IA usará — visible en el panel CRM ──────────────

export type SeoGenerationContext = {
  socials: Array<{
    platform: string;
    followersDisplay: string;
    synced: boolean;
    lastSyncAt: string | null;
  }>;
  activeBrands: string[];
  activeGiveaways: number;
  campaignCount: number;
  missingFields: string[];
  twitchSynced: boolean;
  youtubeSynced: boolean;
  lastStatsUpdateAt: string | null;
};

/** Build context for the AI generator and the CRM "Datos usados" panel. */
async function buildSeoContext(talentId: number, talent: { socials?: typeof talentSocials.$inferSelect[]; name: string; platform: string; lastStatsUpdateAt: Date | null }): Promise<SeoGenerationContext> {
  const [codes, activeGiveaways, campaigns] = await Promise.all([
    getCodesByTalent(talentId),
    getActiveGiveaways(talentId),
    listCampaigns({ filters: { talentId } }),
  ]);

  // Per-platform sync status — a platform is "synced" if it has a platformId (API-resolved)
  const socialsData = await db.select({
    platform: talentSocials.platform,
    followersDisplay: talentSocials.followersDisplay,
    platformId: talentSocials.platformId,
  }).from(talentSocials).where(eq(talentSocials.talentId, talentId));

  const socials = socialsData.map(s => ({
    platform:         s.platform,
    followersDisplay: s.followersDisplay,
    synced:           !!s.platformId,
    lastSyncAt:       talent.lastStatsUpdateAt ? talent.lastStatsUpdateAt.toISOString().slice(0, 10) : null,
  }));

  const twitchRow = socials.find(s => s.platform === 'twitch');
  const youtubeRow = socials.find(s => s.platform === 'youtube');

  // Unique brand names from active codes
  const activeBrands = [...new Set(codes.map(c => c.brandName).filter(Boolean))];

  // Missing important fields
  const missingFields: string[] = [];
  if (!talent.lastStatsUpdateAt) missingFields.push('Métricas nunca sincronizadas');
  if (!twitchRow?.synced) missingFields.push('Twitch sin platformId (no sincronizado)');
  if (!youtubeRow?.synced) missingFields.push('YouTube sin platformId');
  if (socials.every(s => !s.followersDisplay || ['-', '—'].includes(s.followersDisplay))) {
    missingFields.push('Sin métricas de seguidores');
  }

  return {
    socials,
    activeBrands,
    activeGiveaways: activeGiveaways.length,
    campaignCount:   campaigns.length,
    missingFields,
    twitchSynced:    !!twitchRow?.synced,
    youtubeSynced:   !!youtubeRow?.synced,
    lastStatsUpdateAt: talent.lastStatsUpdateAt ? talent.lastStatsUpdateAt.toISOString().slice(0, 10) : null,
  };
}

// ── generateSeoBioAction ──────────────────────────────────────────────────────

export async function generateSeoBioAction(
  talentId: number,
): Promise<{ ok: true; bio: string; seoTitle: string; seoDescription: string; seoKeywords: string[]; warnings: string[]; context: SeoGenerationContext } | { ok: false; error: string }> {
  try {
    await requirePermission('talentos', 'write');

    const talent = await db.query.talents.findFirst({
      where: eq(talents.id, talentId),
      with: { tags: true, socials: true },
    });
    if (!talent) return { ok: false, error: 'Talento no encontrado.' };

    const context = await buildSeoContext(talentId, talent);

    const result = await generateSeoBio({
      name:             talent.name,
      role:             talent.role,
      role2:            talent.role2,
      game:             talent.game,
      platform:         talent.platform,
      bio:              talent.bio,
      bioLong:          talent.bioLong,
      tags:             talent.tags.map((t) => t.tag),
      socials:          context.socials,
      topGeos:          talent.topGeos as { country: string; pct: number }[] | null,
      audienceLanguage: talent.audienceLanguage,
      creatorCountry:   talent.creatorCountry,
      highlights:       talent.highlights,
      activeBrands:     context.activeBrands,
      activeGiveaways:  context.activeGiveaways,
      campaignCount:    context.campaignCount,
      seoBioManual:     talent.seoBioManual,
    });

    if (!result.usedAi && result.bio === '') {
      return { ok: false, error: result.warnings[0] ?? 'Error al generar con IA.' };
    }

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
      context,
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

    await db.update(talents).set({ seoBioStatus: 'approved' }).where(eq(talents.id, talentId));
    revalidatePath(`/talentos/${talent.slug}`);
    revalidatePath('/talentos');
    return { ok: true, slug: talent.slug };
  } catch (err) {
    logRedacted('error', '[approveSeoBioAction]', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

// ── getSeoGenerationContext (para precargar en la página) ─────────────────────

export async function getSeoGenerationContext(talentId: number): Promise<SeoGenerationContext | null> {
  try {
    await requirePermission('talentos', 'read');
    const talent = await db.query.talents.findFirst({ where: eq(talents.id, talentId) });
    if (!talent) return null;
    return buildSeoContext(talentId, talent);
  } catch {
    return null;
  }
}
