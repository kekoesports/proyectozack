import { z } from 'zod';
import { env } from '@/lib/env';

function requireYoutubeKey(): string {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');
  return apiKey;
}

type YouTubeChannelStats = {
  channelId: string;
  subscriberCount: number;
};

const YouTubeContentDetailsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        contentDetails: z.object({
          relatedPlaylists: z.object({ uploads: z.string() }),
        }),
      }),
    )
    .optional(),
});

const YouTubePlaylistItemsSchema = z.object({
  items: z
    .array(z.object({ snippet: z.object({ resourceId: z.object({ videoId: z.string() }) }) }))
    .optional(),
});

const YouTubeVideosStatsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        statistics: z.object({ viewCount: z.string().optional() }),
      }),
    )
    .optional(),
});

export type YouTubeAvgViewsResult = {
  readonly channelId: string;
  readonly avgViews: number;
  readonly videoCount: number;
};

const YouTubeChannelsStatsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        statistics: z.object({
          subscriberCount: z.string().optional(),
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

const YouTubeChannelsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          title: z.string(),
          description: z.string(),
          customUrl: z.string().optional(),
          thumbnails: z
            .object({
              medium: z.object({ url: z.string() }).optional(),
              default: z.object({ url: z.string() }).optional(),
            })
            .optional(),
        }),
        statistics: z.object({ subscriberCount: z.string().optional() }).optional(),
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
  readonly subscriberCount: number;
}

// ── Live detection ──────────────────────────────────────────────────────

const YouTubeLiveBroadcastSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    snippet: z.object({ liveBroadcastContent: z.enum(['live', 'upcoming', 'none']) }),
  })).optional(),
});

const YouTubeLiveSearchSchema = z.object({
  items: z.array(z.object({
    id: z.object({ videoId: z.string() }),
    snippet: z.object({
      title: z.string(),
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

/**
 * Detect which YouTube channels are currently live, and return their video IDs for embedding.
 *
 * Step 1: channels.list?part=snippet&id=BATCH → 1 quota unit total
 * Step 2: search.list per live channel → 100 units each (rare — only when live)
 *
 * IMPORTANT: if ANY API call fails the caller must NOT update the DB to avoid
 * false "offline" marks. Throw on error; caller catches and skips.
 */
export async function fetchYouTubeLive(channelIds: string[]): Promise<YouTubeLiveResult[]> {
  if (channelIds.length === 0) return [];
  const apiKey = requireYoutubeKey();

  // Step 1: batch check which channels are live (1 quota unit)
  const ids = channelIds.join(',');
  const checkRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ids}&key=${apiKey}`
  );
  if (!checkRes.ok) {
    const text = await checkRes.text();
    throw new Error(`YouTube channels live check error (${checkRes.status}): ${text}`);
  }
  const checkData = YouTubeLiveBroadcastSchema.parse(await checkRes.json());
  const liveChannelIds = (checkData.items ?? [])
    .filter((i) => i.snippet.liveBroadcastContent === 'live')
    .map((i) => i.id);

  if (liveChannelIds.length === 0) return [];

  // Step 2: for each live channel, get the video ID via search (100 units each)
  const results: YouTubeLiveResult[] = [];
  await Promise.all(
    liveChannelIds.map(async (channelId) => {
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}` +
        `&eventType=live&type=video&maxResults=1&key=${apiKey}`
      );
      if (!searchRes.ok) return; // skip this channel if search fails
      const searchData = YouTubeLiveSearchSchema.parse(await searchRes.json());
      const item = searchData.items?.[0];
      if (!item) return;
      results.push({
        channelId,
        videoId:      item.id.videoId,
        title:        item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails?.high?.url
          ?? item.snippet.thumbnails?.medium?.url
          ?? `https://img.youtube.com/vi/${item.id.videoId}/hqdefault.jpg`,
      });
    })
  );
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

    const data = YouTubeChannelsStatsSchema.parse(await res.json());
    for (const item of data.items ?? []) {
      results.push({
        channelId: item.id,
        subscriberCount: parseInt(item.statistics.subscriberCount ?? '0', 10) || 0,
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

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    const text = await searchRes.text();
    throw new Error(`YouTube search API error (${searchRes.status}): ${text}`);
  }

  const searchData = YouTubeSearchSchema.parse(await searchRes.json());
  const channelIds = (searchData.items ?? [])
    .map((item) => item.id.channelId)
    .filter(Boolean);

  if (channelIds.length === 0) return [];
  return getChannelDetails(channelIds);
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

  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const url =
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics` +
      `&id=${ids}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube channels API error (${res.status}): ${text}`);
    }

    const data = YouTubeChannelsSchema.parse(await res.json());
    for (const item of data.items ?? []) {
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
        subscriberCount: parseInt(item.statistics?.subscriberCount ?? '0', 10) || 0,
      });
    }
  }

  return results;
}

/**
 * Get the uploads playlist ID for a channel.
 * Costs 1 quota unit.
 */
async function getUploadsPlaylistId(channelId: string): Promise<string | null> {
  const apiKey = requireYoutubeKey();

  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube channels API error (${res.status}): ${text}`);
  }

  const data = YouTubeContentDetailsSchema.parse(await res.json());
  return data.items?.[0]?.contentDetails.relatedPlaylists.uploads ?? null;
}

/**
 * Get the most recent video IDs from an uploads playlist.
 * Costs 1 quota unit per request.
 */
async function getRecentVideoIds(playlistId: string, count = 10): Promise<string[]> {
  const apiKey = requireYoutubeKey();

  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet` +
    `&playlistId=${encodeURIComponent(playlistId)}&maxResults=${count}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube playlistItems API error (${res.status}): ${text}`);
  }

  const data = YouTubePlaylistItemsSchema.parse(await res.json());
  return (data.items ?? []).map((item) => item.snippet.resourceId.videoId).filter(Boolean);
}

/**
 * Get view counts for up to 50 video IDs.
 * Costs 1 quota unit per 50 videos.
 */
async function getVideoViewCounts(videoIds: string[]): Promise<Map<string, number>> {
  const apiKey = requireYoutubeKey();

  const counts = new Map<string, number>();
  if (videoIds.length === 0) return counts;

  const ids = videoIds.slice(0, 50).join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube videos API error (${res.status}): ${text}`);
  }

  const data = YouTubeVideosStatsSchema.parse(await res.json());
  for (const item of data.items ?? []) {
    counts.set(item.id, parseInt(item.statistics.viewCount ?? '0', 10) || 0);
  }

  return counts;
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

/**
 * Compute average view count across the most recent N videos for a channel.
 * Total quota cost: ~3 units (contentDetails + playlistItems + videos).
 */
export async function getChannelAvgViews(
  channelId: string,
  count = 10,
): Promise<YouTubeAvgViewsResult> {
  const playlistId = await getUploadsPlaylistId(channelId);
  if (!playlistId) return { channelId, avgViews: 0, videoCount: 0 };

  const videoIds = await getRecentVideoIds(playlistId, count);
  if (videoIds.length === 0) return { channelId, avgViews: 0, videoCount: 0 };

  const viewCounts = await getVideoViewCounts(videoIds);
  const total = Array.from(viewCounts.values()).reduce((sum, v) => sum + v, 0);
  return {
    channelId,
    avgViews: viewCounts.size > 0 ? Math.round(total / viewCounts.size) : 0,
    videoCount: viewCounts.size,
  };
}
