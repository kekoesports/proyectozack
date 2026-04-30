type YouTubeChannelStats = {
  channelId: string;
  subscriberCount: number;
}

type YouTubeContentDetailsResponse = {
  items?: Array<{
    id: string;
    contentDetails: {
      relatedPlaylists: {
        uploads: string;
      };
    };
  }>;
}

type YouTubePlaylistItemsResponse = {
  items?: Array<{
    snippet: {
      resourceId: {
        videoId: string;
      };
    };
  }>;
}

type YouTubeVideosStatsResponse = {
  items?: Array<{
    id: string;
    statistics: {
      viewCount?: string;
    };
  }>;
}

export type YouTubeAvgViewsResult = {
  readonly channelId: string;
  readonly avgViews: number;
  readonly videoCount: number;
}

type YouTubeAPIResponse = {
  items?: Array<{
    id: string;
    statistics: {
      subscriberCount: string;
      viewCount: string;
      videoCount: string;
    };
  }>;
}

type YouTubeSearchAPIResponse = {
  items?: Array<{
    id: {
      channelId: string;
    };
  }>;
}

type YouTubeChannelsAPIResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      customUrl?: string;
      thumbnails?: {
        medium?: { url: string };
        default?: { url: string };
      };
    };
    statistics: {
      subscriberCount?: string;
    };
  }>;
}

type YouTubeSnippetOnlyResponse = {
  items?: Array<{
    id: string;
    snippet: {
      defaultLanguage?: string;
      country?: string;
    };
  }>;
}

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

/**
 * Fetch subscriber counts for multiple YouTube channel IDs.
 * Batches up to 50 IDs per request (YouTube API limit).
 */
export async function fetchYouTubeSubscriberCounts(
  channelIds: string[],
): Promise<YouTubeChannelStats[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set');
  }

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

    const data: YouTubeAPIResponse = await res.json();
    if (data.items) {
      for (const item of data.items) {
        results.push({
          channelId: item.id,
          subscriberCount: parseInt(item.statistics.subscriberCount, 10) || 0,
        });
      }
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
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');

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

    const data: YouTubeSnippetOnlyResponse = await res.json();
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
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');

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

  const searchData: YouTubeSearchAPIResponse = await searchRes.json();
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
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');

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

    const data: YouTubeChannelsAPIResponse = await res.json();
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
        subscriberCount: parseInt(item.statistics.subscriberCount ?? '0', 10) || 0,
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
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');

  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube channels API error (${res.status}): ${text}`);
  }

  const data: YouTubeContentDetailsResponse = await res.json();
  return data.items?.[0]?.contentDetails.relatedPlaylists.uploads ?? null;
}

/**
 * Get the most recent video IDs from an uploads playlist.
 * Costs 1 quota unit per request.
 */
async function getRecentVideoIds(playlistId: string, count = 10): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');

  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet` +
    `&playlistId=${encodeURIComponent(playlistId)}&maxResults=${count}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube playlistItems API error (${res.status}): ${text}`);
  }

  const data: YouTubePlaylistItemsResponse = await res.json();
  return (data.items ?? []).map((item) => item.snippet.resourceId.videoId).filter(Boolean);
}

/**
 * Get view counts for up to 50 video IDs.
 * Costs 1 quota unit per 50 videos.
 */
async function getVideoViewCounts(videoIds: string[]): Promise<Map<string, number>> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');

  const counts = new Map<string, number>();
  if (videoIds.length === 0) return counts;

  const ids = videoIds.slice(0, 50).join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube videos API error (${res.status}): ${text}`);
  }

  const data: YouTubeVideosStatsResponse = await res.json();
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
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');

  const results: YouTubeChannelPhoto[] = [];
  const batchSize = 50;

  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ids}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data: YouTubeChannelsAPIResponse = await res.json();
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
