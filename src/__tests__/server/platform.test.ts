import {
  normalizePlatform,
  normalizeTrackablePlatform,
  getSocialPlatformKey,
  platformMatchesKey,
} from '@/lib/utils/platform';

describe('normalizePlatform', () => {
  describe('known aliases → canonical name', () => {
    it('maps yt → youtube', () => {
      expect(normalizePlatform('yt')).toBe('youtube');
    });

    it('maps tw → twitch', () => {
      expect(normalizePlatform('tw')).toBe('twitch');
    });

    it('maps twitter → x', () => {
      expect(normalizePlatform('twitter')).toBe('x');
    });

    it('maps ig → instagram', () => {
      expect(normalizePlatform('ig')).toBe('instagram');
    });

    it('maps tt → tiktok', () => {
      expect(normalizePlatform('tt')).toBe('tiktok');
    });
  });

  describe('canonical names pass through unchanged', () => {
    it('maps youtube → youtube', () => {
      expect(normalizePlatform('youtube')).toBe('youtube');
    });

    it('maps twitch → twitch', () => {
      expect(normalizePlatform('twitch')).toBe('twitch');
    });

    it('maps x → x', () => {
      expect(normalizePlatform('x')).toBe('x');
    });

    it('maps instagram → instagram', () => {
      expect(normalizePlatform('instagram')).toBe('instagram');
    });

    it('maps tiktok → tiktok', () => {
      expect(normalizePlatform('tiktok')).toBe('tiktok');
    });

    it('maps kick → kick', () => {
      expect(normalizePlatform('kick')).toBe('kick');
    });
  });

  describe('case-insensitive matching', () => {
    it('maps YouTube → youtube', () => {
      expect(normalizePlatform('YouTube')).toBe('youtube');
    });

    it('maps TWITCH → twitch', () => {
      expect(normalizePlatform('TWITCH')).toBe('twitch');
    });

    it('maps IG → instagram', () => {
      expect(normalizePlatform('IG')).toBe('instagram');
    });

    it('maps YT → youtube', () => {
      expect(normalizePlatform('YT')).toBe('youtube');
    });

    it('maps TT → tiktok', () => {
      expect(normalizePlatform('TT')).toBe('tiktok');
    });
  });

  describe('unknown strings → undefined', () => {
    it('returns undefined for empty string', () => {
      expect(normalizePlatform('')).toBeUndefined();
    });

    it('returns undefined for completely unknown platform', () => {
      expect(normalizePlatform('facebook')).toBeUndefined();
    });

    it('returns undefined for gibberish', () => {
      expect(normalizePlatform('xyz123')).toBeUndefined();
    });
  });
});

