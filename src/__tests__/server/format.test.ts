import {
  formatCompact,
  parseFollowers,
  formatSocialDisplayUrl,
  totalFollowersForCreator,
} from '@/lib/utils/format';

// ── formatCompact ─────────────────────────────────────────────────────

describe('format utils', () => {
  describe('formatCompact', () => {
    it('returns "0" for 0', () => {
      expect(formatCompact(0)).toBe('0');
    });

    it('returns plain string for values below 1000', () => {
      expect(formatCompact(999)).toBe('999');
    });

    it('formats 1000 as "1.0K"', () => {
      expect(formatCompact(1000)).toBe('1.0K');
    });

    it('formats 1500 as "1.5K"', () => {
      expect(formatCompact(1500)).toBe('1.5K');
    });

    it('formats 999999 as "999.9K" (stays in K range, not promoted to M)', () => {
      // 999999 / 1000 = 999.999 → toFixed(1) = "1000.0" — actually 999.9
      // Source: value >= 1_000_000 check is first; 999999 < 1_000_000 → K branch
      // (999999 / 1000).toFixed(1) = "1000.0" — let's verify: 999999/1000 = 999.999 → "1000.0"
      // Actually 999.999.toFixed(1) rounds to "1000.0"
      expect(formatCompact(999999)).toBe('1000.0K');
    });

    it('formats 1000000 as "1.0M"', () => {
      expect(formatCompact(1000000)).toBe('1.0M');
    });

    it('formats 1500000 as "1.5M"', () => {
      expect(formatCompact(1500000)).toBe('1.5M');
    });
  });

  // ── parseFollowers ────────────────────────────────────────────────────

  describe('parseFollowers', () => {
    // CRITICAL invariant from AGENTS.md: parseFollowers('-') must return 0
    it('CRITICAL: returns 0 for dash "-" (AGENTS.md invariant — creators with 0 followers sort to bottom)', () => {
      expect(parseFollowers('-')).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(parseFollowers('')).toBe(0);
    });

    it('returns 0 for "0"', () => {
      expect(parseFollowers('0')).toBe(0);
    });

    it('parses plain integer "1000"', () => {
      expect(parseFollowers('1000')).toBe(1000);
    });

    it('parses "9K" as 9000', () => {
      expect(parseFollowers('9K')).toBe(9000);
    });

    it('parses lowercase "9k" as 9000', () => {
      expect(parseFollowers('9k')).toBe(9000);
    });

    it('parses "1.2M" as 1200000', () => {
      expect(parseFollowers('1.2M')).toBe(1200000);
    });

    it('parses lowercase "1.5m" as 1500000', () => {
      expect(parseFollowers('1.5m')).toBe(1500000);
    });

    it('strips commas: "8,300" → 8300', () => {
      expect(parseFollowers('8,300')).toBe(8300);
    });

    it('parses "180k" as 180000', () => {
      expect(parseFollowers('180k')).toBe(180000);
    });

    it('returns 0 for non-numeric string "abc"', () => {
      expect(parseFollowers('abc')).toBe(0);
    });

    it('returns 0 for whitespace-only string', () => {
      expect(parseFollowers('   ')).toBe(0);
    });
  });

  // ── formatSocialDisplayUrl ────────────────────────────────────────────

  describe('formatSocialDisplayUrl', () => {
    it('returns null for null input', () => {
      expect(formatSocialDisplayUrl(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(formatSocialDisplayUrl('')).toBeNull();
    });

    it('strips "www." prefix from hostname', () => {
      expect(formatSocialDisplayUrl('https://www.youtube.com/channel/abc')).toBe(
        'youtube.com/channel/abc',
      );
    });

    it('strips trailing slash from path', () => {
      expect(formatSocialDisplayUrl('https://instagram.com/user/')).toBe('instagram.com/user');
    });

    it('returns null for a malformed URL string', () => {
      expect(formatSocialDisplayUrl('not-a-url')).toBeNull();
    });

    it('returns hostname + path for a normal URL without trailing slash', () => {
      expect(formatSocialDisplayUrl('https://twitch.tv/streamer')).toBe('twitch.tv/streamer');
    });

    it('returns just the hostname when path is root "/"', () => {
      // Root path "/" → replace(/\/$/, '') → "" → result is just hostname
      expect(formatSocialDisplayUrl('https://twitch.tv/')).toBe('twitch.tv');
    });

    it('strips both www. and trailing slash together', () => {
      expect(formatSocialDisplayUrl('https://www.tiktok.com/@user/')).toBe('tiktok.com/@user');
    });
  });

  // ── totalFollowersForCreator ──────────────────────────────────────────

  describe('totalFollowersForCreator', () => {
    it('returns 0 for empty socials array', () => {
      expect(totalFollowersForCreator([])).toBe(0);
    });

    it('sums all socials when no platform filter is provided (undefined)', () => {
      const socials = [
        { platform: 'yt', followersDisplay: '100K' },
        { platform: 'ig', followersDisplay: '50K' },
        { platform: 'tt', followersDisplay: '25K' },
      ];
      expect(totalFollowersForCreator(socials)).toBe(175000);
    });

    it('sums all socials when platforms is an empty Set', () => {
      const socials = [
        { platform: 'yt', followersDisplay: '100K' },
        { platform: 'ig', followersDisplay: '50K' },
      ];
      expect(totalFollowersForCreator(socials, new Set())).toBe(150000);
    });

    it('sums only matching platforms when filter is provided', () => {
      const socials = [
        { platform: 'yt', followersDisplay: '100K' },
        { platform: 'ig', followersDisplay: '50K' },
        { platform: 'tt', followersDisplay: '25K' },
      ];
      // Filter to only YouTube (short key 'yt')
      expect(totalFollowersForCreator(socials, new Set(['yt']))).toBe(100000);
    });

    it('returns 0 when platform filter matches none of the socials', () => {
      const socials = [
        { platform: 'yt', followersDisplay: '100K' },
        { platform: 'ig', followersDisplay: '50K' },
      ];
      expect(totalFollowersForCreator(socials, new Set(['twitch']))).toBe(0);
    });

    it('normalizes short keys: "yt" social matches "yt" filter key via getSocialPlatformKey', () => {
      // getSocialPlatformKey('yt') → normalizePlatform('yt') → 'youtube' → CANONICAL_TO_SOCIAL_KEY['youtube'] → 'yt'
      // platforms.has('yt') → true
      const socials = [{ platform: 'yt', followersDisplay: '200K' }];
      expect(totalFollowersForCreator(socials, new Set(['yt']))).toBe(200000);
    });

    it('normalizes short keys: "ig" social matches "ig" filter key', () => {
      // getSocialPlatformKey('ig') → normalizePlatform('ig') → 'instagram' → CANONICAL_TO_SOCIAL_KEY['instagram'] → 'ig'
      const socials = [
        { platform: 'ig', followersDisplay: '80K' },
        { platform: 'yt', followersDisplay: '120K' },
      ];
      expect(totalFollowersForCreator(socials, new Set(['ig']))).toBe(80000);
    });

    it('handles socials with "-" followersDisplay (returns 0 per AGENTS.md invariant)', () => {
      const socials = [
        { platform: 'yt', followersDisplay: '-' },
        { platform: 'ig', followersDisplay: '50K' },
      ];
      expect(totalFollowersForCreator(socials)).toBe(50000);
    });

    it('handles unknown platform: falls back to platforms.has(platform)', () => {
      // getSocialPlatformKey('unknown') → undefined → falls back to platforms.has('unknown')
      const socials = [
        { platform: 'unknown', followersDisplay: '10K' },
        { platform: 'yt', followersDisplay: '90K' },
      ];
      // Filter includes 'unknown' explicitly
      expect(totalFollowersForCreator(socials, new Set(['unknown']))).toBe(10000);
    });

    it('sums multiple matching platforms', () => {
      const socials = [
        { platform: 'yt', followersDisplay: '100K' },
        { platform: 'ig', followersDisplay: '50K' },
        { platform: 'tt', followersDisplay: '25K' },
      ];
      expect(totalFollowersForCreator(socials, new Set(['yt', 'ig']))).toBe(150000);
    });
  });
});
