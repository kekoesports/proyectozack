jest.mock('@/lib/env', () => ({ env: { KICK_CLIENT_ID: 'test-client', KICK_CLIENT_SECRET: 'test-secret' } }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const token = () => json({ access_token: 'synthetic-token', expires_in: 3600 });
const category = { id: 12, name: 'Counter-Strike 2' };
const stream = (id: number, viewers = 42) => ({
  broadcaster_user: { id, username: `creator${id}`, profile_picture: 'https://example.org/avatar.png' },
  category, channel: { slug: `creator${id}` }, language_code: 'es',
  started_at: '2026-01-01T10:00:00Z', title: 'CS2', viewer_count: viewers,
});
beforeEach(() => jest.resetModules());
afterEach(() => jest.restoreAllMocks());

it('uses official exact channels/users and never exposes private fields or invented metrics', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [{
      broadcaster_user_id: 100, slug: 'creator', channel_description: 'Public bio', category,
      banner_picture: 'https://example.org/banner.png',
      stream: { is_live: true, start_time: '2026-01-01T10:00:00Z', key: 'PRIVATE_STREAM_KEY' },
    }] })).mockResolvedValueOnce(json({ data: [{
      user_id: 100, name: 'Creator', profile_picture: 'https://example.org/avatar.png', email: 'PRIVATE_EMAIL',
    }] }));
  const { getKickChannel } = await import('@/lib/services/kick');
  const result = await getKickChannel('CREATOR');
  expect(result).toMatchObject({ slug: 'creator', username: 'Creator', followers: null, country: null,
    currentCategory: 'Counter-Strike 2', recentCategories: [], isLive: true });
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE/);
  expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
    'https://id.kick.com/oauth/token', 'https://api.kick.com/public/v1/channels?slug=creator',
    'https://api.kick.com/public/v1/users?id=100',
  ]);
});

it.each([{ data: [] }, { data: [{ broadcaster_user_id: 100, slug: 'creator', stream: null }] }])('handles exact empty/offline data without history fabrication', async ({ data }) => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ data }));
  if (data.length) fetcher.mockResolvedValueOnce(json({ data: [{ user_id: 100, name: 'Creator' }] }));
  const { getKickChannel } = await import('@/lib/services/kick');
  const result = await getKickChannel('creator');
  if (!data.length) expect(result).toBeNull();
  else expect(result).toMatchObject({ followers: null, isLive: null, lastLivestreamAt: null, recentCategories: [] });
});

it('rejects malformed slugs before authentication', async () => {
  const fetcher = jest.spyOn(global, 'fetch');
  const { getKickChannel } = await import('@/lib/services/kick');
  await expect(getKickChannel('../secrets')).rejects.toMatchObject({ code: 'invalid_input' });
  expect(fetcher).not.toHaveBeenCalled();
});

it('rejects a mismatched channel response', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [{ broadcaster_user_id: 100, slug: 'different' }] }));
  const { getKickChannel } = await import('@/lib/services/kick');
  await expect(getKickChannel('creator')).rejects.toMatchObject({ code: 'invalid_response' });
});

it('sanitizes provider errors without reading their body', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ token: 'PRIVATE_SECRET', text: 'private email' }, 403));
  const { getKickChannel } = await import('@/lib/services/kick');
  await expect(getKickChannel('creator')).rejects.toThrow('Discovery provider: forbidden');
});