describe('normalizeTrackablePlatform', () => {
  describe('trackable platforms resolve correctly', () => {
    it('maps yt → youtube (short key → trackable canonical)', () => {
      expect(normalizeTrackablePlatform('yt')).toBe('youtube');
    });

    it('maps youtube → youtube (canonical passes through)', () => {
      expect(normalizeTrackablePlatform('youtube')).toBe('youtube');
    });

    it('maps twitch → twitch (canonical passes through)', () => {
      expect(normalizeTrackablePlatform('twitch')).toBe('twitch');
    });

    it('maps tw → twitch (short key → trackable canonical)', () => {
      expect(normalizeTrackablePlatform('tw')).toBe('twitch');
    });
  });

  describe('non-trackable platforms → undefined', () => {
    it('returns undefined for instagram', () => {
      expect(normalizeTrackablePlatform('instagram')).toBeUndefined();
    });

    it('returns undefined for ig', () => {
      expect(normalizeTrackablePlatform('ig')).toBeUndefined();
    });

    it('returns undefined for tiktok', () => {
      expect(normalizeTrackablePlatform('tiktok')).toBeUndefined();
    });

    it('returns undefined for x', () => {
      expect(normalizeTrackablePlatform('x')).toBeUndefined();
    });

    it('returns undefined for kick', () => {
      expect(normalizeTrackablePlatform('kick')).toBeUndefined();
    });
  });

  describe('unknown strings → undefined', () => {
    it('returns undefined for unknown platform', () => {
      expect(normalizeTrackablePlatform('facebook')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(normalizeTrackablePlatform('')).toBeUndefined();
    });
  });
});

describe('getSocialPlatformKey', () => {
  describe('canonical names → short social key (talentMetricSnapshots → talentSocials bridge)', () => {
    it('maps youtube → yt', () => {
      expect(getSocialPlatformKey('youtube')).toBe('yt');
    });

    it('maps twitch → twitch', () => {
      expect(getSocialPlatformKey('twitch')).toBe('twitch');
    });

    it('maps instagram → ig', () => {
      expect(getSocialPlatformKey('instagram')).toBe('ig');
    });

    it('maps tiktok → tt', () => {
      expect(getSocialPlatformKey('tiktok')).toBe('tt');
    });

    it('maps x → x', () => {
      expect(getSocialPlatformKey('x')).toBe('x');
    });

    it('maps kick → kick', () => {
      expect(getSocialPlatformKey('kick')).toBe('kick');
    });
  });

  describe('aliases also resolve to the correct short key', () => {
    it('maps yt → yt (short key round-trips)', () => {
      expect(getSocialPlatformKey('yt')).toBe('yt');
    });

    it('maps tw → twitch (tw alias resolves to twitch key)', () => {
      expect(getSocialPlatformKey('tw')).toBe('twitch');
    });

    it('maps ig → ig (short key round-trips)', () => {
      expect(getSocialPlatformKey('ig')).toBe('ig');
    });

    it('maps tt → tt (short key round-trips)', () => {
      expect(getSocialPlatformKey('tt')).toBe('tt');
    });

    it('maps twitter → x', () => {
      expect(getSocialPlatformKey('twitter')).toBe('x');
    });
  });

  describe('unknown strings → undefined', () => {
    it('returns undefined for unknown platform', () => {
      expect(getSocialPlatformKey('facebook')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getSocialPlatformKey('')).toBeUndefined();
    });
  });
});

describe('platformMatchesKey', () => {
  describe('matching pairs → true', () => {
    it('youtube matches yt', () => {
      expect(platformMatchesKey('youtube', 'yt')).toBe(true);
    });

    it('yt matches yt (short key matches itself)', () => {
      expect(platformMatchesKey('yt', 'yt')).toBe(true);
    });

    it('twitch matches twitch', () => {
      expect(platformMatchesKey('twitch', 'twitch')).toBe(true);
    });

    it('tw matches twitch (alias matches key)', () => {
      expect(platformMatchesKey('tw', 'twitch')).toBe(true);
    });

    it('instagram matches ig', () => {
      expect(platformMatchesKey('instagram', 'ig')).toBe(true);
    });

    it('ig matches ig (short key matches itself)', () => {
      expect(platformMatchesKey('ig', 'ig')).toBe(true);
    });

    it('tiktok matches tt', () => {
      expect(platformMatchesKey('tiktok', 'tt')).toBe(true);
    });

    it('twitter matches x', () => {
      expect(platformMatchesKey('twitter', 'x')).toBe(true);
    });
  });

  describe('non-matching pairs → false', () => {
    it('youtube does not match twitch', () => {
      expect(platformMatchesKey('youtube', 'twitch')).toBe(false);
    });

    it('instagram does not match yt', () => {
      expect(platformMatchesKey('instagram', 'yt')).toBe(false);
    });

    it('twitch does not match ig', () => {
      expect(platformMatchesKey('twitch', 'ig')).toBe(false);
    });

    it('youtube does not match ig', () => {
      expect(platformMatchesKey('youtube', 'ig')).toBe(false);
    });
  });

  describe('unknown platform → false', () => {
    it('returns false for unknown platform string', () => {
      expect(platformMatchesKey('facebook', 'yt')).toBe(false);
    });

    it('returns false for empty platform string', () => {
      expect(platformMatchesKey('', 'yt')).toBe(false);
    });

    it('returns false for unknown platform with unknown key', () => {
      expect(platformMatchesKey('facebook', 'fb')).toBe(false);
    });
  });
});
