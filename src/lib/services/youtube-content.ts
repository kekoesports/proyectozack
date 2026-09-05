import { env } from '@/lib/env';
import { YouTubeContentDetailsSchema, YouTubePlaylistItemsSchema, YouTubeVideosStatsSchema, readYouTubeCount } from '@/lib/schemas/youtube-metrics';
import { ProviderReadError, readProviderJson, providerWarning } from './provider-http';
import type { ProviderCoverage } from '@/lib/schemas/provider-availability';

function requireYoutubeKey(): string {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');
  return apiKey;
}

export type YouTubeAvgViewsResult = {
  readonly channelId: string;
  readonly avgViews: number;
  readonly videoCount: number;
};

/**
 * Get the uploads playlist ID for a channel.
 * Costs 1 quota unit.
 */
async function getUploadsPlaylistId(channelId: string): Promise<string | null> {
  const apiKey = requireYoutubeKey();

  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${apiKey}`;
  const data = await readProviderJson(url, YouTubeContentDetailsSchema, 'YouTube channels API');
  if (data.items.length > 1 || data.items.some(item => item.id !== channelId)) {
    throw new Error('YouTube playlist coverage invalid');
  }
  return data.items[0]?.contentDetails.relatedPlaylists.uploads || null;
}

/**
 * Get the most recent video IDs from an uploads playlist.
 * Costs 1 quota unit per request.
 */
type RecentUpload = {
  readonly videoId: string;
  readonly publishedAt: Date;
  readonly title: string;
  readonly thumbnailUrl: string | null;
};

async function getRecentUploads(
  playlistId: string,
  publishedAfter: Date,
  maxVideos = 100,
  requireCompleteWindow = false,
  progress = { pagesRead: 0 },
): Promise<RecentUpload[]> {
  const apiKey = requireYoutubeKey();
  const uploads: RecentUpload[] = [];
  let pageToken: string | undefined;
  let reachedCutoff = false;
  const seenIds = new Set<string>();
  const seenPages = new Set<string>();
  let previousPublication = Number.POSITIVE_INFINITY;

  while (uploads.length < maxVideos && !reachedCutoff && progress.pagesRead < 3) {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: String(Math.min(50, maxVideos - uploads.length)),
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const data = await readProviderJson(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
      YouTubePlaylistItemsSchema, 'YouTube playlistItems API');
    progress.pagesRead += 1;
    for (const item of data.items ?? []) {
      const publishedAt = new Date(item.contentDetails.videoPublishedAt);
      if (!Number.isFinite(publishedAt.getTime()) || publishedAt.getTime() > Date.now()) {
        throw new Error('YouTube publication coverage invalid');
      }
      if (publishedAt.getTime() > previousPublication) {
        throw new ProviderReadError('coverage_incomplete', 'YouTube publication ordering coverage invalid');
      }
      previousPublication = publishedAt.getTime();
      if (publishedAt < publishedAfter) {
        reachedCutoff = true;
        continue;
      }
      const videoId = item.contentDetails.videoId;
      if (videoId !== item.snippet.resourceId.videoId) throw new Error('YouTube video identity coverage invalid');
      if (!videoId || seenIds.has(videoId)) throw new Error('YouTube duplicate upload coverage invalid');
      seenIds.add(videoId);
      uploads.push({
        videoId,
        publishedAt,
        title: item.snippet.title ?? 'Vídeo sin título',
        thumbnailUrl:
          item.snippet.thumbnails?.high?.url
          ?? item.snippet.thumbnails?.medium?.url
          ?? item.snippet.thumbnails?.default?.url
          ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      });
      if (uploads.length > maxVideos) throw new Error('YouTube upload coverage limit invalid');
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
    if (seenPages.has(pageToken)) throw new ProviderReadError('repeated_cursor', 'YouTube pagination coverage invalid');
    seenPages.add(pageToken);
  }

  if (requireCompleteWindow && !reachedCutoff && pageToken) {
    throw new ProviderReadError('page_limit', 'YouTube window coverage incomplete');
  }

  return uploads;
}

/**
 * Get view counts for up to 50 video IDs.
 * Costs 1 quota unit per 50 videos.
 */
async function getVideoViewCounts(videoIds: string[]): Promise<Map<string, number>> {
  const stats = await getVideoPublicStats(videoIds);
  return new Map([...stats].map(([id, value]) => [id, value.views]));
}

type YouTubeVideoPublicStats = {
  readonly views: number;
  readonly likes: number | null;
  readonly comments: number | null;
};

async function getVideoPublicStats(videoIds: string[]): Promise<Map<string, YouTubeVideoPublicStats>> {
  const apiKey = requireYoutubeKey();
  const results = new Map<string, YouTubeVideoPublicStats>();

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const ids = batch.join(',');
    if (!ids) continue;
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${apiKey}`;
    const data = await readProviderJson(url, YouTubeVideosStatsSchema, 'YouTube videos API');
    for (const item of data.items ?? []) {
      const views = readYouTubeCount(item.statistics.viewCount);
      if (!batch.includes(item.id) || results.has(item.id) || views === null) {
        throw new ProviderReadError('coverage_incomplete', 'YouTube video coverage unavailable');
      }
      results.set(item.id, {
        views,
        likes: readYouTubeCount(item.statistics.likeCount),
        comments: readYouTubeCount(item.statistics.commentCount),
      });
    }
    if (batch.some(id => !results.has(id))) throw new ProviderReadError('coverage_incomplete', 'YouTube video coverage incomplete');
  }

  return results;
}

