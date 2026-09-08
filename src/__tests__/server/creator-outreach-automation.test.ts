const mockSend = jest.fn();
const mockSearch = jest.fn();
const mockDetails = jest.fn();
const mockPerformance = jest.fn();
const mockQueueReview = jest.fn();
const mockRecordQualification = jest.fn();
const mockTwitchSearch = jest.fn();
const mockTwitchDetails = jest.fn();
const mockLiveSamples = jest.fn();
const mockKickChannel = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: {
  CREATOR_OUTREACH_AUTO_SEND_ENABLED: true,
  CREATOR_OUTREACH_AUTO_SEND_AFTER: '2026-09-08T00:00:00+02:00',
  CREATOR_OUTREACH_BOOKING_URL: 'https://calendar.app.google/test-socialpro',
} }));
jest.mock('@/lib/email/creatorOutreach', () => ({ sendCreatorOutreach: (...args: unknown[]) => mockSend(...args) }));
jest.mock('@/lib/queries/creatorOutreach', () => ({
  queueCreatorOutreachReview: (...args: unknown[]) => mockQueueReview(...args),
  recordCreatorOutreachQualification: (...args: unknown[]) => mockRecordQualification(...args),
}));
jest.mock('@/lib/queries/creatorLiveAudienceSamples', () => ({
  getRecentLiveAudienceSamplesByExternalIds: (...args: unknown[]) => mockLiveSamples(...args),
}));
jest.mock('@/lib/services/twitch', () => ({
  searchTwitchChannels: (...args: unknown[]) => mockTwitchSearch(...args),
  getTwitchChannelInfo: (...args: unknown[]) => mockTwitchDetails(...args),
}));
jest.mock('@/lib/services/kick', () => ({
  getKickChannel: (...args: unknown[]) => mockKickChannel(...args),
}));
jest.mock('@/lib/services/youtube', () => ({
  searchYouTubeChannels: (...args: unknown[]) => mockSearch(...args),
  getChannelDetails: (...args: unknown[]) => mockDetails(...args),
  getChannelRecentPerformance: (...args: unknown[]) => mockPerformance(...args),
}));

import { processCreatorOutreachAutomation, qualifyCreatorApplication } from '@/lib/email/creatorOutreachAutomation';
import type { InboundCreatorApplication } from '@/lib/queries/inboundCreatorApplications';

function application(overrides: Partial<InboundCreatorApplication> = {}): InboundCreatorApplication {
  return {
    sourceId: 'creator:101', createdAt: new Date('2026-09-08T10:00:00+02:00'),
    name: 'Persona TEST', email: 'delivered@resend.dev', country: 'ES',
    declaredPlatform: 'YouTube', declaredHandle: 'https://youtube.com/@persona_test',
    declaredContent: 'CS2', declaredAudience: '5000', declaredAverageAudience: '2000',
    otherLinks: null, message: null, outreachStatus: 'not_contacted', lastContactAt: null,
    replySummary: null, ...overrides,
  };
}

const channel = {
  channelId: 'UC1234567890123456789012', handle: 'persona_test', title: 'Persona TEST',
  description: 'CS2', thumbnailUrl: null, subscriberCount: 5_000, country: 'ES',
  defaultLanguage: 'es', videoCount: 20, viewCount: 200_000,
};
const performance = {
  channelId: channel.channelId, windowDays: 90, videoCount: 4, minViews: 1_100,
  avgViews: 2_000, medianViews: 1_500, videosAtOrAbove1000: 4,
  lastVideoAt: new Date('2026-09-01T10:00:00Z'), excludedShortCount: 12,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockResolvedValue([channel]);
  mockDetails.mockResolvedValue([channel]);
  mockPerformance.mockResolvedValue(performance);
  mockSend.mockResolvedValue({ providerEmailId: 'email_test', duplicate: false, replyTracking: true });
  mockQueueReview.mockResolvedValue(undefined);
  mockRecordQualification.mockResolvedValue(undefined);
  mockTwitchSearch.mockResolvedValue([{ broadcasterId: 'tw-1', login: 'test' }]);
  mockTwitchDetails.mockResolvedValue([{ broadcasterId: 'tw-1', login: 'test', followerCount: 10_001 }]);
  const start = new Date('2026-09-08T08:00:00Z');
  mockLiveSamples.mockResolvedValue(new Map([['tw-1', Array.from({ length: 10 }, (_, index) => ({
    platform: 'twitch', categoryName: index < 3 ? 'Counter-Strike 2' : 'Just Chatting',
    viewerCount: 80, observedAt: new Date(start.getTime() + index * 600_000), streamStartedAt: start,
    source: 'twitch:helix:streams:all-categories-v2',
  }))]]));
  mockKickChannel.mockResolvedValue({ slug: 'test', followers: null });
});

