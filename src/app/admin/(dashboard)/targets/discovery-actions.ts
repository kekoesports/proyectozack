'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requirePermission } from '@/lib/permissions';
import { bulkUpsertTargets } from '@/lib/queries/targets';
import { getCreatorProviderReadiness } from '@/lib/queries/creatorProviderReadiness';
import type { CreateTargetInput } from '@/lib/schemas/target';
import { getKickChannel } from '@/lib/services/kick';
import { runCreatorTargetDiscovery } from '@/lib/services/creatorTargetDiscovery';
import {
  fetchTwitchFollowerCounts,
  searchTwitchChannels,
  type TwitchChannelPreview,
} from '@/lib/services/twitch';
import { qualifyTwitchCandidate, type CreatorFit } from '@/lib/targets/qualification';
import { scoreCreatorFit } from '@/lib/targets/creator-fit-score';

const twitchSearchSchema = z.object({
  query: z.string().trim().min(2).max(100),
  language: z.enum(['any', 'es', 'en', 'pt', 'de', 'fr']).default('any'),
  liveOnly: z.boolean().default(true),
  minimumFollowers: z.number().int().min(100).max(10_000_000).default(250),
});

export type TwitchDiscoveryCandidate = TwitchChannelPreview & CreatorFit;

export async function discoverTwitchTargetsAction(input: unknown): Promise<{
  readonly ok: boolean;
  readonly candidates: readonly TwitchDiscoveryCandidate[];
  readonly error: string | null;
}> {
  await requirePermission('targets', 'read');
  const parsed = twitchSearchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, candidates: [], error: 'Revisa los filtros de Twitch' };
  const gate = (await getCreatorProviderReadiness()).find((entry) => entry.platform === 'twitch');
  if (!gate?.ready) return { ok: false, candidates: [], error: gate?.message ?? 'Twitch no está configurado.' };

  try {
    const channels = await searchTwitchChannels(parsed.data.query, parsed.data.liveOnly);
    const followers = await fetchTwitchFollowerCounts(channels.map((channel) => channel.broadcasterId));
    const followerMap = new Map(followers.map((row) => [row.broadcasterId, row.followerCount]));
    const candidates = channels.map((channel) => {
      const followerCount = followerMap.get(channel.broadcasterId) ?? null;
      const fit = qualifyTwitchCandidate({
        followers: followerCount,
        viewers: channel.viewerCount,
        language: channel.language,
        requiredLanguage: parsed.data.language === 'any' ? null : parsed.data.language,
        game: channel.currentGame,
        isLive: channel.isLive,
        minimumFollowers: parsed.data.minimumFollowers,
      });
      return { ...channel, followerCount, ...fit };
    }).sort((left, right) => Number(right.isQualified) - Number(left.isQualified) || right.score - left.score);
    return { ok: true, candidates, error: null };
  } catch (error) {
    return { ok: false, candidates: [], error: safePlatformError(error, 'Twitch') };
  }
}

const twitchImportSchema = z.array(z.object({
  broadcasterId: z.string().min(1).max(50),
  login: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  followerCount: z.number().int().nonnegative().nullable(),
  viewerCount: z.number().int().nonnegative().nullable(),
  language: z.string().max(10),
  currentGame: z.string().max(200),
  thumbnailUrl: z.url().nullable(),
  score: z.number().int().min(60).max(100),
  reasons: z.array(z.string().max(300)).max(20),
  isLive: z.boolean().nullable(),
  isQualified: z.literal(true),
})).min(1).max(20);

export async function importTwitchTargetsAction(input: unknown): Promise<{
  readonly inserted: number;
  readonly updated: number;
  readonly error: string | null;
}> {
  await requirePermission('targets', 'write');
  const parsed = twitchImportSchema.safeParse(input);
  if (!parsed.success) return { inserted: 0, updated: 0, error: 'Los candidatos seleccionados no son válidos' };
  const gate = (await getCreatorProviderReadiness()).find((entry) => entry.platform === 'twitch');
  if (!gate?.ready) return { inserted: 0, updated: 0, error: gate?.message ?? 'Twitch no está configurado.' };

  const now = new Date();
  const rows: CreateTargetInput[] = parsed.data.map((channel) => ({
    username: channel.login.toLowerCase(),
    fullName: channel.displayName,
    platform: 'twitch',
    profileUrl: `https://www.twitch.tv/${channel.login}`,
    profilePicUrl: channel.thumbnailUrl ?? undefined,
    followers: channel.followerCount ?? undefined,
    defaultLanguage: channel.language || undefined,
    qualificationStatus: 'review',
    fitScore: channel.score,
    fitReasons: channel.reasons,
    sourceQuery: channel.currentGame || 'Twitch',
    lastActivityAt: channel.isLive ? now : undefined,
    lastDiscoveredAt: now,
    complianceActivity: 'marketplace',
    complianceStatus: 'manual-review',
    contactUrl: `https://www.twitch.tv/${channel.login}/about`,
    discoveredVia: 'crm:twitch-search',
    enrichedAt: now,
  }));
  const result = await bulkUpsertTargets(rows);
  revalidatePath('/admin/targets');
  return { inserted: result.inserted, updated: result.updated, error: null };
}

export type DirectProfilePreview = {
  readonly platform: 'kick';
  readonly username: string;
  readonly fullName: string;
  readonly profileUrl: string;
  readonly profilePicUrl: string | null;
  readonly followers: number | null;
  readonly bio: string | null;
  readonly country: string | null;
  readonly lastActivityAt: string | null;
  readonly categories: readonly string[];
};

