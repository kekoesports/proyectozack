import { z } from 'zod';
import { env } from '@/lib/env';
import { AvailableYouTubeChannelStatistics, readYouTubeCount } from '@/lib/schemas/youtube-metrics';
import { readProviderJson } from './provider-http';
import type { ProviderWarning } from '@/lib/schemas/provider-availability';
export { getChannelAvgViews, getChannelRecentContent, getChannelRecentPerformance, getChannelRecentPerformanceReport } from './youtube-content';
export type { YouTubeAvgViewsResult, YouTubeContentPerformance, YouTubeRecentPerformance } from './youtube-content';
export type { YouTubeRecentPerformanceReport } from './youtube-content';
export { searchYouTubeChannelsFromRecentVideosReport } from './youtube-discovery';
export type { YouTubeDiscoveryReport } from './youtube-discovery';

function requireYoutubeKey(): string {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');
  return apiKey;
}

type YouTubeChannelStats = {
  channelId: string;
  subscriberCount: number;
};

const YouTubeChannelsStatsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        statistics: z.object({
          subscriberCount: z.string().optional(),
          hiddenSubscriberCount: z.boolean().optional(),
          viewCount: z.string().optional(),
          videoCount: z.string().optional(),
        }),
      }),
    )
    .optional(),
});

const YouTubeSearchSchema = z.object({
  items: z.array(z.object({ id: z.object({ channelId: z.string() }) })).optional(),
});

const YouTubeVideoSearchSchema = z.object({
  items: z
    .array(z.object({ snippet: z.object({ channelId: z.string() }) }))
    .optional(),
});

const YouTubeChannelsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          title: z.string(),
          description: z.string(),
          customUrl: z.string().optional(),
          defaultLanguage: z.string().optional(),
          country: z.string().optional(),
          thumbnails: z
            .object({
              medium: z.object({ url: z.string() }).optional(),
              default: z.object({ url: z.string() }).optional(),
            })
            .optional(),
        }),
        statistics: z.unknown().optional(),
      }),
    )
    .optional(),
});

const YouTubeSnippetSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          defaultLanguage: z.string().optional(),
          country: z.string().optional(),
        }),
      }),
    )
    .optional(),
});

export type YouTubeChannelSnippet = {
  readonly channelId: string;
  readonly defaultLanguage: string | null;
  readonly country: string | null;
}

export type YouTubeChannelPreview = {
  readonly channelId: string;
  readonly handle: string | null;
  readonly title: string;
  readonly description: string;
  readonly thumbnailUrl: string | null;
  readonly subscriberCount: number | null;
  readonly country: string | null;
  readonly defaultLanguage: string | null;
  readonly videoCount: number | null;
  readonly viewCount: number | null;
  readonly warnings?: readonly ProviderWarning[];
}

// ── Live detection ──────────────────────────────────────────────────────

const YouTubeLiveVideosSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    snippet: z.object({
      channelId: z.string(),
      title: z.string(),
      liveBroadcastContent: z.enum(['live', 'upcoming', 'none']),
      thumbnails: z.object({
        medium: z.object({ url: z.string() }).optional(),
        high:   z.object({ url: z.string() }).optional(),
      }).optional(),
    }),
  })).optional(),
});

export type YouTubeLiveResult = {
  channelId:    string;
  videoId:      string;
  title:        string;
  thumbnailUrl: string;
};

function parseFeedVideoIds(xml: string): string[] {
  return [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)]
    .map((match) => match[1]?.trim())
    .filter((videoId): videoId is string => Boolean(videoId));
}

/**
 * Detect which YouTube channels are currently live, and return their video IDs for embedding.
 *
 * No usa search.list: su cupo diario es muy pequeño para monitorizar un roster.
 * Lee el feed público de cada canal (sin cuota API) y confirma los vídeos
 * recientes en lotes con videos.list (1 unidad por lote de hasta 50 vídeos).
 *
 * IMPORTANT: if ANY API call fails the caller must NOT update the DB to avoid
 * false "offline" marks. Throw on error; caller catches and skips.
 */
