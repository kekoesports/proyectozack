import { getGameLiveStreams, fetchTwitchFollowerCountsReport, searchTwitchChannels, searchTwitchGameCategories, fetchTwitchUserPhotosReport } from '@/lib/services/twitch';
jest.mock('@/lib/services/twitch-auth', () => ({
  getAppAccessToken: jest.fn(async () => ({ token: 'synthetic-token', clientId: 'synthetic-client' })),
}));
const reply = (body: unknown) => new Response(JSON.stringify(body));
const stream = (id: string) => ({
  id: 'stream-' + id, user_id: id, user_login: id, user_name: 'Synthetic', game_id: 'game',
  game_name: 'Synthetic game', type: 'live', language: 'en', viewer_count: 0,
  started_at: '2026-09-01T12:00:00Z', thumbnail_url: '',
});
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-05T12:00:00Z'));
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected synthetic request'));
});
afterEach(() => jest.restoreAllMocks());

it('resolves profile categories through one bounded official search page', async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ data: [{ id: 'game', name: 'Synthetic game' }], pagination: { cursor: 'more' } }));
  const result = await searchTwitchGameCategories('Synthetic game');
  expect(result.items).toEqual([{ id: 'game', name: 'Synthetic game' }]);
  expect(result.coverage).toMatchObject({ status: 'partial', warnings: ['page_limit'] });
  expect(String(jest.mocked(fetch).mock.calls[0]?.[0])).toContain('/search/categories?query=Synthetic+game&first=20');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('retains category search failures as unavailable instead of an empty success', async () => {
  expect((await searchTwitchGameCategories('Synthetic')).coverage).toMatchObject({ status: 'unavailable', warnings: ['request_failed'] });
});

it('uses a configurable game, paginates and retains real stream identifiers/time', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply({ data: [stream('one')], pagination: { cursor: 'next' } }))
    .mockResolvedValueOnce(reply({ data: [stream('two')], pagination: {} }));
  const result = await getGameLiveStreams('game');
  expect(result.items).toHaveLength(2);
  expect(result.items[0]).toMatchObject({
    streamId: 'stream-one', broadcasterId: 'one', startedAt: '2026-09-01T12:00:00Z', viewerCount: 0, followerCount: null,
  });
  expect(result.coverage).toEqual({ status: 'complete', pagesRead: 2, warnings: [] });
  expect(String(jest.mocked(fetch).mock.calls[1]?.[0])).toContain('after=next');
});
it('deduplicates volatile pages and marks observed coverage partial', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply({ data: [stream('one')], pagination: { cursor: 'next' } }))
    .mockResolvedValueOnce(reply({ data: [stream('one')], pagination: {} }));
  const result = await getGameLiveStreams('game');
  expect(result.items).toHaveLength(1);
  expect(result.coverage).toMatchObject({ status: 'partial', warnings: ['duplicate_record'] });
});

it('sends all configured languages before pagination and applies the exact live audience threshold', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply({ data: [
    { ...stream('below'), language: 'es', viewer_count: 19 },
    { ...stream('boundary'), language: 'es', viewer_count: 20 },
  ], pagination: { cursor: 'next' } })).mockResolvedValueOnce(reply({ data: [
    { ...stream('above'), viewer_count: 21 },
  ], pagination: {} }));
  const result = await getGameLiveStreams('game', 3, { languageCodes: ['es-ES', 'en', 'es'], minViewerCount: 20 });
  expect(result.items.map(item => item.broadcasterId)).toEqual(['boundary', 'above']);
  expect(result.items.every(item => item.followerCount === null)).toBe(true);
  expect(result.coverage).toEqual({ status: 'complete', pagesRead: 2, warnings: [] });
  for (const [url] of jest.mocked(fetch).mock.calls) {
    const params = new URL(String(url)).searchParams;
    expect(params.getAll('language')).toEqual(['es', 'en']);
    expect(params.get('game_id')).toBe('game');
    expect(params.has('min_viewers')).toBe(false);
  }
});

it('does not infer active status from the provider error type', async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ data: [{ ...stream('one'), type: '' }], pagination: {} }));
  const result = await getGameLiveStreams('game');
  expect(result.items).toEqual([]);
  expect(result.coverage).toMatchObject({ status: 'partial', warnings: ['coverage_incomplete'] });
});

it.each([{ language: 'de' }, { game_id: 'different-game' }])('rejects provider data outside the exact requested filters: %j', async mismatch => {
  jest.mocked(fetch).mockResolvedValue(reply({ data: [{ ...stream('one'), ...mismatch }], pagination: {} }));
  const result = await getGameLiveStreams('game', 3, { languageCodes: ['en'] });
  expect(result.items).toEqual([]);
  expect(result.coverage.warnings).toContain('invalid_response');
});

