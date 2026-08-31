import type { CreatorDiscoveryPlatformResult } from '@/db/schema/creatorDiscoveryRuns';
import { bulkUpsertTargets } from '@/lib/queries/targets';
import {
  finishCreatorDiscoveryRun,
  startCreatorDiscoveryRun,
} from '@/lib/queries/creatorDiscoveryRuns';
import type { CreateTargetInput } from '@/lib/schemas/target';
import {
  fetchTwitchFollowerCounts,
  fetchTwitchUserPhotos,
  getCS2LiveStreams,
} from '@/lib/services/twitch';
import {
  getChannelRecentPerformance,
  searchYouTubeChannels,
  type YouTubeChannelPreview,
} from '@/lib/services/youtube';
import { qualifyYouTubeChannel } from '@/lib/services/youtubeQualification';
import { qualifyTwitchCandidate } from '@/lib/targets/qualification';
import { createLimit } from '@/lib/utils/concurrencyLimit';

const YOUTUBE_DAILY_QUERIES = [
  'Counter-Strike 2 gameplay',
  'CS2 highlights',
  'CS2 esports',
] as const;

export type CreatorDiscoverySummary = {
  readonly runId: number;
  readonly status: 'success' | 'partial' | 'failed';
  readonly found: number;
  readonly qualified: number;
  readonly inserted: number;
  readonly updated: number;
  readonly platformResults: readonly CreatorDiscoveryPlatformResult[];
};

export async function runCreatorTargetDiscovery(
  trigger: 'manual' | 'scheduled',
): Promise<CreatorDiscoverySummary> {
  const runId = await startCreatorDiscoveryRun(trigger);
  const platformResults = await Promise.all([
    discoverYouTubeTargets(),
    discoverTwitchTargets(),
  ]);
  await finishCreatorDiscoveryRun(runId, platformResults);

  const failures = platformResults.filter((result) => result.error !== null).length;
  return {
    runId,
    status: failures === 0 ? 'success' : failures === platformResults.length ? 'failed' : 'partial',
    found: sum(platformResults, 'found'),
    qualified: sum(platformResults, 'qualified'),
    inserted: sum(platformResults, 'inserted'),
    updated: sum(platformResults, 'updated'),
    platformResults,
  };
}

