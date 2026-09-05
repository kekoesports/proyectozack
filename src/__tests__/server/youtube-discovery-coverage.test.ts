import {
  getChannelDetails, getChannelRecentPerformanceReport, getChannelRecentContent,
  searchYouTubeChannelsFromRecentVideosReport,
} from '@/lib/services/youtube';
jest.mock('@/lib/env', () => ({ env: { YOUTUBE_API_KEY: 'synthetic-key' } }));
const NOW = Date.parse('2026-09-05T12:00:00Z');
const reply = (body: unknown) => new Response(JSON.stringify(body));
const playlist = { items: [{ id: 'channel', contentDetails: { relatedPlaylists: { uploads: 'uploads' } } }] };
const upload = (videoId: string, videoPublishedAt = '2026-09-01T12:00:00Z') => ({
  contentDetails: { videoId, videoPublishedAt },
  snippet: { resourceId: { videoId }, publishedAt: '2026-09-04T12:00:00Z' },
});
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected synthetic request'));
});
afterEach(() => jest.restoreAllMocks());

it('preserves hidden channel identity and other observed counters', async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ items: [{
    id: 'channel', snippet: { title: 'Synthetic', description: '' },
    statistics: { subscriberCount: '100', hiddenSubscriberCount: true, viewCount: '0', videoCount: '3' },
  }] }));
  expect(await getChannelDetails(['channel'])).toEqual([expect.objectContaining({
    channelId: 'channel', subscriberCount: null, viewCount: 0, videoCount: 3, warnings: ['metric_unavailable'],
  })]);
});
it('uses video publication, not date added to the playlist, for the window', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(playlist))
    .mockResolvedValueOnce(reply({ items: [upload('old', '2025-01-01T12:00:00Z')] }));
  expect(await getChannelRecentContent('channel', 90)).toEqual([]);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('does not claim an empty complete window when a recent upload follows an older item', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(playlist))
    .mockResolvedValueOnce(reply({ items: [upload('old', '2025-01-01T12:00:00Z'), upload('recent')] }));
  expect(await getChannelRecentPerformanceReport('channel', 90)).toEqual({
    data: null, coverage: { status: 'partial', pagesRead: 1, warnings: ['coverage_incomplete'] },
  });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('does not round a 999.5 median up to the 1000 threshold', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(playlist))
    .mockResolvedValueOnce(reply({ items: ['a', 'b', 'c', 'd'].map(id => upload(id)) }))
    .mockResolvedValueOnce(reply({ items: [0, 999, 1000, 2000].map((views, index) => ({
      id: ['a', 'b', 'c', 'd'][index], statistics: { viewCount: String(views) },
    })) }));
  const result = await getChannelRecentPerformanceReport('channel');
  expect(result.data?.medianViews).toBe(999.5);
  expect(result.coverage).toEqual({ status: 'complete', pagesRead: 1, warnings: [] });
});
it('bounds unique empty pagination and does not publish partial statistics as zeros', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(playlist));
  for (const token of ['one', 'two', 'three']) jest.mocked(fetch).mockResolvedValueOnce(reply({ items: [], nextPageToken: token }));
  expect(await getChannelRecentPerformanceReport('channel')).toEqual({
    data: null, coverage: { status: 'partial', pagesRead: 3, warnings: ['page_limit'] },
  });
  expect(fetch).toHaveBeenCalledTimes(4);
});
it('reports missing video coverage instead of dropping that video', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(playlist))
    .mockResolvedValueOnce(reply({ items: [upload('a')] }))
    .mockResolvedValueOnce(reply({ items: [] }));
  expect(await getChannelRecentPerformanceReport('channel')).toEqual({
    data: null, coverage: { status: 'partial', pagesRead: 1, warnings: ['coverage_incomplete'] },
  });
});
it('reports unavailable network data with stable warnings only', async () => {
  jest.mocked(fetch).mockRejectedValue(new Error('private-marker'));
  expect(await getChannelRecentPerformanceReport('channel')).toEqual({
    data: null, coverage: { status: 'unavailable', pagesRead: 0, warnings: ['request_failed'] },
  });
});
it('deduplicates channel IDs across pages before one enrichment batch', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply({ items: [{ snippet: { channelId: 'channel' } }], nextPageToken: 'next' }))
    .mockResolvedValueOnce(reply({ items: [{ snippet: { channelId: 'channel' } }] }))
    .mockResolvedValueOnce(reply({ items: [{
      id: 'channel', snippet: { title: 'Synthetic', description: '' },
      statistics: { subscriberCount: '0', viewCount: '0', videoCount: '0' },
    }] }));
  const result = await searchYouTubeChannelsFromRecentVideosReport('CS2', { publishedAfter: new Date(NOW - 90 * 86400000), maxPages: 2 });
  expect(result.items).toHaveLength(1);
  expect(result.coverage.status).toBe('complete');
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(String(jest.mocked(fetch).mock.calls[1]?.[0])).toContain('pageToken=next');
});
it('records a search page limit and does not claim exhaustive discovery', async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ items: [], nextPageToken: 'next' }));
  const result = await searchYouTubeChannelsFromRecentVideosReport('CS2', { publishedAfter: new Date(0), maxPages: 1 });
  expect(result.coverage).toEqual({ status: 'partial', pagesRead: 1, warnings: ['page_limit'] });
  expect(fetch).toHaveBeenCalledTimes(1);
});
