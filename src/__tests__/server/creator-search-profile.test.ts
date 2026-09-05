import { creatorSearchProfileSchema, DEFAULT_CREATOR_SEARCH_PROFILE } from '@/lib/schemas/creator-search-profile';
import { mergeCreatorObservation, nextCreatorSearchAt, normalizeCreatorAccountKey } from '@/lib/targets/search-profile';
import type { CreatorObservation } from '@/lib/schemas/creator-search-profile';

describe('creator search profiles', () => {
  it('has worldwide configurable criteria, starts paused, not a hardcoded daily query', () => {
    expect(creatorSearchProfileSchema.parse(DEFAULT_CREATOR_SEARCH_PROFILE)).toEqual(DEFAULT_CREATOR_SEARCH_PROFILE);
    expect(DEFAULT_CREATOR_SEARCH_PROFILE.platforms).toHaveLength(4);
    expect(DEFAULT_CREATOR_SEARCH_PROFILE.minRecentVideos).toBe(3);
    expect(DEFAULT_CREATOR_SEARCH_PROFILE.targetMedianViews).toBe(1000);
    expect(nextCreatorSearchAt(DEFAULT_CREATOR_SEARCH_PROFILE, new Date())).toBeNull();
  });
  it('rejects invalid timezones, budgets and extra authority fields', () => {
    for (const invalid of [{ timezone: 'Mars/Now' }, { searchPagesPerDay: 1000 }, { scheduleTime: '25:00' }, { sendEmails: true }]) {
      expect(creatorSearchProfileSchema.safeParse({ ...DEFAULT_CREATOR_SEARCH_PROFILE, ...invalid }).success).toBe(false);
    }
  });
  it('uses local time across daylight-saving transitions', () => {
    const config = { ...DEFAULT_CREATOR_SEARCH_PROFILE, enabled: true };
    expect(nextCreatorSearchAt(config, new Date('2026-09-05T08:00:00Z'))?.toISOString()).toBe('2026-09-06T06:30:00.000Z');
    expect(nextCreatorSearchAt(config, new Date('2026-10-24T08:00:00Z'))?.toISOString()).toBe('2026-10-25T07:30:00.000Z');
  });
  it('preserves case-sensitive YouTube IDs and normalizes handles only', () => {
    expect(normalizeCreatorAccountKey('youtube', 'UCabcdefghijklmnopqrSTUV')).toBe('youtube:UCabcdefghijklmnopqrSTUV');
    expect(normalizeCreatorAccountKey('twitch', '@SomeUser ')).toBe('twitch:someuser');
  });
});

describe('last-good observations', () => {
  const good: CreatorObservation = { value: 1000, source: 'official_api', observed_at: '2026-09-05T06:30:00Z',
    synced_at: '2026-09-05T06:30:00Z', status: 'available', confidence: 'HIGH' };
  it('does not replace data or observation time after a failed refresh', () => {
    const result = mergeCreatorObservation(good, { ...good, value: null, observed_at: null, synced_at: '2026-09-05T07:00:00Z', status: 'error' });
    expect(result.value).toBe(1000); expect(result.observed_at).toBe(good.observed_at);
    expect(result.synced_at).toBe('2026-09-05T07:00:00Z'); expect(result.status).toBe('error');
  });
  it('accepts a genuine zero and keeps absent data null', () => {
    expect(mergeCreatorObservation(good, { ...good, value: 0 }).value).toBe(0);
    expect(mergeCreatorObservation(undefined, { ...good, value: null, status: 'unavailable' }).value).toBeNull();
  });
});