it.each([-1, 1.5, Number.NaN])('rejects invalid live audience threshold %s before fetching', async minViewerCount => {
  await expect(getGameLiveStreams('game', 3, { minViewerCount })).rejects.toThrow('Invalid Twitch discovery options');
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects unsupported three-letter languages rather than silently discarding the filter', async () => {
  await expect(getGameLiveStreams('game', 3, { languageCodes: ['spa'] })).rejects.toThrow('Invalid Twitch discovery options');
  expect(fetch).not.toHaveBeenCalled();
});
it('stops at three pages even when all pages are empty but nonterminal', async () => {
  for (const token of ['a', 'b', 'c']) jest.mocked(fetch).mockResolvedValueOnce(reply({ data: [], pagination: { cursor: token } }));
  expect((await getGameLiveStreams('game')).coverage).toEqual({ status: 'partial', pagesRead: 3, warnings: ['page_limit'] });
  expect(fetch).toHaveBeenCalledTimes(3);
});
it('stops on a repeated cursor', async () => {
  jest.mocked(fetch).mockImplementation(async () => reply({ data: [], pagination: { cursor: 'same' } }));
  expect((await getGameLiveStreams('game')).coverage.warnings).toContain('repeated_cursor');
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('preserves the valid first page after a later rejection without retrying', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply({ data: [stream('one')], pagination: { cursor: 'next' } }))
    .mockResolvedValueOnce(new Response('private-marker', { status: 429 }));
  const result = await getGameLiveStreams('game');
  expect(result.items).toHaveLength(1);
  expect(result.coverage).toEqual({ status: 'partial', pagesRead: 1, warnings: ['rate_limited'] });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it.each([-1, 1.5, '5', null])('does not synthesize a count from invalid viewers %j', async viewer_count => {
  jest.mocked(fetch).mockResolvedValue(reply({ data: [{ ...stream('one'), viewer_count }], pagination: {} }));
  const result = await getGameLiveStreams('game');
  expect(result.items).toEqual([]);
  expect(result.coverage.status).toBe('unavailable');
});
it('rejects missing pagination rather than treating the first page as complete', async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ data: [] }));
  expect((await getGameLiveStreams('game')).coverage.warnings).toContain('invalid_response');
});
it('rejects excessive requested depth before network access', async () => {
  await expect(getGameLiveStreams('game', 4)).rejects.toThrow('Invalid Twitch discovery options');
  expect(fetch).not.toHaveBeenCalled();
});
it('keeps valid zero followers and explicit unknown on an invalid response', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply({ total: 0 })).mockResolvedValueOnce(reply({ total: -1 }));
  expect(await fetchTwitchFollowerCountsReport(['one', 'two', 'one'])).toEqual({
    items: [{ broadcasterId: 'one', followerCount: 0 }, { broadcasterId: 'two', followerCount: null }],
    coverage: { status: 'partial', pagesRead: 1, warnings: ['invalid_response'] },
  });
});
it('does not start another follower batch after a rate limit response', async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('private-marker', { status: 429 }));
  const result = await fetchTwitchFollowerCountsReport(['a', 'b', 'c', 'd', 'e', 'f']);
  expect(fetch).toHaveBeenCalledTimes(5);
  expect(result.items).toHaveLength(6);
  expect(result.items.every(item => item.followerCount === null)).toBe(true);
});
it.each([403, 503])('does not start another follower batch after HTTP %i', async status => {
  jest.mocked(fetch).mockImplementation(async () => new Response('private-marker', { status }));
  const result = await fetchTwitchFollowerCountsReport(['a', 'b', 'c', 'd', 'e', 'f']);
  expect(fetch).toHaveBeenCalledTimes(5);
  expect(result.items).toHaveLength(6);
  expect(result.coverage.status).toBe('unavailable');
});
it('search metadata does not invent follower counts or live viewer counts', async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ data: [{
    id: 'one', broadcaster_login: 'one', display_name: 'Synthetic', is_live: true,
    game_name: 'Synthetic game', broadcaster_language: 'en', thumbnail_url: '',
  }] }));
  expect(await searchTwitchChannels('one')).toEqual([expect.objectContaining({ followerCount: null, viewerCount: null, isLive: true })]);
});
it('deduplicates avatar lookup and keeps a missing photo explicitly incomplete', async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ data: [
    { id: 'one', login: 'one', display_name: 'Synthetic', profile_image_url: 'https://example.com/photo.jpg' },
    { id: 'two', login: 'two', display_name: 'Synthetic', profile_image_url: '' },
  ] }));
  const result = await fetchTwitchUserPhotosReport(['one', 'one', 'two']);
  expect(result.items).toEqual([{ userId: 'one', login: 'one', profileImageUrl: 'https://example.com/photo.jpg' }]);
  expect(result.coverage).toMatchObject({ status: 'partial', warnings: ['metric_unavailable'] });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('does not retry failed avatar batches or clear the previous photo', async () => {
  const result = await fetchTwitchUserPhotosReport(['one']);
  expect(result.items).toEqual([]);
  expect(result.coverage.status).toBe('unavailable');
  expect(fetch).toHaveBeenCalledTimes(1);
});