export type YouTubeContentPerformance = {
  readonly videoId: string;
  readonly title: string;
  readonly url: string;
  readonly thumbnailUrl: string | null;
  readonly publishedAt: Date;
  readonly views: number;
  readonly likes: number | null;
  readonly comments: number | null;
};

/** Datos públicos de los vídeos recientes de un canal, listos para analítica interna. */
export async function getChannelRecentContent(
  channelId: string,
  windowDays = 365,
  maxVideos = 100,
): Promise<YouTubeContentPerformance[]> {
  const playlistId = await getUploadsPlaylistId(channelId);
  if (!playlistId) throw new Error('YouTube playlist unavailable');

  const cutoff = new Date(Date.now() - windowDays * 86_400_000);
  const uploads = await getRecentUploads(playlistId, cutoff, maxVideos, true);
  const stats = await getVideoPublicStats(uploads.map((upload) => upload.videoId));

  return uploads.flatMap((upload) => {
    const values = stats.get(upload.videoId);
    if (!values) throw new Error('YouTube video coverage incomplete');
    return [{
      videoId: upload.videoId,
      title: upload.title,
      url: `https://www.youtube.com/watch?v=${upload.videoId}`,
      thumbnailUrl: upload.thumbnailUrl,
      publishedAt: upload.publishedAt,
      views: values.views,
      likes: values.likes,
      comments: values.comments,
    }];
  });
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
  if (!playlistId) throw new Error('YouTube playlist unavailable');

  const uploads = await getRecentUploads(playlistId, new Date(0), count);
  const videoIds = uploads.map((item) => item.videoId);
  if (videoIds.length === 0) return { channelId, avgViews: 0, videoCount: 0 };

  const viewCounts = await getVideoViewCounts(videoIds);
  const total = Array.from(viewCounts.values()).reduce((sum, v) => sum + v, 0);
  return {
    channelId,
    avgViews: viewCounts.size > 0 ? Math.round(total / viewCounts.size) : 0,
    videoCount: viewCounts.size,
  };
}

export type YouTubeRecentPerformance = {
  readonly channelId: string;
  readonly windowDays: number;
  readonly videoCount: number;
  readonly minViews: number;
  readonly avgViews: number;
  readonly medianViews: number;
  readonly videosAtOrAbove1000: number;
  readonly lastVideoAt: Date | null;
};

/**
 * Audita todos los uploads encontrados dentro de una ventana reciente.
 * Legacy fail-closed contract. Incomplete coverage must never qualify a channel.
 */
export async function getChannelRecentPerformance(
  channelId: string,
  windowDays = 90,
): Promise<YouTubeRecentPerformance> {
  const result = await getChannelRecentPerformanceReport(channelId, windowDays);
  if (!result.data || result.coverage.status !== 'complete') {
    throw new ProviderReadError(result.coverage.warnings[0] ?? 'coverage_incomplete', 'YouTube recent coverage unavailable');
  }
  return result.data;
}

export type YouTubeRecentPerformanceReport = {
  readonly data: YouTubeRecentPerformance | null;
  readonly coverage: ProviderCoverage;
};

/** At most three playlist pages / 100 uploads; no partial medians masquerading as complete. */
export async function getChannelRecentPerformanceReport(
  channelId: string, windowDays = 90,
): Promise<YouTubeRecentPerformanceReport> {
  const progress = { pagesRead: 0 };
  try {
  const playlistId = await getUploadsPlaylistId(channelId);
  if (!playlistId) {
    throw new Error('YouTube playlist unavailable');
  }

  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const uploads = await getRecentUploads(playlistId, cutoff, 100, true, progress);
  const viewCounts = await getVideoViewCounts(uploads.map((item) => item.videoId));
  const views = uploads
    .map((item) => viewCounts.get(item.videoId))
    .filter((value): value is number => value !== undefined);

  const total = views.reduce((sum, value) => sum + value, 0);
  const sortedViews = [...views].sort((a, b) => a - b);
  const middle = Math.floor(sortedViews.length / 2);
  const medianViews = sortedViews.length === 0
    ? 0
    : sortedViews.length % 2 === 1
      ? sortedViews[middle] ?? 0
      : ((sortedViews[middle - 1] ?? 0) / 2 + (sortedViews[middle] ?? 0) / 2);
  return { data: {
    channelId,
    windowDays,
    videoCount: views.length,
    minViews: views.length > 0 ? Math.min(...views) : 0,
    avgViews: views.length > 0 ? Math.round(total / views.length) : 0,
    medianViews,
    videosAtOrAbove1000: views.filter((value) => value >= 1_000).length,
    lastVideoAt: uploads.length ? new Date(Math.max(...uploads.map(item => item.publishedAt.getTime()))) : null,
  }, coverage: { status: 'complete', pagesRead: progress.pagesRead, warnings: [] } };
  } catch (error) {
    return { data: null, coverage: {
      status: progress.pagesRead > 0 ? 'partial' : 'unavailable',
      pagesRead: progress.pagesRead, warnings: [providerWarning(error)],
    } };
  }
}
