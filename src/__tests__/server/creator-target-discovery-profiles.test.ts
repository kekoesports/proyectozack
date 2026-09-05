import { runCreatorTargetDiscovery } from '@/lib/services/creatorTargetDiscovery';
import { DEFAULT_CREATOR_SEARCH_PROFILE, type CreatorSearchConfig } from '@/lib/schemas/creator-search-profile';
import { getCreatorProviderReadiness } from '@/lib/queries/creatorProviderReadiness';
import { startCreatorDiscoveryRun, finishCreatorDiscoveryRun } from '@/lib/queries/creatorDiscoveryRuns';
import { persistDiscoveredCreator } from '@/lib/queries/creatorIdentity';
import { getChannelRecentPerformanceReport, searchYouTubeChannelsFromRecentVideosReport, type YouTubeChannelPreview } from '@/lib/services/youtube';
import { getGameLiveStreams, searchTwitchGameCategories, fetchTwitchFollowerCountsReport, fetchTwitchUserPhotosReport } from '@/lib/services/twitch';
import { getKickLiveCreatorsReport } from '@/lib/services/kick';
import { creatorDiscoveryStatus } from '@/lib/targets/discovery-result';
import type { ProviderCoverage } from '@/lib/schemas/provider-availability';
import { CREATOR_DISCOVERY_DEADLINE_MS } from '@/lib/services/creator-discovery-deadline';
import { creatorObservationSchema } from '@/lib/schemas/creator-search-profile';
import { createCreatorBudgetGuard } from '@/lib/queries/creatorDiscoveryBudget';

jest.mock('@/lib/queries/creatorProviderReadiness', () => ({ getCreatorProviderReadiness: jest.fn() }));
jest.mock('@/lib/queries/creatorDiscoveryRuns', () => ({ startCreatorDiscoveryRun: jest.fn(), finishCreatorDiscoveryRun: jest.fn() }));
jest.mock('@/lib/queries/creatorIdentity', () => ({ persistDiscoveredCreator: jest.fn() }));
jest.mock('@/lib/queries/creatorDiscoveryBudget', () => ({ createCreatorBudgetGuard: jest.fn() }));
jest.mock('@/lib/services/youtube', () => ({ getChannelRecentPerformanceReport: jest.fn(), searchYouTubeChannelsFromRecentVideosReport: jest.fn() }));
jest.mock('@/lib/services/twitch', () => ({ getGameLiveStreams: jest.fn(), searchTwitchGameCategories: jest.fn(), fetchTwitchFollowerCountsReport: jest.fn(), fetchTwitchUserPhotosReport: jest.fn() }));
jest.mock('@/lib/services/kick', () => ({ getKickLiveCreatorsReport: jest.fn() }));