it('reads bounded V2 pages, repeats languages and preserves hidden viewers as unknown', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [stream(1)], pagination: { next_cursor: 'next' } }))
    .mockResolvedValueOnce(json({ data: [stream(2, 0)], pagination: { next_cursor: null } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  const report = await getKickLiveCreatorsReport({ languageCodes: ['es'], pageSize: 1 });
  expect(report.coverage).toEqual({ status: 'complete', pagesRead: 2, warnings: [] });
  expect(report.items.map(row => row.viewerCount)).toEqual([42, null]);
  expect(String(fetcher.mock.calls[3]?.[0])).toContain('cursor=next');
  expect(String(fetcher.mock.calls[2]?.[0])).toContain('language_code=es');
});

it('stops a repeated cursor and deduplicates broadcaster IDs', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [stream(1)], pagination: { next_cursor: 'repeat' } }))
    .mockResolvedValueOnce(json({ data: [stream(1)], pagination: { next_cursor: 'repeat' } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  const report = await getKickLiveCreatorsReport();
  expect(report.items).toHaveLength(1);
  expect(report.coverage).toMatchObject({ status: 'partial', pagesRead: 2,
    warnings: expect.arrayContaining(['duplicate_record', 'repeated_cursor']) });
  expect(fetcher).toHaveBeenCalledTimes(4);
});

it('accepts empty category/live cursors and a hyphenated slug without requesting another page', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [category], pagination: { next_cursor: '' } }))
    .mockResolvedValueOnce(json({ data: [{ ...stream(1), channel: { slug: 'streamer-123' } }],
      pagination: { next_cursor: '' } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  const report = await getKickLiveCreatorsReport({ minViewerCount: 20, languageCodes: ['es'] });
  expect(report.items).toHaveLength(1);
  expect(report.items[0]?.slug).toBe('streamer-123');
  expect(report.coverage).toEqual({ status: 'complete', pagesRead: 1, warnings: [] });
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('treats empty category cursor with no match as an empty completed lookup, not a provider failure', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [], pagination: { next_cursor: '' } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  expect(await getKickLiveCreatorsReport()).toEqual({ items: [],
    coverage: { status: 'complete', pagesRead: 0, warnings: [] } });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('stops at an empty final cursor after preserving previous live pages', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [category], pagination: { next_cursor: '' } }))
    .mockResolvedValueOnce(json({ data: [stream(1)], pagination: { next_cursor: 'next' } }))
    .mockResolvedValueOnce(json({ data: [stream(2)], pagination: { next_cursor: '' } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  const report = await getKickLiveCreatorsReport({ pageSize: 1 });
  expect(report.items.map(item => item.userId)).toEqual([1, 2]);
  expect(report.coverage).toEqual({ status: 'complete', pagesRead: 2, warnings: [] });
  expect(fetcher).toHaveBeenCalledTimes(4);
});

it('preserves exact official lookup for a normalized hyphenated slug', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [{ broadcaster_user_id: 100, slug: 'streamer-123' }] }))
    .mockResolvedValueOnce(json({ data: [{ user_id: 100, name: 'Synthetic Creator' }] }));
  const { getKickChannel } = await import('@/lib/services/kick');
  expect(await getKickChannel('STREAMER-123')).toMatchObject({ slug: 'streamer-123', followers: null });
  expect(String(fetcher.mock.calls[1]?.[0])).toBe('https://api.kick.com/public/v1/channels?slug=streamer-123');
});

it('filters measured audience before its candidate limit and continues past a low-audience page', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [stream(1, 0), stream(2, 19)], pagination: { next_cursor: 'next' } }))
    .mockResolvedValueOnce(json({ data: [stream(3, 20)], pagination: { next_cursor: null } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  const report = await getKickLiveCreatorsReport({ minViewerCount: 20, limit: 1, pageSize: 2, languageCodes: ['es', 'en'] });
  expect(report.items.map(item => [item.userId, item.viewerCount])).toEqual([[3, 20]]);
  expect(report.coverage).toEqual({ status: 'complete', pagesRead: 2, warnings: [] });
  for (const [url] of fetcher.mock.calls.slice(2)) {
    const params = new URL(String(url)).searchParams;
    expect(params.getAll('language_code')).toEqual(['es', 'en']);
    expect(params.get('category_id')).toBe('12');
    expect(params.has('min_viewers')).toBe(false);
  }
});

it.each([
  { category: { id: 99, name: 'Counter-Strike: Source' } },
  { language_code: 'de' },
])('rejects live records outside requested category/language: %j', async mismatch => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [{ ...stream(1), ...mismatch }], pagination: { next_cursor: null } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  const report = await getKickLiveCreatorsReport({ languageCodes: ['es'], minViewerCount: 20 });
  expect(report.items).toEqual([]);
  expect(report.coverage.warnings).toContain('invalid_response');
});

