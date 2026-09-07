import {
  isCs2LiveCategory,
  liveSampleBucket,
  summarizeLiveAudience,
} from '@/lib/targets/live-audience-samples';
import { kickAudienceSamples, twitchAudienceSamples } from '@/lib/services/creator-live-audience-collector';

const account = { accountId: 7, externalId: '42', username: 'creator' };
const observedAt = new Date('2026-09-07T10:07:00Z');
const expiresAt = new Date('2026-10-07T10:07:00Z');

it('accepts only the verified CS2 category for each provider', () => {
  expect(isCs2LiveCategory('twitch', '32399', 'Counter-Strike')).toBe(true);
  expect(isCs2LiveCategory('twitch', 'other', 'Counter-Strike')).toBe(false);
  expect(isCs2LiveCategory('kick', '', 'Counter-Strike 2')).toBe(true);
  expect(isCs2LiveCategory('kick', '', 'Counter-Strike: Source')).toBe(false);
});

it('deduplicates observations into ten-minute buckets', () => {
  expect(liveSampleBucket(observedAt).toISOString()).toBe('2026-09-07T10:00:00.000Z');
});

it('keeps the result unknown until one measured hour and then applies 70/90 thresholds', () => {
  const start = new Date('2026-09-07T09:00:00Z');
  const samples = Array.from({ length: 6 }, (_, index) => ({
    viewerCount: index < 3 ? 70 : 110,
    observedAt: new Date(start.getTime() + index * 600_000),
    streamStartedAt: start,
  }));
  expect(summarizeLiveAudience(samples.slice(0, 5))).toMatchObject({
    averageViewers: null, measuredMinutes: 50, quality: 'insufficient',
  });
  expect(summarizeLiveAudience(samples)).toEqual({
    averageViewers: 90, measuredMinutes: 60, sampleCount: 6, quality: 'green',
  });
  expect(summarizeLiveAudience(samples.map(sample => ({ ...sample, viewerCount: 70 })))).toMatchObject({
    averageViewers: 70, quality: 'yellow',
  });
});

it('maps only active CS2 streams to known Twitch accounts', () => {
  const samples = twitchAudienceSamples([account], [{
    userId: '42', userLogin: 'creator', gameId: '32399', gameName: 'Counter-Strike',
    title: 'Synthetic', viewerCount: 88, startedAt: new Date('2026-09-07T09:00:00Z'), thumbnailUrl: '',
  }, {
    userId: '99', userLogin: 'unknown', gameId: '32399', gameName: 'Counter-Strike',
    title: 'Synthetic', viewerCount: 900, startedAt: new Date('2026-09-07T09:00:00Z'), thumbnailUrl: '',
  }], { observedAt, expiresAt });
  expect(samples).toHaveLength(1);
  expect(samples[0]).toMatchObject({ accountId: 7, viewerCount: 88, platform: 'twitch' });
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
