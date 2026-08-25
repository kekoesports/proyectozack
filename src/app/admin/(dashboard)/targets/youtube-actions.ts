'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requirePermission } from '@/lib/permissions';
import { bulkUpsertTargets } from '@/lib/queries/targets';
import { getChannelRecentPerformance, searchYouTubeChannels } from '@/lib/services/youtube';
import {
  qualifyYouTubeChannel,
  type YouTubeQualification,
} from '@/lib/services/youtubeQualification';
import {
  CS2_CAMPAIGN_TYPES,
  CS2_SEARCH_MARKETS,
  TARGET_LANGUAGES,
  type Cs2CampaignType,
  type Cs2SearchMarket,
  type TargetLanguage,
} from '@/lib/compliance/cs2Markets';
import { createLimit } from '@/lib/utils/concurrencyLimit';
import type { CreateTargetInput } from '@/lib/schemas/target';

const searchSchema = z.object({
  query: z.string().trim().min(2).max(120),
  market: z.enum(CS2_SEARCH_MARKETS),
  language: z.enum(TARGET_LANGUAGES).default('any'),
  campaignType: z.enum(CS2_CAMPAIGN_TYPES).default('marketplace'),
  windowDays: z.union([z.literal(60), z.literal(90)]).default(90),
  minimumVideos: z.number().int().min(1).max(30).default(8),
  minimumViews: z.number().int().min(0).max(10_000_000).default(1_000),
  limit: z.number().int().min(1).max(25).default(15),
});

export type YouTubeDiscoveryParams = z.input<typeof searchSchema>;
export type YouTubeDiscoveryResult = {
  readonly ok: boolean;
  readonly candidates: readonly YouTubeQualification[];
  readonly error: string | null;
};

function safeError(error: unknown): string {
  if (!(error instanceof Error)) return 'No se pudo consultar YouTube';
  if (error.message === 'YOUTUBE_API_KEY is not set') return 'Falta configurar YouTube en el servidor';
  if (error.message.includes('(403)')) return 'YouTube ha rechazado la consulta o agotado la cuota diaria';
  return 'No se pudo completar la búsqueda en YouTube';
}

export async function discoverYouTubeTargetsAction(
  input: YouTubeDiscoveryParams,
): Promise<YouTubeDiscoveryResult> {
  await requirePermission('targets', 'read');
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, candidates: [], error: 'Revisa los filtros de búsqueda' };

  try {
    const params = parsed.data;
    const fetchLimit = Math.min(Math.max(params.limit * 2, 25), 50);
    const channels = await searchYouTubeChannels(
      params.query,
      fetchLimit,
      params.market === 'GLOBAL' ? undefined : params.market,
      params.language === 'any' ? undefined : params.language,
    );
    const limit = createLimit(4);
    const audited = await Promise.allSettled(
      channels.map((channel) => limit(async () => {
        const performance = await getChannelRecentPerformance(channel.channelId, params.windowDays);
        return qualifyYouTubeChannel(
          channel,
          performance,
          params.market,
          params.language,
          params.campaignType,
          params.minimumVideos,
          params.minimumViews,
        );
      })),
    );

    const candidates = audited
      .filter((item): item is PromiseFulfilledResult<YouTubeQualification> => item.status === 'fulfilled')
      .map((item) => item.value)
      .sort((a, b) => Number(b.isQualified) - Number(a.isQualified) || b.avgViews - a.avgViews)
      .slice(0, params.limit);

    return { ok: true, candidates, error: null };
  } catch (error) {
    return { ok: false, candidates: [], error: safeError(error) };
  }
}

const importSchema = z.array(z.object({
  channelId: z.string().min(1),
  handle: z.string().nullable(),
  title: z.string().min(1),
  description: z.string(),
  thumbnailUrl: z.url().nullable(),
  subscriberCount: z.number().int().nonnegative(),
  country: z.string().length(2),
  defaultLanguage: z.string().nullable(),
  windowDays: z.union([z.literal(60), z.literal(90)]),
  videoCount: z.number().int().min(8),
  minViews: z.number().int().min(1_000),
  avgViews: z.number().int().nonnegative(),
  lastVideoAt: z.coerce.date().nullable(),
  languageMatches: z.literal(true),
  isQualified: z.literal(true),
  complianceStatus: z.enum(['marketplace-scope-only', 'operator-check-required']),
  complianceSourceUrl: z.url().nullable(),
  complianceCheckedAt: z.string().date(),
  campaignType: z.enum(CS2_CAMPAIGN_TYPES),
})).min(1).max(25);

export async function importQualifiedYouTubeTargetsAction(
  input: unknown,
): Promise<{ imported: number; updated: number; error: string | null }> {
  await requirePermission('targets', 'write');
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { imported: 0, updated: 0, error: 'Solo se importan canales que cumplen todos los criterios' };

  const batchId = `youtube-${randomUUID().slice(0, 8)}`;
  const rows: CreateTargetInput[] = parsed.data.map((channel) => ({
    username: channel.channelId,
    fullName: channel.title,
    platform: 'youtube',
    profileUrl: channel.handle
      ? `https://www.youtube.com/@${channel.handle}`
      : `https://www.youtube.com/channel/${channel.channelId}`,
    profilePicUrl: channel.thumbnailUrl ?? undefined,
    followers: channel.subscriberCount,
    bio: channel.description || undefined,
    countryCode: channel.country,
    defaultLanguage: channel.defaultLanguage ?? undefined,
    lastVideoAt: channel.lastVideoAt ?? undefined,
    recentVideoCount: channel.videoCount,
    minRecentVideoViews: channel.minViews,
    avgRecentVideoViews: channel.avgViews,
    recentVideosWindowDays: channel.windowDays,
    qualificationUpdatedAt: new Date(),
    complianceActivity: channel.campaignType,
    complianceStatus: channel.complianceStatus,
    complianceSourceUrl: channel.complianceSourceUrl ?? undefined,
    complianceCheckedAt: new Date(channel.complianceCheckedAt),
    contactUrl: `https://www.youtube.com/channel/${channel.channelId}/about`,
    discoveredVia: `youtube_search:${channel.campaignType}:${batchId}`,
  }));
  const result = await bulkUpsertTargets(rows);
  revalidatePath('/admin/targets');
  return { imported: result.inserted, updated: result.updated, error: null };
}

export type { Cs2CampaignType, Cs2SearchMarket, TargetLanguage, YouTubeQualification };
