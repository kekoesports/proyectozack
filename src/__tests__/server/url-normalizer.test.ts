import { canonicalEvidenceUrl, normalizeContentUrl } from '@/lib/utils/url-normalizer';

describe('normalizeContentUrl', () => {
  it.each([
    {
      name: 'YouTube watch strips tracking params',
      input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=share&feature=share',
      isValid: true,
      platform: 'youtube',
      normalizedUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    },
    {
      name: 'YouTube youtu.be canonicalizes to watch?v=',
      input: 'https://youtu.be/dQw4w9WgXcQ?si=abc123&t=10',
      isValid: true,
      platform: 'youtube',
      normalizedUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    },
    {
      name: 'YouTube Shorts stays as shorts path',
      input: 'https://youtube.com/shorts/dQw4w9WgXcQ',
      isValid: true,
      platform: 'youtube',
      normalizedUrl: 'https://youtube.com/shorts/dQw4w9WgXcQ',
    },
    {
      name: 'Twitch VOD',
      input: 'https://www.twitch.tv/videos/1234567890',
      isValid: true,
      platform: 'twitch',
      normalizedUrl: 'https://twitch.tv/videos/1234567890',
    },
    {
      name: 'Twitch trailing slash and t= param',
      input: 'https://twitch.tv/vod/1/?utm_source=x&t=123',
      isValid: true,
      platform: 'twitch',
      normalizedUrl: 'https://twitch.tv/vod/1',
    },
    {
      name: 'Kick clip',
      input: 'https://kick.com/huasopeek/clips/clip_123',
      isValid: true,
      platform: 'kick',
      normalizedUrl: 'https://kick.com/huasopeek/clips/clip_123',
    },
    {
      name: 'Instagram reel strips igshid',
      input: 'https://www.instagram.com/reel/ABC123/?igshid=xyz',
      isValid: true,
      platform: 'instagram',
      normalizedUrl: 'https://instagram.com/reel/ABC123',
    },
    {
      name: 'TikTok video',
      input: 'https://www.tiktok.com/@user/video/1234567890',
      isValid: true,
      platform: 'tiktok',
      normalizedUrl: 'https://tiktok.com/@user/video/1234567890',
    },
    {
      name: 'X status is valid evidence (platform other until enum exists)',
      input: 'https://x.com/creator/status/1234567890123456789?s=20',
      isValid: true,
      platform: 'other',
      normalizedUrl: 'https://x.com/creator/status/1234567890123456789',
    },
    {
      name: 'twitter.com canonicalizes to x.com',
      input: 'https://twitter.com/creator/status/1234567890123456789',
      isValid: true,
      platform: 'other',
      normalizedUrl: 'https://x.com/creator/status/1234567890123456789',
    },
    {
      name: 'Google Sheet is not evidence',
      input: 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=0',
      isValid: false,
      platform: 'other',
    },
    {
      name: 'Google Drive is not evidence',
      input: 'https://drive.google.com/file/d/abc123/view',
      isValid: false,
      platform: 'other',
    },
    {
      name: 'bit.ly shortener is not evidence',
      input: 'https://bit.ly/3xYzAbC',
      isValid: false,
      platform: 'other',
    },
    {
      name: 't.co shortener is not evidence',
      input: 'https://t.co/abcd',
      isValid: false,
      platform: 'other',
    },
    {
      name: 'random text',
      input: 'not a url at all',
      isValid: false,
      platform: 'other',
    },
    {
      name: 'empty string',
      input: '',
      isValid: false,
      platform: 'other',
    },
  ])('$name', ({ input, isValid, platform, normalizedUrl }) => {
    const result = normalizeContentUrl(input);
    expect(result.isValid).toBe(isValid);
    expect(result.platform).toBe(platform);
    if (normalizedUrl) expect(result.normalizedUrl).toBe(normalizedUrl);
  });

  test('same YouTube video in different forms dedupes', () => {
    const a = normalizeContentUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123');
    const b = normalizeContentUrl('https://youtu.be/dQw4w9WgXcQ?si=xyz');
    expect(a.normalizedUrl).toBe(b.normalizedUrl);
  });
});

describe('canonicalEvidenceUrl', () => {
  it.each([
    ['https://twitch.tv/vod/1/', 'https://twitch.tv/vod/1'],
    ['https://docs.google.com/spreadsheets/d/abc/edit', null],
    ['https://bit.ly/xyz', null],
    ['   ', null],
  ])('%s → %s', (input, expected) => {
    expect(canonicalEvidenceUrl(input)).toBe(expected);
  });
});
