import {
  isCs2LiveCategory,
  LIVE_AUDIENCE_WINDOW_DAYS,
  liveSampleBucket,
  summarizeLiveAudience,
} from '@/lib/targets/live-audience-samples';
import { kickAudienceSamples, twitchAudienceSamples } from '@/lib/services/creator-live-audience-collector';

const account = { accountId: 7, targetId: 9, externalId: '42', username: 'creator', followers: 10_001,
  qualificationStatus: 'review', fitReasons: [] };
const observedAt = new Date('2026-09-07T10:07:00Z');
const expiresAt = new Date('2026-09-08T10:07:00Z');

it('limits the rolling measurement to the allowed 24-hour cache', () => {
  expect(LIVE_AUDIENCE_WINDOW_DAYS).toBe(1);
});

it('accepts only the verified CS2 category for each provider', () => {
  expect(isCs2LiveCategory('twitch', '32399', 'Counter-Strike')).toBe(true);
  expect(isCs2LiveCategory('twitch', 'other', 'Counter-Strike')).toBe(false);
  expect(isCs2LiveCategory('kick', '', 'Counter-Strike 2')).toBe(true);
  expect(isCs2LiveCategory('kick', '', 'Counter-Strike: Source')).toBe(false);
});

it('deduplicates observations into ten-minute buckets', () => {
  expect(liveSampleBucket(observedAt).toISOString()).toBe('2026-09-07T10:00:00.000Z');
});

it('requires one measured hour, 80 average viewers and 30% of measured time in CS2', () => {
  const start = new Date('2026-09-07T09:00:00Z');
  const samples = Array.from({ length: 10 }, (_, index) => ({
    platform: 'twitch' as const,
    categoryName: index < 3 ? 'Counter-Strike 2' : 'Just Chatting',
    viewerCount: index < 3 ? 70 : 110,
    observedAt: new Date(start.getTime() + index * 600_000),
    streamStartedAt: start,
    source: 'twitch:helix:streams:all-categories-v2',
  }));
  expect(summarizeLiveAudience(samples.slice(0, 5))).toMatchObject({
    averageViewers: null, measuredMinutes: 50, quality: 'insufficient',
  });
  expect(summarizeLiveAudience(samples)).toMatchObject({
    averageViewers: 98, measuredMinutes: 100, cs2MeasuredMinutes: 30,
    cs2ContentShare: 0.3, sampleCount: 10, quality: 'green',
  });
  expect(summarizeLiveAudience(samples.map(sample => ({ ...sample, viewerCount: 79 })))).toMatchObject({
    averageViewers: 79, quality: 'red',
  });
  expect(summarizeLiveAudience(samples.map((sample, index) => ({ ...sample,
    categoryName: index < 2 ? 'Counter-Strike 2' : 'Just Chatting' })))).toMatchObject({
    cs2ContentShare: 0.2, quality: 'red',
  });
  expect(summarizeLiveAudience(samples.map(sample => ({ ...sample,
    source: 'twitch:helix:streams' })))).toMatchObject({
    averageViewers: null, measuredMinutes: 0, quality: 'insufficient',
  });
});

it('maps every active category for known Twitch accounts', () => {
  const samples = twitchAudienceSamples([account], [{
    userId: '42', userLogin: 'creator', gameId: '32399', gameName: 'Counter-Strike',
    title: 'Synthetic', viewerCount: 88, startedAt: new Date('2026-09-07T09:00:00Z'), thumbnailUrl: '',
  }, {
    userId: '42', userLogin: 'creator', gameId: '509658', gameName: 'Just Chatting',
    title: 'Synthetic', viewerCount: 120, startedAt: new Date('2026-09-07T09:00:00Z'), thumbnailUrl: '',
  }, {
    userId: '99', userLogin: 'unknown', gameId: '32399', gameName: 'Counter-Strike',
    title: 'Synthetic', viewerCount: 900, startedAt: new Date('2026-09-07T09:00:00Z'), thumbnailUrl: '',
  }], { observedAt, expiresAt });
  expect(samples).toHaveLength(2);
  expect(samples[0]).toMatchObject({ accountId: 7, viewerCount: 88, platform: 'twitch' });
  expect(samples[1]).toMatchObject({ categoryName: 'Just Chatting' });
});

it('preserves a hidden Kick audience as unknown instead of zero', () => {
  const samples = kickAudienceSamples([account], [{
    userId: 42, username: 'Creator', slug: 'creator', profilePicUrl: null,
    category: 'Counter-Strike 2', language: 'es', title: 'Synthetic', viewerCount: null,
    startedAt: new Date('2026-09-07T09:00:00Z'),
  }], { observedAt, expiresAt });
  expect(samples).toHaveLength(1);
  expect(samples[0]?.viewerCount).toBeNull();
});
