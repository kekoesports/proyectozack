import { normalizeContentUrl } from '@/lib/utils/url-normalizer';

describe('normalizeContentUrl', () => {
  // ── YouTube ────────────────────────────────────────────────────────────────

  test('YouTube watch URL — strips tracking params', () => {
    const result = normalizeContentUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=share&feature=share');
    expect(result.isValid).toBe(true);
    expect(result.platform).toBe('youtube');
    expect(result.normalizedUrl).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('YouTube short URL youtu.be — canonicalizes to watch?v=', () => {
    const result = normalizeContentUrl('https://youtu.be/dQw4w9WgXcQ?si=abc123&t=10');
    expect(result.isValid).toBe(true);
    expect(result.platform).toBe('youtube');
    expect(result.normalizedUrl).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('YouTube Shorts — stays as shorts path', () => {
    const result = normalizeContentUrl('https://youtube.com/shorts/dQw4w9WgXcQ');
    expect(result.isValid).toBe(true);
    expect(result.platform).toBe('youtube');
    expect(result.normalizedUrl).toBe('https://youtube.com/shorts/dQw4w9WgXcQ');
  });

  test('Same video, different input forms → same normalized URL (dedup)', () => {
    const a = normalizeContentUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123');
    const b = normalizeContentUrl('https://youtu.be/dQw4w9WgXcQ?si=xyz');
    expect(a.normalizedUrl).toBe(b.normalizedUrl);
  });

  // ── Twitch ─────────────────────────────────────────────────────────────────

  test('Twitch VOD URL — valid', () => {
    const result = normalizeContentUrl('https://www.twitch.tv/videos/1234567890');
    expect(result.isValid).toBe(true);
    expect(result.platform).toBe('twitch');
    expect(result.normalizedUrl).toContain('twitch.tv/videos/1234567890');
  });

  test('Twitch channel URL — valid', () => {
    const result = normalizeContentUrl('https://twitch.tv/pokimane');
    expect(result.isValid).toBe(true);
    expect(result.platform).toBe('twitch');
  });

  // ── Kick ───────────────────────────────────────────────────────────────────

  test('Kick clip URL — valid', () => {
    const result = normalizeContentUrl('https://kick.com/huasopeek/clips/clip_123');
    expect(result.isValid).toBe(true);
    expect(result.platform).toBe('kick');
  });

  // ── Instagram ─────────────────────────────────────────────────────────────

  test('Instagram reel — valid, strips igshid', () => {
    const result = normalizeContentUrl('https://www.instagram.com/reel/ABC123/?igshid=xyz');
    expect(result.isValid).toBe(true);
    expect(result.platform).toBe('instagram');
    expect(result.normalizedUrl).not.toContain('igshid');
  });

  // ── TikTok ─────────────────────────────────────────────────────────────────

  test('TikTok video URL — valid', () => {
    const result = normalizeContentUrl('https://www.tiktok.com/@user/video/1234567890');
    expect(result.isValid).toBe(true);
    expect(result.platform).toBe('tiktok');
  });

  // ── Invalid / unknown ──────────────────────────────────────────────────────

  test('Random text — isValid false, platform other', () => {
    const result = normalizeContentUrl('not a url at all');
    expect(result.isValid).toBe(false);
    expect(result.platform).toBe('other');
  });

  test('Empty string — isValid false', () => {
    const result = normalizeContentUrl('');
    expect(result.isValid).toBe(false);
  });
});