const complete: ProviderCoverage = { status: 'complete', pagesRead: 1, warnings: [] };
const config = (extra: Partial<CreatorSearchConfig> = {}): CreatorSearchConfig => ({
  ...DEFAULT_CREATOR_SEARCH_PROFILE, keywords: ['Valorant'], platforms: ['youtube'], searchPagesPerDay: 3, ...extra,
});
const channel = (extra: Partial<YouTubeChannelPreview> = {}): YouTubeChannelPreview => ({
  channelId: 'UC-synthetic', title: 'Synthetic creator', handle: null, description: 'Valorant creator',
  subscriberCount: null, viewCount: null, videoCount: null, country: null,
  defaultLanguage: null, thumbnailUrl: null, ...extra,
});
const performance = (extra = {}) => ({
  channelId: 'UC-synthetic', windowDays: 90, videoCount: 3, minViews: 2, avgViews: 1400,
  medianViews: 1500, videosAtOrAbove1000: 2, lastVideoAt: new Date('2026-08-01T00:00:00Z'), ...extra,
});
function noProviders(): void {
  for (const fn of [getChannelRecentPerformanceReport, searchYouTubeChannelsFromRecentVideosReport,
    getGameLiveStreams, searchTwitchGameCategories, fetchTwitchFollowerCountsReport, fetchTwitchUserPhotosReport, getKickLiveCreatorsReport]) expect(fn).not.toHaveBeenCalled();
}
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-05T12:00:00Z'));
  jest.mocked(startCreatorDiscoveryRun).mockResolvedValue(1);
  jest.mocked(finishCreatorDiscoveryRun).mockResolvedValue();
  jest.mocked(persistDiscoveredCreator).mockResolvedValue({ inserted: 1, updated: 0, represented: false, identityReview: false });
  jest.mocked(createCreatorBudgetGuard).mockReturnValue(async () => undefined);
  jest.mocked(getCreatorProviderReadiness).mockResolvedValue(DEFAULT_CREATOR_SEARCH_PROFILE.platforms.map(platform => ({
    platform, ready: true, code: 'READY', message: 'Synthetic fixture authorization',
  })));
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValue({ items: [channel()], coverage: complete });
  jest.mocked(getChannelRecentPerformanceReport).mockResolvedValue({ data: performance(), coverage: complete });
  jest.mocked(fetchTwitchFollowerCountsReport).mockResolvedValue({ items: [], coverage: complete });
  jest.mocked(fetchTwitchUserPhotosReport).mockResolvedValue({ items: [], coverage: complete });
});
afterEach(() => jest.restoreAllMocks());

