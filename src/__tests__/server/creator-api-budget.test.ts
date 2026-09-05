import { creatorApiBudget } from '@/lib/targets/creator-api-budget';

describe('creator API reservation classification (pure; not provider quota evidence)', () => {
  const search = 'https://www.googleapis.com/youtube/v3/search';
  const now = new Date('2026-09-05T12:00:00.000Z');

  it('uses conservative search caps independently of general YouTube reads', () => {
    expect(creatorApiBudget(search, 8, now)).toEqual({ platform: 'youtube:search',
      bucketDay: '2026-09-05', globalLimit: 50, profileLimit: 8 });
    expect(creatorApiBudget('https://www.googleapis.com/youtube/v3/videos', 8, now)).toEqual({
      platform: 'youtube:read', bucketDay: '2026-09-05', globalLimit: 5000, profileLimit: 1000 });
  });

  it.each([
    ['2026-09-05T06:59:59.000Z', '2026-09-04'],
    ['2026-09-05T07:00:00.000Z', '2026-09-05'],
    ['2026-01-05T07:59:59.000Z', '2026-01-04'],
    ['2026-01-05T08:00:00.000Z', '2026-01-05'],
  ])('uses the Los Angeles calendar for YouTube at %s', (instant, day) => {
    expect(creatorApiBudget(search, 8, new Date(instant)).bucketDay).toBe(day);
    expect(creatorApiBudget('https://www.googleapis.com/youtube/v3/channels', 8, new Date(instant)).bucketDay).toBe(day);
  });

  it.each([[0, 1], [8.9, 8], [200, 20]])('bounds an internal search cap %s to %s', (input, expected) => {
    expect(creatorApiBudget(search, input, now).profileLimit).toBe(expected);
  });

  it.each([
    ['https://api.twitch.tv/helix/streams', 'twitch:read', 5000, 400],
    ['https://id.twitch.tv/oauth2/token', 'twitch:read', 5000, 400],
    ['https://api.kick.com/public/v1/livestreams', 'kick:read', 5000, 400],
    ['https://id.kick.com/oauth/token', 'kick:read', 5000, 400],
    ['https://graph.facebook.com/v24.0/fixture', 'instagram:read', 200, 200],
    ['https://graph.instagram.com/v24.0/fixture', 'instagram:read', 200, 200],
  ])('classifies %s including auth attempts into UTC internal budgets', (url, platform, globalLimit, profileLimit) => {
    expect(creatorApiBudget(url, 8, new Date('2026-09-05T00:00:00.000Z'))).toEqual({
      platform, bucketDay: '2026-09-05', globalLimit, profileLimit,
    });
  });

  it.each([
    'https://example.invalid/search',
    'https://api.twitch.tv.example.invalid/helix/streams',
    'https://www.googleapis.com/youtube/v30/search',
  ])('rejects an unclassified destination without requesting it: %s', (url) => {
    expect(() => creatorApiBudget(url, 8, now)).toThrow('creator_budget_unknown_provider');
  });

  it('does not make HTTP requests while classifying', () => {
    const spy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('unexpected_http'));
    try { creatorApiBudget(search, 8, now); expect(spy).not.toHaveBeenCalled(); }
    finally { spy.mockRestore(); }
  });
});
