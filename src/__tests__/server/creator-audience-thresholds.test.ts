import {
  CREATOR_MINIMUM_FOLLOWERS,
  hasMinimumCreatorFollowers,
  shouldShowCreatorTarget,
} from '@/lib/targets/audience-thresholds';
import { creatorTargetsImportBody } from '@/lib/schemas/creatorTargetsApi';

const youtubeImport = (followers: number) => ({
  batchId: 'creator-2026-09-07-cs2-youtube',
  items: [{
    platform: 'youtube', username: 'UC-synthetic', fullName: 'Synthetic',
    profileUrl: 'https://www.youtube.com/channel/UC-synthetic', profilePicUrl: null,
    followers, following: null, bio: null, externalUrl: null,
    qualificationStatus: 'review', fitScore: 70, fitReasons: [],
    discoveredVia: 'synthetic-test',
  }],
});

describe('creator audience thresholds', () => {
  it('uses the approved minimums for every discovery platform', () => {
    expect(CREATOR_MINIMUM_FOLLOWERS).toEqual({ twitch: 10_000, youtube: 3_000, kick: 2_000 });
    expect(hasMinimumCreatorFollowers('youtube', 2_999)).toBe(false);
    expect(hasMinimumCreatorFollowers('youtube', 3_000)).toBe(true);
    expect(hasMinimumCreatorFollowers('twitch', 10_000)).toBe(false);
    expect(hasMinimumCreatorFollowers('twitch', 10_001)).toBe(true);
    expect(hasMinimumCreatorFollowers('kick', 2_000)).toBe(false);
    expect(hasMinimumCreatorFollowers('kick', 2_001)).toBe(true);
  });

  it('rejects an under-threshold YouTube item at the authenticated import boundary', () => {
    expect(creatorTargetsImportBody.safeParse(youtubeImport(50)).success).toBe(false);
    expect(creatorTargetsImportBody.safeParse(youtubeImport(3_000)).success).toBe(true);
  });

  it('hides known undersized pending leads but preserves commercial history', () => {
    const pending = { platform: 'youtube', followers: 50, status: 'pendiente' } as const;
    expect(shouldShowCreatorTarget(pending)).toBe(false);
    expect(shouldShowCreatorTarget({ ...pending, status: 'contactado' })).toBe(true);
    expect(shouldShowCreatorTarget({ ...pending, followers: null })).toBe(false);
    expect(shouldShowCreatorTarget({ platform: 'twitch', followers: 10_001,
      qualificationStatus: 'review', status: 'pendiente' })).toBe(false);
    expect(shouldShowCreatorTarget({ platform: 'twitch', followers: 10_001,
      qualificationStatus: 'qualified', status: 'pendiente' })).toBe(true);
  });
});