async function discoverYouTubeTargets(): Promise<CreatorDiscoveryPlatformResult> {
  try {
    const channels = new Map<string, { channel: YouTubeChannelPreview; query: string }>();
    for (const query of YOUTUBE_DAILY_QUERIES) {
      const results = await searchYouTubeChannels(query, 12, undefined, undefined);
      for (const channel of results) {
        if (!channels.has(channel.channelId)) channels.set(channel.channelId, { channel, query });
      }
    }

    const candidates = [...channels.values()].slice(0, 30);
    const limit = createLimit(4);
    const audited = await Promise.allSettled(candidates.map(({ channel, query }) => limit(async () => ({
      query,
      qualification: qualifyYouTubeChannel(
        channel,
        await getChannelRecentPerformance(channel.channelId, 90),
        'GLOBAL',
        'any',
        'marketplace',
        8,
        1_000,
      ),
    }))));
    const qualified = audited
      .filter((result): result is PromiseFulfilledResult<{
        query: string;
        qualification: ReturnType<typeof qualifyYouTubeChannel>;
      }> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter(({ qualification }) => qualification.isQualified);

    const rows: CreateTargetInput[] = qualified.map(({ query, qualification }) => ({
      username: qualification.channelId,
      fullName: qualification.title,
      platform: 'youtube',
      profileUrl: qualification.handle
        ? `https://www.youtube.com/@${qualification.handle}`
        : `https://www.youtube.com/channel/${qualification.channelId}`,
      profilePicUrl: qualification.thumbnailUrl ?? undefined,
      followers: qualification.subscriberCount,
      bio: qualification.description || undefined,
      countryCode: qualification.country ?? undefined,
      defaultLanguage: qualification.defaultLanguage ?? undefined,
      lastVideoAt: qualification.lastVideoAt ?? undefined,
      recentVideoCount: qualification.videoCount,
      minRecentVideoViews: qualification.minViews,
      avgRecentVideoViews: qualification.avgViews,
      recentVideosWindowDays: qualification.windowDays,
      qualificationUpdatedAt: new Date(),
      qualificationStatus: 'qualified',
      fitScore: 100,
      fitReasons: [
        `${qualification.videoCount} vídeos en ${qualification.windowDays} días`,
        `Mínimo ${qualification.minViews.toLocaleString('es-ES')} vistas por vídeo`,
        qualification.complianceExplanation,
      ],
      sourceQuery: query,
      lastActivityAt: qualification.lastVideoAt ?? undefined,
      lastDiscoveredAt: new Date(),
      complianceActivity: 'marketplace',
      complianceStatus: qualification.complianceStatus,
      complianceSourceUrl: qualification.complianceSourceUrl ?? undefined,
      complianceCheckedAt: new Date(qualification.complianceCheckedAt),
      contactUrl: `https://www.youtube.com/channel/${qualification.channelId}/about`,
      discoveredVia: `daily:youtube:${query}`,
    }));
    const result = await bulkUpsertTargets(rows);
    return {
      platform: 'youtube',
      found: candidates.length,
      qualified: qualified.length,
      inserted: result.inserted,
      updated: result.updated,
      error: null,
    };
  } catch (error) {
    return failed('youtube', error);
  }
}

async function discoverTwitchTargets(): Promise<CreatorDiscoveryPlatformResult> {
  try {
    const live = (await getCS2LiveStreams(60)).slice(0, 60);
    const [followers, photos] = await Promise.all([
      fetchTwitchFollowerCounts(live.map((channel) => channel.broadcasterId)),
      fetchTwitchUserPhotos(live.map((channel) => channel.broadcasterId)),
    ]);
    const followerMap = new Map(followers.map((row) => [row.broadcasterId, row.followerCount]));
    const photoMap = new Map(photos.map((row) => [row.userId, row.profileImageUrl]));
    const now = new Date();
    const qualified = live.map((channel) => {
      const followerCount = followerMap.get(channel.broadcasterId) ?? 0;
      return {
        channel,
        followerCount,
        fit: qualifyTwitchCandidate({
          followers: followerCount,
          viewers: channel.viewerCount,
          language: channel.language,
          requiredLanguage: null,
          game: channel.currentGame,
          isLive: channel.isLive,
          minimumFollowers: 1_000,
        }),
      };
    }).filter(({ fit }) => fit.isQualified);

    const rows: CreateTargetInput[] = qualified.map(({ channel, followerCount, fit }) => ({
      username: channel.login.toLowerCase(),
      fullName: channel.displayName,
      platform: 'twitch',
      profileUrl: `https://www.twitch.tv/${channel.login}`,
      profilePicUrl: photoMap.get(channel.broadcasterId),
      followers: followerCount,
      defaultLanguage: channel.language || undefined,
      qualificationStatus: fit.status,
      fitScore: fit.score,
      fitReasons: [...fit.reasons],
      sourceQuery: 'Counter-Strike 2 live',
      lastActivityAt: now,
      lastDiscoveredAt: now,
      complianceActivity: 'marketplace',
      complianceStatus: 'manual-review',
      contactUrl: `https://www.twitch.tv/${channel.login}/about`,
      discoveredVia: 'daily:twitch:cs2-live',
      enrichedAt: now,
    }));
    const result = await bulkUpsertTargets(rows);
    return {
      platform: 'twitch',
      found: live.length,
      qualified: qualified.length,
      inserted: result.inserted,
      updated: result.updated,
      error: null,
    };
  } catch (error) {
    return failed('twitch', error);
  }
}

function failed(
  platform: CreatorDiscoveryPlatformResult['platform'],
  error: unknown,
): CreatorDiscoveryPlatformResult {
  const message = error instanceof Error ? error.message : '';
  const safe = message.includes('YOUTUBE_API_KEY') || message.includes('TWITCH_CLIENT')
    ? 'Credenciales de plataforma no disponibles'
    : message.includes('403')
      ? 'La plataforma rechazó la consulta o agotó su cuota'
      : 'No se pudo completar la consulta de esta plataforma';
  return { platform, found: 0, qualified: 0, inserted: 0, updated: 0, error: safe };
}

function sum(
  rows: readonly CreatorDiscoveryPlatformResult[],
  key: 'found' | 'qualified' | 'inserted' | 'updated',
): number {
  return rows.reduce((total, row) => total + row[key], 0);
}