it('fails closed for every default platform before any provider call when approval is absent', async () => {
  jest.mocked(getCreatorProviderReadiness).mockResolvedValue(DEFAULT_CREATOR_SEARCH_PROFILE.platforms.map(platform => ({
    platform, ready: false, code: 'PROVIDER_APPROVAL_REQUIRED', message: 'Do not collect',
  })));
  const result = await runCreatorTargetDiscovery('scheduled');
  expect(result.status).toBe('failed');
  expect(result.platformResults).toHaveLength(4);
  expect(result.platformResults.every(row => row.status === 'skipped' && row.error !== null)).toBe(true);
  noProviders(); expect(persistDiscoveredCreator).not.toHaveBeenCalled();
});
it('does not fall back to keys or bypass a missing readiness row', async () => {
  jest.mocked(getCreatorProviderReadiness).mockResolvedValue([]);
  expect((await runCreatorTargetDiscovery('manual', config())).platformResults[0]?.warnings).toContain('READINESS_UNAVAILABLE');
  noProviders();
});
it('records an unavailable readiness service without collecting', async () => {
  jest.mocked(getCreatorProviderReadiness).mockRejectedValue(new Error('private-marker'));
  const result = await runCreatorTargetDiscovery('manual', config());
  expect(JSON.stringify(result)).not.toContain('private-marker'); noProviders();
  expect(finishCreatorDiscoveryRun).toHaveBeenCalledTimes(1);
});
it('validates configuration before starting a run', async () => {
  await expect(runCreatorTargetDiscovery('manual', config({ windowDays: -1 }))).rejects.toThrow('invalid_creator_search_config');
  expect(startCreatorDiscoveryRun).not.toHaveBeenCalled(); noProviders();
});
it('uses configured keywords, time window and thresholds, not hardcoded CS2 or worst-video gates', async () => {
  const result = await runCreatorTargetDiscovery('manual', config({ windowDays: 60, targetMedianViews: 1500 }));
  expect(searchYouTubeChannelsFromRecentVideosReport).toHaveBeenCalledWith('Valorant', expect.objectContaining({
    publishedAfter: new Date(Date.now() - 60 * 86_400_000), maxPages: 1,
  }));
  expect(getChannelRecentPerformanceReport).toHaveBeenCalledWith('UC-synthetic', 60);
  expect(result.qualified).toBe(1);
  expect(persistDiscoveredCreator).toHaveBeenCalledWith(expect.objectContaining({ externalId: 'UC-synthetic',
    target: expect.objectContaining({ followers: undefined, minRecentVideoViews: 2, complianceStatus: 'manual-review' }) }));
});
it('does not reintroduce a hidden 45-day or score-60 gate', async () => {
  jest.mocked(getChannelRecentPerformanceReport).mockResolvedValue({ data: performance({ lastVideoAt: new Date('2026-06-01T00:00:00Z') }), coverage: complete });
  expect((await runCreatorTargetDiscovery('manual', config({ windowDays: 120 }))).qualified).toBe(1);
});
it('retains a genuinely observed zero subscriber count', async () => {
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValue({ items: [channel({ subscriberCount: 0 })], coverage: complete });
  await runCreatorTargetDiscovery('manual', config());
  expect(persistDiscoveredCreator).toHaveBeenCalledWith(expect.objectContaining({ target: expect.objectContaining({ followers: 0 }) }));
});
it.each([{ videoCount: 2 }, { medianViews: 999.5 }])('applies the precise configured minimum: %j', async extra => {
  jest.mocked(getChannelRecentPerformanceReport).mockResolvedValue({ data: performance(extra), coverage: complete });
  expect((await runCreatorTargetDiscovery('manual', config())).qualified).toBe(0);
  expect(persistDiscoveredCreator).not.toHaveBeenCalled();
});
it('never qualifies a partial sample even when its median would pass', async () => {
  jest.mocked(getChannelRecentPerformanceReport).mockResolvedValue({ data: performance(), coverage: { status: 'partial', pagesRead: 3, warnings: ['page_limit'] } });
  const result = await runCreatorTargetDiscovery('manual', config());
  expect(result.status).toBe('partial'); expect(result.qualified).toBe(0);
  expect(persistDiscoveredCreator).not.toHaveBeenCalled();
});
it('keeps per-channel failure visible and does not turn it into a zero-view success', async () => {
  jest.mocked(getChannelRecentPerformanceReport).mockResolvedValue({ data: null, coverage: { status: 'unavailable', pagesRead: 0, warnings: ['timeout'] } });
  const result = await runCreatorTargetDiscovery('manual', config());
  expect(result.platformResults[0]).toMatchObject({ status: 'partial', found: 1, warnings: ['timeout'] });
  expect(persistDiscoveredCreator).not.toHaveBeenCalled();
});
it('does not issue enrichment calls after a search rate-limit rejection', async () => {
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValueOnce({ items: [channel()], coverage: complete })
    .mockResolvedValueOnce({ items: [], coverage: { status: 'unavailable', pagesRead: 0, warnings: ['rate_limited'] } });
  const result = await runCreatorTargetDiscovery('manual', config({ keywords: ['Valorant', 'Synthetic', 'Third'] }));
  expect(result.status).toBe('partial');
  expect(searchYouTubeChannelsFromRecentVideosReport).toHaveBeenCalledTimes(2);
  expect(getChannelRecentPerformanceReport).not.toHaveBeenCalled();
});
it('bounds search attempts and audits each channel identity once across keywords', async () => {
  const result = await runCreatorTargetDiscovery('manual', config({ keywords: ['Valorant', 'Synthetic', 'Third'], searchPagesPerDay: 2 }));
  expect(searchYouTubeChannelsFromRecentVideosReport).toHaveBeenCalledTimes(2);
  expect(getChannelRecentPerformanceReport).toHaveBeenCalledTimes(1);
  expect(result.platformResults[0]?.warnings).toContain('search_budget_limit');
});
it('applies explicit country and language only from declared provider data', async () => {
  await runCreatorTargetDiscovery('manual', config({ markets: ['ES'], languages: ['es'] }));
  expect(getChannelRecentPerformanceReport).not.toHaveBeenCalled();
  expect(persistDiscoveredCreator).not.toHaveBeenCalled();
});
it('does not pretend Instagram keywords support global creator discovery', async () => {
  const result = await runCreatorTargetDiscovery('manual', config({ platforms: ['instagram'] }));
  expect(result.platformResults[0]).toMatchObject({ status: 'skipped', warnings: ['KNOWN_PROFESSIONAL_USERNAME_REQUIRED'] }); noProviders();
});
it('rejects an unsupported Twitch country filter before querying providers', async () => {
  const result = await runCreatorTargetDiscovery('manual', config({ platforms: ['twitch'], markets: ['ES'] }));
  expect(result.platformResults[0]?.warnings).toContain('COUNTRY_FILTER_UNAVAILABLE'); noProviders();
});
it('uses the resolved non-CS2 Twitch category and never fabricates absent followers', async () => {
  jest.mocked(searchTwitchGameCategories).mockResolvedValue({ items: [{ id: 'valorant', name: 'Valorant' }], coverage: complete });
  jest.mocked(getGameLiveStreams).mockResolvedValue({ items: [{
    broadcasterId: 'b', streamId: 's', login: 'synthetic', displayName: 'Synthetic', followerCount: null,
    viewerCount: 25, language: 'en', currentGame: 'Valorant', isLive: true, startedAt: '2026-09-05T10:00:00Z', thumbnailUrl: null,
  }], coverage: complete });
  const result = await runCreatorTargetDiscovery('manual', config({ platforms: ['twitch'] }));
  expect(getGameLiveStreams).toHaveBeenCalledWith('valorant', 2, { languageCodes: [], minViewerCount: 20 });
  expect(result.qualified).toBe(1);
  expect(persistDiscoveredCreator).toHaveBeenCalledWith(expect.objectContaining({ externalId: 'b',
    target: expect.objectContaining({ platform: 'twitch', followers: undefined }) }));
});
it('passes a generic category and limits to the Kick report contract', async () => {
  jest.mocked(getKickLiveCreatorsReport).mockResolvedValue({ items: [], coverage: complete });
  const result = await runCreatorTargetDiscovery('manual', config({ platforms: ['kick'], maxCandidatesPerPlatform: 7 }));
  expect(getKickLiveCreatorsReport).toHaveBeenCalledWith({ categoryName: 'Valorant', languageCodes: [], limit: 7, maxPages: 3, minViewerCount: 20 },
    expect.objectContaining({ signal: expect.any(AbortSignal), maxRetries: 0 }));
  expect(result.status).toBe('success');
});
it.each([null, 0, 49])('does not let a large Twitch following bypass the configured live minimum: %s', async viewerCount => {
  jest.mocked(searchTwitchGameCategories).mockResolvedValue({ items: [{ id: '32399', name: 'Counter-Strike' }], coverage: complete });
  jest.mocked(getGameLiveStreams).mockResolvedValue({ items: [{
    broadcasterId: 'b', streamId: 's', login: 'synthetic', displayName: 'Synthetic', followerCount: 100000,
    viewerCount, language: 'es', currentGame: 'Counter-Strike', isLive: true,
    startedAt: '2026-09-05T10:00:00Z', thumbnailUrl: null,
  }], coverage: complete });
  jest.mocked(fetchTwitchFollowerCountsReport).mockResolvedValue({ items: [{ broadcasterId: 'b', followerCount: 100000 }], coverage: complete });
  const result = await runCreatorTargetDiscovery('manual', config({
    platforms: ['twitch'], keywords: ['CS2', 'Counter-Strike 2', 'CS2 skins'], minLiveViewers: 50, languages: ['es'],
  }));
  expect(searchTwitchGameCategories).toHaveBeenCalledTimes(1);
  expect(getGameLiveStreams).toHaveBeenCalledWith('32399', 2, { languageCodes: ['es'], minViewerCount: 50 });
  expect(result.qualified).toBe(0);
  expect(persistDiscoveredCreator).not.toHaveBeenCalled();
});
it.each([
  { category: 'Counter-Strike 2', viewerCount: 49, qualified: 0 },
  { category: 'Counter-Strike 2', viewerCount: 50, qualified: 1 },
  { category: 'Counter-Strike: Source', viewerCount: 500, qualified: 0 },
])('enforces the exact Kick category and custom live threshold: %j', async row => {
  jest.mocked(getKickLiveCreatorsReport).mockResolvedValue({ items: [{
    userId: 7001, username: 'Synthetic', slug: 'synthetic', profilePicUrl: null,
    category: row.category, language: 'en', title: 'Synthetic live', viewerCount: row.viewerCount,
    startedAt: new Date('2026-09-05T10:00:00Z'),
  }], coverage: complete });
  const result = await runCreatorTargetDiscovery('manual', config({ platforms: ['kick'], keywords: ['CS2'], minLiveViewers: 50 }));
  expect(getKickLiveCreatorsReport).toHaveBeenCalledWith(expect.objectContaining({
    categoryName: 'Counter-Strike 2', minViewerCount: 50,
  }), expect.anything());
  expect(result.qualified).toBe(row.qualified);
  expect(persistDiscoveredCreator).toHaveBeenCalledTimes(row.qualified);
});
it('persists partial status, including historical JSON fallback, without a green empty run', () => {
  const row = { platform: 'youtube', found: 0, qualified: 0, inserted: 0, updated: 0, error: null } as const;
  expect(creatorDiscoveryStatus([])).toBe('failed');
  expect(creatorDiscoveryStatus([row])).toBe('success');
  expect(creatorDiscoveryStatus([{ ...row, status: 'partial' }])).toBe('partial');
  expect(creatorDiscoveryStatus([{ ...row, status: 'skipped' }])).toBe('failed');
});
it('stores observed values, source, retrieval time and unknown status against the immutable provider ID', async () => {
  await runCreatorTargetDiscovery('manual', config());
  const saved = jest.mocked(persistDiscoveredCreator).mock.calls[0]?.[0];
  expect(saved?.externalId).toBe('UC-synthetic');
  expect(saved).toEqual(expect.objectContaining({ runId: 1 }));
  expect(saved?.fields.followers).toMatchObject({ value: null, observed_at: null, status: 'unavailable', source: 'youtube:channels.list:subscriberCount' });
  expect(saved?.fields.medianRecentVideoViews).toMatchObject({ value: 1500, status: 'available', confidence: 'MEDIUM' });
  expect(saved?.fields.lastVideoPublishedAt?.value).toBe('2026-08-01T00:00:00.000Z');
  for (const value of Object.values(saved?.fields ?? {})) expect(creatorObservationSchema.safeParse(value).success).toBe(true);
  expect(createCreatorBudgetGuard).toHaveBeenCalledWith('adhoc', 3);
});
it('does not count a represented creator as a new qualified prospect', async () => {
  jest.mocked(persistDiscoveredCreator).mockResolvedValue({ inserted: 0, updated: 0, represented: true, identityReview: false });
  expect((await runCreatorTargetDiscovery('manual', config())).qualified).toBe(0);
});
it('records an identity conflict as partial without pretending an upsert succeeded', async () => {
  jest.mocked(persistDiscoveredCreator).mockResolvedValue({ inserted: 0, updated: 0, represented: false, identityReview: true });
  const result = await runCreatorTargetDiscovery('manual', config());
  expect(result.qualified).toBe(0); expect(result.status).toBe('partial');
  expect(result.platformResults[0]?.warnings).toContain('identity_review_required');
});
it('stops before enrichment or persistence when time expires after a search response', async () => {
  const start = Date.now();
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockImplementation(async () => {
    jest.mocked(Date.now).mockReturnValue(start + CREATOR_DISCOVERY_DEADLINE_MS);
    return { items: [channel()], coverage: complete };
  });
  const result = await runCreatorTargetDiscovery('manual', config());
  expect(result.status).toBe('partial');
  expect(result.platformResults[0]?.warnings).toContain('deadline_exceeded');
  expect(getChannelRecentPerformanceReport).not.toHaveBeenCalled();
  expect(persistDiscoveredCreator).not.toHaveBeenCalled();
});
it('does not persist valid-looking late metrics after the deadline', async () => {
  const start = Date.now();
  jest.mocked(getChannelRecentPerformanceReport).mockImplementation(async () => {
    jest.mocked(Date.now).mockReturnValue(start + CREATOR_DISCOVERY_DEADLINE_MS);
    return { data: performance(), coverage: complete };
  });
  expect((await runCreatorTargetDiscovery('manual', config())).status).toBe('partial');
  expect(persistDiscoveredCreator).not.toHaveBeenCalled();
});
it('awaits an already-started identity write and refuses the next write after expiry', async () => {
  const start = Date.now();
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValue({
    items: [channel(), channel({ channelId: 'UC-second' })], coverage: complete,
  });
  let began: (() => void) | undefined, release: (() => void) | undefined;
  const entered = new Promise<void>(resolve => { began = resolve; });
  jest.mocked(persistDiscoveredCreator).mockImplementationOnce(() => new Promise(resolve => {
    release = () => resolve({ inserted: 1, updated: 0, represented: false, identityReview: false }); began?.();
  }));
  let settled = false;
  const pending = runCreatorTargetDiscovery('manual', config()).finally(() => { settled = true; });
  await entered;
  jest.mocked(Date.now).mockReturnValue(start + CREATOR_DISCOVERY_DEADLINE_MS);
  await Promise.resolve(); expect(settled).toBe(false);
  release?.(); const result = await pending;
  expect(result.inserted).toBe(1); expect(result.status).toBe('partial');
  expect(persistDiscoveredCreator).toHaveBeenCalledTimes(1);
});
it('preserves committed counts when a later atomic identity write fails', async () => {
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValue({ items: [channel(), channel({ channelId: 'UC-second' })], coverage: complete });
  jest.mocked(persistDiscoveredCreator).mockResolvedValueOnce({ inserted: 1, updated: 0, represented: false, identityReview: false })
    .mockRejectedValueOnce(new Error('private-marker'));
  const result = await runCreatorTargetDiscovery('manual', config());
  expect(result.inserted).toBe(1); expect(result.status).toBe('partial');
  expect(result.platformResults[0]?.warnings).toContain('persistence_failed');
  expect(JSON.stringify(result)).not.toContain('private-marker');
});
it('treats durable budget exhaustion as an incomplete run and stops before more reads', async () => {
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValue({ items: [], coverage: {
    status: 'unavailable', pagesRead: 0, warnings: ['budget_exhausted'],
  } });
  const result = await runCreatorTargetDiscovery('manual', config({ keywords: ['Valorant', 'Synthetic'] }));
  expect(result.status).toBe('partial');
  expect(result.platformResults[0]?.warnings).toContain('budget_exhausted');
  expect(searchYouTubeChannelsFromRecentVideosReport).toHaveBeenCalledTimes(1);
  expect(getChannelRecentPerformanceReport).not.toHaveBeenCalled();
  expect(persistDiscoveredCreator).not.toHaveBeenCalled();
});