export async function lookupKickProfileAction(slugInput: unknown): Promise<{
  readonly profile: DirectProfilePreview | null;
  readonly error: string | null;
}> {
  await requirePermission('targets', 'read');
  const parsed = z.string().trim().regex(/^[a-zA-Z0-9_]{2,100}$/).safeParse(slugInput);
  if (!parsed.success) return { profile: null, error: 'Escribe un usuario de Kick válido' };
  const gate = (await getCreatorProviderReadiness()).find((entry) => entry.platform === 'kick');
  if (!gate?.ready) return { profile: null, error: gate?.message ?? 'Kick no está configurado.' };

  try {
    const channel = await getKickChannel(parsed.data.toLowerCase());
    if (!channel) return { profile: null, error: 'No se encontró ese canal en Kick' };
    return {
      profile: {
        platform: 'kick',
        username: channel.slug,
        fullName: channel.username,
        profileUrl: `https://kick.com/${channel.slug}`,
        profilePicUrl: channel.profilePicUrl,
        followers: channel.followers,
        bio: channel.bio,
        country: channel.country,
        lastActivityAt: channel.lastLivestreamAt?.toISOString() ?? null,
        categories: channel.currentCategory ? [channel.currentCategory] : [],
      },
      error: null,
    };
  } catch (error) {
    return { profile: null, error: safePlatformError(error, 'Kick') };
  }
}

export async function importKickProfileAction(slugInput: unknown): Promise<{
  readonly inserted: number;
  readonly updated: number;
  readonly error: string | null;
}> {
  await requirePermission('targets', 'write');
  const lookup = await lookupKickProfileAction(slugInput);
  if (!lookup.profile) return { inserted: 0, updated: 0, error: lookup.error };

  const profile = lookup.profile;
  const cs2 = profile.categories.some((category) => /counter[- ]?strike|\bcs2\b/i.test(category));
  const activeAt = profile.lastActivityAt ? new Date(profile.lastActivityAt) : undefined;
  const fit = scoreCreatorFit({ contentMatch: cs2 ? true : null, audience: null, targetAudience: 1000,
    activityConfirmed: activeAt ? true : null, growthPercent: null, marketMatch: null,
    professionalContact: null, brandReviewedMatch: null });
  const result = await bulkUpsertTargets([{
    username: profile.username,
    fullName: profile.fullName,
    platform: 'kick',
    profileUrl: profile.profileUrl,
    profilePicUrl: profile.profilePicUrl ?? undefined,
    followers: profile.followers ?? undefined,
    bio: profile.bio ?? undefined,
    qualificationStatus: 'review',
    fitScore: fit.score,
    fitReasons: [
      ...fit.reasons,
      profile.followers === null ? 'Seguidores no disponibles en la API oficial' : `${profile.followers.toLocaleString('es-ES')} seguidores`,
      cs2 ? 'CS2 es su categoría actual observada; no constituye un histórico' : 'CS2 no confirmado',
      'Revisar país y encaje legal antes de contactar',
    ],
    sourceQuery: profile.username,
    lastActivityAt: activeAt,
    lastDiscoveredAt: new Date(),
    complianceActivity: 'marketplace',
    complianceStatus: 'manual-review',
    contactUrl: profile.profileUrl,
    discoveredVia: 'crm:kick-profile',
    enrichedAt: new Date(),
  }]);
  revalidatePath('/admin/targets');
  return { inserted: result.inserted, updated: result.updated, error: null };
}

const instagramInputSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9._]{1,30}$/),
  fullName: z.string().trim().max(300).optional(),
  followers: z.number().int().nonnegative(),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
  contactEmail: z.email().max(320).optional(),
  notes: z.string().trim().max(1_000).optional(),
});

export async function importInstagramProfileAction(input: unknown): Promise<{
  readonly inserted: number;
  readonly updated: number;
  readonly error: string | null;
}> {
  await requirePermission('targets', 'write');
  const parsed = instagramInputSchema.safeParse(input);
  if (!parsed.success) return { inserted: 0, updated: 0, error: 'Revisa el usuario y los datos del perfil' };

  const profileUrl = `https://www.instagram.com/${parsed.data.username}/`;
  const result = await bulkUpsertTargets([{
    username: parsed.data.username.toLowerCase(),
    fullName: parsed.data.fullName,
    platform: 'instagram',
    profileUrl,
    followers: parsed.data.followers,
    countryCode: parsed.data.countryCode,
    contactEmail: parsed.data.contactEmail,
    notes: parsed.data.notes,
    qualificationStatus: 'review',
    fitScore: parsed.data.followers >= 5_000 ? 40 : parsed.data.followers >= 1_000 ? 25 : 10,
    fitReasons: [
      `${parsed.data.followers.toLocaleString('es-ES')} seguidores declarados`,
      'Actividad y temática pendientes de verificación',
    ],
    sourceQuery: parsed.data.username,
    lastDiscoveredAt: new Date(),
    complianceActivity: 'marketplace',
    complianceStatus: 'manual-review',
    contactUrl: profileUrl,
    discoveredVia: 'crm:instagram-manual',
  }]);
  revalidatePath('/admin/targets');
  return { inserted: result.inserted, updated: result.updated, error: null };
}

export async function runCreatorDiscoveryNowAction(): Promise<Awaited<ReturnType<typeof runCreatorTargetDiscovery>>> {
  await requirePermission('targets', 'write');
  const result = await runCreatorTargetDiscovery('manual');
  revalidatePath('/admin/targets');
  return result;
}

function safePlatformError(error: unknown, platform: string): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('CLIENT_ID') || message.includes('CLIENT_SECRET')) {
    return `${platform} necesita renovar sus credenciales del servidor`;
  }
  if (message.includes('403')) return `${platform} ha rechazado la consulta o agotado la cuota`;
  return `No se pudo consultar ${platform}`;
}