export async function fetchYouTubeLive(channelIds: string[]): Promise<YouTubeLiveResult[]> {
  const validChannelIds = [...new Set(channelIds.map((id) => id.trim()))]
    .filter((id) => /^UC[A-Za-z0-9_-]{22}$/.test(id));
  if (validChannelIds.length === 0) return [];
  const apiKey = requireYoutubeKey();

  // 1. Leer los últimos vídeos del feed público. Se limita la concurrencia
  // para no disparar ráfagas grandes contra YouTube cuando el roster crece.
  const channelByVideo = new Map<string, string>();
  for (let i = 0; i < validChannelIds.length; i += 8) {
    const chunk = validChannelIds.slice(i, i + 8);
    await Promise.all(chunk.map(async (channelId) => {
      const response = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`YouTube channel feed error (${response.status}): ${text}`);
      }
      const xml = await response.text();
      for (const videoId of parseFeedVideoIds(xml).slice(0, 5)) {
        channelByVideo.set(videoId, channelId);
      }
    }));
  }

  // 2. videos.list confirma cuáles están realmente emitiendo y aporta el CTA.
  const results: YouTubeLiveResult[] = [];
  const videoIds = [...channelByVideo.keys()];
  for (let i = 0; i < videoIds.length; i += 50) {
    const ids = videoIds.slice(i, i + 50).join(',');
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}&key=${apiKey}`,
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`YouTube videos live check error (${response.status}): ${text}`);
    }
    const data = YouTubeLiveVideosSchema.parse(await response.json());
    for (const item of data.items ?? []) {
      if (item.snippet.liveBroadcastContent !== 'live') continue;
      const channelId = channelByVideo.get(item.id) ?? item.snippet.channelId;
      results.push({
        channelId,
        videoId:      item.id,
        title:        item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails?.high?.url
          ?? item.snippet.thumbnails?.medium?.url
          ?? `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
      });
    }
  }
  return results;
}

/**
 * Fetch subscriber counts for multiple YouTube channel IDs.
 * Batches up to 50 IDs per request (YouTube API limit).
 */
export async function fetchYouTubeSubscriberCounts(
  channelIds: string[],
): Promise<YouTubeChannelStats[]> {
  const apiKey = requireYoutubeKey();

  const results: YouTubeChannelStats[] = [];
  const batchSize = 50;

  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${ids}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube API error (${res.status}): ${text}`);
    }

    const parsed = YouTubeChannelsStatsSchema.safeParse(await res.json());
    if (!parsed.success) throw new Error('YouTube statistics coverage invalid');
    const data = parsed.data;
    for (const item of data.items ?? []) {
      const subscriberCount = item.statistics.hiddenSubscriberCount ? null : readYouTubeCount(item.statistics.subscriberCount);
      if (subscriberCount === null) continue;
      results.push({
        channelId: item.id,
        subscriberCount,
      });
    }
  }

  return results;
}

/**
 * Fetch snippet-only fields (defaultLanguage, country) for multiple channel IDs.
 * Batches up to 50 IDs per request (YouTube API limit).
 */
export async function fetchYouTubeChannelSnippets(
  channelIds: string[],
): Promise<YouTubeChannelSnippet[]> {
  const apiKey = requireYoutubeKey();

  const results: YouTubeChannelSnippet[] = [];
  const batchSize = 50;

  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ids}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube snippets API error (${res.status}): ${text}`);
    }

    const data = YouTubeSnippetSchema.parse(await res.json());
    for (const item of data.items ?? []) {
      results.push({
        channelId: item.id,
        defaultLanguage: item.snippet.defaultLanguage ?? null,
        country: item.snippet.country ?? null,
      });
    }
  }

  return results;
}

/**
 * Search YouTube channels by keyword query.
 * Returns up to maxResults channels with snippet + statistics.
 */