it('runs the real public enrichment helper before persistence, keeping suggestions review-only', async () => {
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValue({ items: [channel({
    description: 'Valorant creator\nBusiness inquiries: creator@example.com\nManagement: Synthetic Agency\nhttps://twitch.tv/synthetic_creator',
  })], coverage: complete });
  await runCreatorTargetDiscovery('manual', config());
  const saved = jest.mocked(persistDiscoveredCreator).mock.calls[0]?.[0];
  expect(saved?.fields['review:contactEmail']).toMatchObject({ value: 'creator@example.com', confidence: 'MEDIUM',
    source: 'official:youtube:channels.list:snippet.description', status: 'available' });
  expect(saved?.fields['review:management']).toMatchObject({ value: 'Synthetic Agency', confidence: 'MEDIUM' });
  expect(saved?.fields['review:crosslink:twitch:0']).toMatchObject({ value: 'https://www.twitch.tv/synthetic_creator', confidence: 'MEDIUM' });
  expect(saved?.fields['review:requiresReview']?.value).toBe(true);
  expect(saved?.fields['review:autoMerge']?.value).toBe(false);
  expect(saved?.fields['processing:scoring']).toMatchObject({ value: 'socialpro-evidence-1', source: 'crm:scoreCreatorFit' });
  expect(saved?.fields['processing:enrichment']?.value).toBe('public_bio_extracted_for_review');
  expect(saved?.fields['review:contactEmail']?.observed_at).toBe(saved?.fields.publicBio?.observed_at);
  expect(saved?.target.contactEmail).toBeUndefined();
  expect(saved?.target.notes).toBeUndefined();
  expect(saved?.target.fitReasons).toContain('CONTACTABILITY 0/5: Dato no disponible / revisión pendiente');
  expect(saved?.externalId).toBe('UC-synthetic');
  expect(persistDiscoveredCreator).toHaveBeenCalledTimes(1);
});