it('does not qualify hidden audience even when an explicit minimum is zero', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [stream(1, 0), stream(2, 1)], pagination: { next_cursor: null } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  expect((await getKickLiveCreatorsReport({ minViewerCount: 0 })).items.map(item => item.userId)).toEqual([2]);
});

it('does not select a similarly named category when the exact category is absent', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [{ id: 99, name: 'Counter-Strike: Source' }], pagination: { next_cursor: null } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  const report = await getKickLiveCreatorsReport({ categoryName: 'Counter-Strike 2' });
  expect(report.items).toEqual([]);
  expect(report.coverage.status).toBe('complete');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it.each([-1, 1.5, Number.NaN])('rejects invalid audience minimum %s before authentication', async minViewerCount => {
  const fetcher = jest.spyOn(global, 'fetch');
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  await expect(getKickLiveCreatorsReport({ minViewerCount })).rejects.toMatchObject({ code: 'invalid_input' });
  expect(fetcher).not.toHaveBeenCalled();
});

it('keeps earlier valid pages when a later response fails', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [stream(1)], pagination: { next_cursor: 'next' } }))
    .mockRejectedValueOnce(new Error('PRIVATE_URL_WITH_TOKEN'));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  const report = await getKickLiveCreatorsReport();
  expect(report.items).toHaveLength(1);
  expect(report.coverage).toEqual({ status: 'partial', pagesRead: 1, warnings: ['request_failed'] });
  expect(JSON.stringify(report)).not.toContain('PRIVATE');
});

it('marks page budget exhausted and does not fetch another page', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [stream(1)], pagination: { next_cursor: 'next' } }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  const report = await getKickLiveCreatorsReport({ maxPages: 1 });
  expect(report.coverage).toMatchObject({ status: 'partial', warnings: ['page_limit'] });
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('rejects invalid metrics instead of coercing null or a negative count into a score', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [{ ...stream(1), viewer_count: null }] }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  expect(await getKickLiveCreatorsReport()).toMatchObject({
    items: [], coverage: { status: 'unavailable', warnings: ['invalid_response'] },
  });
});

it('retains the legacy array entrypoint on the official route', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [stream(1)] }));
  const { getKickCs2LiveCreators } = await import('@/lib/services/kick');
  expect(await getKickCs2LiveCreators()).toHaveLength(1);
});

it('does not call missing pagination a complete live search', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ data: [category] }))
    .mockResolvedValueOnce(json({ data: [stream(1)] }));
  const { getKickLiveCreatorsReport } = await import('@/lib/services/kick');
  expect((await getKickLiveCreatorsReport()).coverage).toEqual({
    status: 'partial', pagesRead: 1, warnings: ['coverage_incomplete'],
  });
});

it('only treats channel-not-found, not user lookup failures, as a missing profile', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [{ broadcaster_user_id: 100, slug: 'creator' }] }))
    .mockResolvedValueOnce(json({}, 404));
  const { getKickChannel } = await import('@/lib/services/kick');
  await expect(getKickChannel('creator')).rejects.toMatchObject({ code: 'request_failed', status: 404 });
});

it('rejects unsafe numeric IDs instead of silently rounding a creator identity', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(token())
    .mockResolvedValueOnce(json({ data: [{ broadcaster_user_id: 9007199254740992, slug: 'creator' }] }));
  const { getKickChannel } = await import('@/lib/services/kick');
  await expect(getKickChannel('creator')).rejects.toMatchObject({ code: 'invalid_response' });
});
