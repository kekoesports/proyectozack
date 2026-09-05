import { getInstagramDiscoveryCapabilities, lookupInstagramProfessional } from '@/lib/services/instagram';
import type { InstagramDiscoveryConfig } from '@/lib/schemas/instagram-discovery';

const config: InstagramDiscoveryConfig = {
  loginMode: 'facebook', apiVersion: 'v26.0', accessToken: 'SYNTHETIC_SECRET', ownInstagramUserId: '123',
  grantedPermissions: ['instagram_basic', 'instagram_manage_insights', 'pages_read_engagement'],
  pageRoleViaBusinessManager: false,
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const media = (id: string) => ({ id, media_type: 'VIDEO', timestamp: '2026-01-01T10:00:00Z',
  permalink: 'https://www.instagram.com/p/synthetic/', like_count: 0 });
const page = (data: unknown[], after?: string) => ({ business_discovery: {
  id: '456', username: 'creator', media: { data, ...(after ? { paging: { cursors: { after } } } : {}) },
} });
afterEach(() => jest.restoreAllMocks());

it('only enables exact Facebook-login professional discovery, not arbitrary search/insights', () => {
  expect(getInstagramDiscoveryCapabilities(config)).toMatchObject({
    ready: true, exactProfessionalLookup: true, generalProfileSearch: false,
    thirdPartyInsights: false, purposeAndRetentionReviewRequired: true,
  });
});

it.each([
  { ...config, loginMode: 'instagram' as const },
  { ...config, accessToken: undefined },
  { ...config, ownInstagramUserId: undefined },
  { ...config, grantedPermissions: ['instagram_basic'] },
  { ...config, pageRoleViaBusinessManager: true },
])('fails closed before any API call when configuration or permissions are missing', async incomplete => {
  const fetcher = jest.spyOn(global, 'fetch');
  const result = await lookupInstagramProfessional('creator', incomplete);
  expect(result.coverage.status).toBe('unavailable');
  expect(result.capabilities.ready).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});

it('accepts the documented alternative ads permission for a Business Manager page role', () => {
  expect(getInstagramDiscoveryCapabilities({ ...config, pageRoleViaBusinessManager: true,
    grantedPermissions: [...config.grantedPermissions, 'ads_read'] }).ready).toBe(true);
});

it('uses a known username nested under the connected account, token only in header, null != zero', async () => {
  const body = page([media('1')]);
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(json({
    business_discovery: { ...body.business_discovery, followers_count: 0, email: 'PRIVATE_EMAIL' },
  }));
  const result = await lookupInstagramProfessional('CREATOR', config);
  expect(result.coverage).toEqual({ status: 'complete', pagesRead: 1, warnings: [] });
  expect(result.profile).toMatchObject({ username: 'creator', followers: 0, mediaCount: null,
    profilePicUrl: null, country: null, media: [{ likes: 0, comments: null, views: null }] });
  const url = String(fetcher.mock.calls[0]?.[0]);
  expect(url).toMatch(/^https:\/\/graph.facebook.com\/v26.0\/123\?/);
  expect(new URL(url).searchParams.get('fields')).toContain('business_discovery.username(creator)');
  expect(url).not.toContain('SYNTHETIC_SECRET');
  expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual({
    Authorization: 'Bearer SYNTHETIC_SECRET', Accept: 'application/json',
  });
  expect(JSON.stringify(result)).not.toContain('PRIVATE_EMAIL');
});

it('never follows a returned next URL and reconstructs a validated cursor', async () => {
  const first = page([media('1')], 'CURSOR_1=');
  const fetcher = jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce(json({ business_discovery: { ...first.business_discovery,
      media: { ...first.business_discovery.media, paging: { cursors: { after: 'CURSOR_1=' },
        next: 'https://evil.invalid/?access_token=PRIVATE' } } } }))
    .mockResolvedValueOnce(json(page([media('2')])));
  const result = await lookupInstagramProfessional('creator', config);
  expect(result.profile?.media).toHaveLength(2);
  expect(result.coverage.status).toBe('complete');
  expect(new URL(String(fetcher.mock.calls[1]?.[0])).searchParams.get('fields')).toContain('.after(CURSOR_1=)');
  expect(fetcher.mock.calls.every(([url]) => String(url).startsWith('https://graph.facebook.com/'))).toBe(true);
});

it('stops a repeated cursor and deduplicates media', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockImplementation(async () => json(page([media('1')], 'SAME')));
  const result = await lookupInstagramProfessional('creator', config);
  expect(result.profile?.media).toHaveLength(1);
  expect(result.coverage).toEqual({ status: 'partial', pagesRead: 2, warnings: ['duplicate_record', 'repeated_cursor'] });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('reports a page budget, not complete historical statistics', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(json(page([media('1')], 'NEXT')));
  const result = await lookupInstagramProfessional('creator', config, { maxPages: 1 });
  expect(result.coverage).toMatchObject({ status: 'partial', warnings: ['page_limit'] });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('preserves a valid first page if a later response is forbidden, without response text', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(json(page([media('1')], 'NEXT')))
    .mockResolvedValueOnce(json({ error: { message: 'PRIVATE_TOKEN' } }, 403));
  const result = await lookupInstagramProfessional('creator', config);
  expect(result.profile?.media).toHaveLength(1);
  expect(result.error).toEqual({ code: 'forbidden', status: 403 });
  expect(result.coverage.status).toBe('partial');
  expect(JSON.stringify(result)).not.toContain('PRIVATE_TOKEN');
});

it.each(['creator){private}', 'https://instagram.com/creator', ''])('rejects an unsafe username without API calls', async username => {
  const fetcher = jest.spyOn(global, 'fetch');
  expect((await lookupInstagramProfessional(username, config)).error?.code).toBe('invalid_input');
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  { business_discovery: null },
  { business_discovery: { ...page([]).business_discovery, username: 'other' } },
  { business_discovery: { ...page([]).business_discovery, followers_count: -1 } },
  page([media('1')], 'bad){private}'),
])('treats unavailable or invalid remote profiles as unknown, not a healthy empty catalog', async body => {
  jest.spyOn(global, 'fetch').mockResolvedValue(json(body));
  const result = await lookupInstagramProfessional('creator', config);
  expect(result.coverage.status).toBe('unavailable');
  expect(result.profile).toBeNull();
});

it('does not combine two different profile IDs across pages', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(json(page([media('1')], 'NEXT')))
    .mockResolvedValueOnce(json({ business_discovery: { ...page([media('2')]).business_discovery, id: '999' } }));
  const result = await lookupInstagramProfessional('creator', config);
  expect(result.coverage.status).toBe('partial');
  expect(result.error?.code).toBe('invalid_response');
  expect(result.profile?.media).toHaveLength(1);
});