it('clasifica verde usando solo vídeos largos y actividad reciente', async () => {
  await expect(qualifyCreatorApplication(application(), new Date('2026-09-08T10:00:00Z')))
    .resolves.toEqual({ decision: 'green', reason: expect.stringContaining('Shorts excluidos') });
});

it('clasifica amarillo un YouTube verificado e inactivo, aunque tenga Shorts', async () => {
  mockPerformance.mockResolvedValue({ ...performance, videoCount: 0, medianViews: 0, lastVideoAt: null, excludedShortCount: 30 });
  await expect(qualifyCreatorApplication(application())).resolves.toMatchObject({
    decision: 'yellow', reason: expect.stringContaining('Shorts no cuentan'),
  });
});

it('clasifica Twitch con seguidores, media y porcentaje CS2 verificados', async () => {
  await expect(qualifyCreatorApplication(application({ declaredPlatform: 'Twitch', declaredHandle: 'https://twitch.tv/test' })))
    .resolves.toMatchObject({ decision: 'green', reason: expect.stringContaining('30% de CS2') });
  mockTwitchDetails.mockResolvedValue([{ broadcasterId: 'tw-1', login: 'test', followerCount: 10_000 }]);
  await expect(qualifyCreatorApplication(application({ declaredPlatform: 'Twitch', declaredHandle: 'https://twitch.tv/test' })))
    .resolves.toMatchObject({ decision: 'red', reason: expect.stringContaining('no supera el mínimo') });
});

it('mantiene en revisión Twitch sin histórico completo y Kick sin seguidores oficiales', async () => {
  mockLiveSamples.mockResolvedValue(new Map());
  await expect(qualifyCreatorApplication(application({ declaredPlatform: 'Twitch', declaredHandle: 'https://twitch.tv/test' })))
    .resolves.toMatchObject({ decision: 'yellow' });
  await expect(qualifyCreatorApplication(application({ declaredPlatform: 'Kick', declaredHandle: 'https://kick.com/test' })))
    .resolves.toMatchObject({ decision: 'yellow' });
});

it('no infiere plataformas ni identidades desde dominios falsos que contienen el nombre del proveedor', async () => {
  await expect(qualifyCreatorApplication(application({
    declaredPlatform: 'Otra', declaredHandle: 'https://example.test/youtube.com/@persona_test',
    otherLinks: 'https://example.test/kick.com/test',
  }))).resolves.toMatchObject({ decision: 'yellow' });
  await expect(qualifyCreatorApplication(application({
    declaredPlatform: 'Twitch', declaredHandle: 'https://example.test/twitch.tv/test',
  }))).resolves.toMatchObject({ decision: 'yellow', reason: expect.stringContaining('identidad inequívoca') });
  expect(mockSearch).not.toHaveBeenCalled();
  expect(mockTwitchSearch).not.toHaveBeenCalled();
});

it('envía verde desde el flujo automático con booking e idempotencia estable', async () => {
  const first = await processCreatorOutreachAutomation([application()]);
  expect(first).toMatchObject({ eligible: 1, greenSent: 1, redSent: 0, yellowReview: 0 });
  const input = mockSend.mock.calls[0]?.[0];
  expect(input).toMatchObject({ sourceType: 'creator_application', sourceId: 101 });
  expect(input.body).toContain('https://calendar.app.google/test-socialpro');
  expect(input.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  expect(mockRecordQualification).toHaveBeenCalledWith(expect.objectContaining({ decision: 'green' }));
  await processCreatorOutreachAutomation([application()]);
  expect(mockSend.mock.calls[1]?.[0].idempotencyKey).toBe(input.idempotencyKey);
});

it('no procesa historial ni envía amarillo', async () => {
  mockLiveSamples.mockResolvedValue(new Map());
  const result = await processCreatorOutreachAutomation([
    application({ createdAt: new Date('2026-09-01T10:00:00Z') }),
    application({ sourceId: 'creator:102', declaredPlatform: 'Twitch', declaredHandle: 'test' }),
  ]);
  expect(result).toMatchObject({ eligible: 1, yellowReview: 1, greenSent: 0, redSent: 0 });
  expect(mockSend).not.toHaveBeenCalled();
  expect(mockQueueReview).toHaveBeenCalledTimes(1);
});

it('deja en amarillo una candidatura si falla la verificación externa', async () => {
  mockSearch.mockRejectedValue(new Error('youtube-api-unavailable'));
  const result = await processCreatorOutreachAutomation([application()]);
  expect(result).toEqual({
    eligible: 1, greenSent: 0, redSent: 0, yellowReview: 1, duplicates: 0, errors: 0,
  });
  expect(mockSend).not.toHaveBeenCalled();
  expect(mockQueueReview).toHaveBeenCalledWith(expect.objectContaining({
    sourceType: 'creator_application', sourceId: 101,
  }));
});
