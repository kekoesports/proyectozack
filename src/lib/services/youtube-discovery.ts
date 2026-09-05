import { env } from '@/lib/env';
import { YouTubeDiscoveryOptions, YouTubeDiscoveryPage } from '@/lib/schemas/youtube-metrics';
import type { ProviderCoverage, ProviderWarning } from '@/lib/schemas/provider-availability';
import { readProviderJson, ProviderReadError, providerWarning } from './provider-http';
import { getChannelDetails, type YouTubeChannelPreview } from './youtube';

export type YouTubeDiscoveryReport = { readonly items: YouTubeChannelPreview[]; readonly coverage: ProviderCoverage };

/** Search indexing is not exhaustive. Each page uses one request from the search quota bucket. */
export async function searchYouTubeChannelsFromRecentVideosReport(
  query: string,
  options: { readonly publishedAfter: Date; readonly maxResults?: number; readonly maxPages?: number; readonly language?: string },
): Promise<YouTubeDiscoveryReport> {
  const parsed = YouTubeDiscoveryOptions.safeParse({ query, maxResults: 50, maxPages: 1, ...options });
  if (!parsed.success || parsed.data.publishedAfter.getTime() > Date.now()) {
    throw new ProviderReadError('invalid_response', 'Invalid YouTube discovery options');
  }
  const config = parsed.data;
  const channelIds = new Set<string>();
  const cursors = new Set<string>();
  const warnings = new Set<ProviderWarning>();
  const before = new Date().toISOString();
  let pageToken: string | undefined;
  let pagesRead = 0;
  let items: YouTubeChannelPreview[] = [];
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');
  try {
    do {
      const params = new URLSearchParams({
        part: 'snippet', type: 'video', order: 'date', q: config.query,
        publishedAfter: config.publishedAfter.toISOString(), publishedBefore: before,
        maxResults: String(config.maxResults), key: apiKey,
      });
      if (config.language) params.set('relevanceLanguage', config.language);
      if (pageToken) params.set('pageToken', pageToken);
      const page = await readProviderJson(`https://www.googleapis.com/youtube/v3/search?${params}`,
        YouTubeDiscoveryPage, 'YouTube search API');
      pagesRead += 1;
      if (page.items.length > config.maxResults) throw new ProviderReadError('invalid_response', 'YouTube search coverage invalid');
      page.items.forEach(item => channelIds.add(item.snippet.channelId));
      pageToken = page.nextPageToken;
      if (pageToken && cursors.has(pageToken)) { warnings.add('repeated_cursor'); break; }
      if (pageToken) cursors.add(pageToken);
    } while (pageToken && pagesRead < config.maxPages);
    if (pageToken && pagesRead === config.maxPages) warnings.add('page_limit');
  } catch (error) { warnings.add(providerWarning(error)); }
  // Do not spend further quota after a rejected request; retain coverage for the caller.
  if (channelIds.size && ![...warnings].some(warning => ['rate_limited', 'request_failed', 'timeout', 'invalid_response', 'budget_exhausted', 'budget_unavailable'].includes(warning))) {
    try {
      items = await getChannelDetails([...channelIds]);
      if (items.length !== channelIds.size) warnings.add('coverage_incomplete');
      if (items.some(item => item.warnings?.length)) warnings.add('metric_unavailable');
    } catch (error) { warnings.add(providerWarning(error)); }
  }
  return { items, coverage: {
    status: warnings.size ? (pagesRead ? 'partial' : 'unavailable') : 'complete',
    pagesRead, warnings: [...warnings],
  } };
}
