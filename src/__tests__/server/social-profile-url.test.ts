import { normalizeSocialProfileUrl, normalizeTwitchLogin } from '@/lib/utils/social-profile-url';

describe('normalizeSocialProfileUrl', () => {
  it.each([
    ['twitch', 'twitch.tv/horcus', 'horcus', 'https://www.twitch.tv/horcus'],
    ['twitch', 'www.twitch.tv/creator/', 'creator', 'https://www.twitch.tv/creator'],
    ['youtube', 'youtube.com/@creator?utm_source=test', 'creator', 'https://www.youtube.com/@creator'],
    ['youtube', 'https://www.youtube.com/c/imantado', 'imantado', 'https://www.youtube.com/c/imantado'],
    ['youtube', 'https://www.youtube.com/@imanXTRA', 'imanXTRA', 'https://www.youtube.com/@imanXTRA'],
    ['instagram', 'instagram.com/creator/', 'creator', 'https://www.instagram.com/creator'],
    ['tiktok', 'tiktok.com/@creator?lang=es', 'creator', 'https://www.tiktok.com/@creator?lang=es'],
    ['kick', 'kick.com/creator', 'creator', 'https://kick.com/creator'],
    ['x', 'twitter.com/creator', 'creator', 'https://x.com/creator'],
    ['discord', 'discord.gg/example', 'example', 'https://discord.gg/example'],
    ['discord', 'https://discord.com/invite/6mkv82J', '6mkv82J', 'https://discord.com/invite/6mkv82J'],
  ])('%s repairs %s', (platform, profileUrl, handle, expected) => {
    expect(normalizeSocialProfileUrl({ platform, profileUrl, handle })).toBe(expected);
  });

  it.each([
    ['twitch', 'creator', null, 'https://www.twitch.tv/creator'],
    ['youtube', 'creator', null, 'https://www.youtube.com/@creator'],
    ['youtube', 'creator', 'UC1234567890123456789012', 'https://www.youtube.com/channel/UC1234567890123456789012'],
    ['instagram', '@creator', null, 'https://www.instagram.com/creator'],
    ['tiktok', '@creator', null, 'https://www.tiktok.com/@creator'],
    ['kick', 'creator', null, 'https://kick.com/creator'],
    ['x', '@creator', null, 'https://x.com/creator'],
  ])('%s derives a URL from the handle', (platform, handle, platformId, expected) => {
    expect(normalizeSocialProfileUrl({ platform, handle, platformId })).toBe(expected);
  });

  it.each([
    ['twitch', 'javascript:alert(1)'],
    ['twitch', 'https://example.com/creator'],
    ['instagram', 'https://twitch.tv/creator'],
    ['unknown', 'https://example.com/creator'],
  ])('rejects unsafe or mismatched %s URLs', (platform, profileUrl) => {
    expect(normalizeSocialProfileUrl({ platform, profileUrl })).toBeNull();
  });

  it('uses the platform handle instead of a mismatched legacy URL', () => {
    expect(normalizeSocialProfileUrl({
      platform: 'twitch',
      profileUrl: 'https://x.com/creator',
      handle: 'creator',
    })).toBe('https://www.twitch.tv/creator');
  });

  it('does not invent a Discord invite from a display handle', () => {
    expect(normalizeSocialProfileUrl({ platform: 'discord', handle: 'community' })).toBeNull();
  });

  it.each([
    ['horcus', 'horcus'],
    ['https://www.twitch.tv/horcus', 'horcus'],
    ['TWITCH.TV/ZACKETIZORCS2', 'ZACKETIZORCS2'],
    ['https://www.twitch.tv/pela_dego/about', 'pela_dego'],
  ])('normalizes legacy Twitch login %s', (raw, expected) => {
    expect(normalizeTwitchLogin(raw)).toBe(expected);
  });

  it('rejects a Twitch handle from another domain', () => {
    expect(normalizeTwitchLogin('https://example.com/horcus')).toBeNull();
  });
});