export async function searchYouTubeChannels(
  query: string,
  maxResults = 10,
  regionCode?: string,
  relevanceLanguage?: string,
): Promise<YouTubeChannelPreview[]> {
  const apiKey = requireYoutubeKey();

  let searchUrl =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel` +
    `&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}`;
  if (regionCode) searchUrl += `&regionCode=${encodeURIComponent(regionCode)}`;
  if (relevanceLanguage) searchUrl += `&relevanceLanguage=${encodeURIComponent(relevanceLanguage)}`;

  const searchData = await readProviderJson(searchUrl, YouTubeSearchSchema, 'YouTube search API');
  const channelIds = (searchData.items ?? [])
    .map((item) => item.id.channelId)
    .filter(Boolean);

  if (channelIds.length === 0) return [];
  return getChannelDetails(channelIds);
}

/**
 * Finds channels through recently published videos instead of channel-name
 * relevance. This gives active, smaller creators a fairer chance to appear.
 */
export async function searchYouTubeChannelsFromRecentVideos(
  query: string,
  maxResults = 15,
  publishedAfter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
): Promise<YouTubeChannelPreview[]> {
  const apiKey = requireYoutubeKey();
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    order: 'date',
    q: query,
    maxResults: String(Math.min(Math.max(maxResults, 1), 50)),
    publishedAfter: publishedAfter.toISOString(),
    key: apiKey,
  });

  const searchData = await readProviderJson(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
    YouTubeVideoSearchSchema, 'YouTube search API');
  const channelIds = [...new Set(
    (searchData.items ?? []).map((item) => item.snippet.channelId).filter(Boolean),
  )];
  return channelIds.length > 0 ? getChannelDetails(channelIds) : [];
}

/**
 * Fetch snippet + statistics for a list of YouTube channel IDs.
 * Batches up to 50 IDs per request (YouTube API limit).
 */
export async function getChannelDetails(
  channelIds: string[],
): Promise<YouTubeChannelPreview[]> {
  const apiKey = requireYoutubeKey();

  const results: YouTubeChannelPreview[] = [];
  const batchSize = 50;

  const uniqueIds = [...new Set(channelIds)];
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const url =
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics` +
      `&id=${ids}&key=${apiKey}`;

    const data = await readProviderJson(url, YouTubeChannelsSchema, 'YouTube channels API');
    const seen = new Set<string>();
    for (const item of data.items ?? []) {
      if (!batch.includes(item.id) || seen.has(item.id)) throw new Error('YouTube channel coverage invalid');
      seen.add(item.id);
      const statistics = AvailableYouTubeChannelStatistics.safeParse(item.statistics);
      const counts = statistics.success ? statistics.data : null;
      const subscriberCount = counts?.hiddenSubscriberCount ? null : readYouTubeCount(counts?.subscriberCount);
      const videoCount = readYouTubeCount(counts?.videoCount);
      const viewCount = readYouTubeCount(counts?.viewCount);
      // customUrl arrives as "@handle" — strip the leading @
      const handle = item.snippet.customUrl
        ? item.snippet.customUrl.replace(/^@/, '')
        : null;

      results.push({
        channelId: item.id,
        handle,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          null,
        subscriberCount,
        country: item.snippet.country?.toUpperCase() ?? null,
        defaultLanguage: item.snippet.defaultLanguage ?? null,
        videoCount,
        viewCount,
        warnings: [subscriberCount, videoCount, viewCount].some(count => count === null) ? ['metric_unavailable'] : [],
      });
    }
  }

  return results;
}

export type YouTubeChannelPhoto = {
  readonly channelId: string;
  readonly thumbnailUrl: string;
};

/**
 * Fetch channel thumbnail (profile picture) for multiple YouTube channel IDs.
 * Uses snippet part. Cost: ~1 unit per 50 channels.
 */
export async function fetchYouTubeChannelPhotos(
  channelIds: string[],
): Promise<YouTubeChannelPhoto[]> {
  if (channelIds.length === 0) return [];
  const apiKey = requireYoutubeKey();

  const results: YouTubeChannelPhoto[] = [];
  const batchSize = 50;

  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ids}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = YouTubeChannelsSchema.parse(await res.json());
    for (const item of data.items ?? []) {
      const thumb =
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url;
      if (thumb) {
        results.push({ channelId: item.id, thumbnailUrl: thumb });
      }
    }
  }
  return results;
}