it('does not infer a professional contact from the channel title or a private biography address', async () => {
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValue({ items: [channel({
    title: 'Business inquiries title@example.com', description: 'Valorant\nPrivate personal contact: private@example.com',
  })], coverage: complete });
  await runCreatorTargetDiscovery('manual', config());
  const saved = jest.mocked(persistDiscoveredCreator).mock.calls[0]?.[0];
  expect(saved?.fields['review:contactEmail']).toMatchObject({ value: null, status: 'unavailable', confidence: 'LOW' });
  expect(saved?.target.contactEmail).toBeUndefined();
});

it('keeps conflicting extracted contacts unknown and makes the ambiguity visible', async () => {
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValue({ items: [channel({
    description: 'Valorant\nBusiness contact: first@example.com\nBusiness contact: second@example.com',
  })], coverage: complete });
  const result = await runCreatorTargetDiscovery('manual', config());
  expect(result.status).toBe('partial');
  expect(result.platformResults[0]?.warnings).toContain('enrichment:ambiguous_professional_email');
  expect(jest.mocked(persistDiscoveredCreator).mock.calls[0]?.[0].fields['review:contactEmail']?.value).toBeNull();
});

it('records absence of a public biography without fabricating an enrichment source', async () => {
  jest.mocked(searchYouTubeChannelsFromRecentVideosReport).mockResolvedValue({ items: [channel({ description: '' })], coverage: complete });
  await runCreatorTargetDiscovery('manual', config());
  const saved = jest.mocked(persistDiscoveredCreator).mock.calls[0]?.[0];
  expect(saved?.fields['processing:enrichment']?.value).toBe('no_public_bio_available');
  expect(saved?.fields['review:contactEmail']).toMatchObject({ value: null, observed_at: null, confidence: 'LOW' });
});

it('retains a Kick live title as an observation, never as a biography or business contact', async () => {
  jest.mocked(getKickLiveCreatorsReport).mockResolvedValue({ items: [{ userId: 7001, username: 'Synthetic', slug: 'synthetic',
    profilePicUrl: null, category: 'Valorant', language: 'en', title: 'Business contact: title@example.com',
    viewerCount: 25, startedAt: new Date('2026-09-05T10:00:00Z') }], coverage: complete });
  await runCreatorTargetDiscovery('manual', config({ platforms: ['kick'] }));
  const saved = jest.mocked(persistDiscoveredCreator).mock.calls[0]?.[0];
  expect(saved?.target.bio).toBeUndefined();
  expect(saved?.target.contactEmail).toBeUndefined();
  expect(saved?.fields.streamTitle).toMatchObject({ value: 'Business contact: title@example.com',
    source: 'official:kick:livestreams:stream_title' });
  expect(saved?.fields['review:contactEmail']?.value).toBeNull();
  expect(saved?.fields['processing:enrichment']?.value).toBe('no_public_bio_available');
  expect(saved?.target.fitReasons).toContain('CONTACTABILITY 0/5: Dato no disponible / revisión pendiente');
});
