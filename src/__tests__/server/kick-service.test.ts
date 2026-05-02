import { getKickChannel } from '@/lib/services/kick';

function makeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getKickChannel', () => {
  it('maps a successful response to KickChannelPreview', async () => {
    const body = {
      id: 1,
      user_id: 100,
      slug: 'westcol',
      is_banned: false,
      followers_count: 850000,
      banner_image: { url: 'https://example/banner.jpg' },
      recent_categories: [
        { id: 28, name: 'Counter-Strike 2' },
        { id: 12, name: 'Just Chatting' },
      ],
      user: {
        id: 100,
        username: 'westcol',
        bio: 'Streamer profesional',
        country: 'Colombia',
        profile_pic: 'https://example/pic.jpg',
      },
      livestream: { is_live: true, session_title: 'CS2 ranked' },
      previous_livestreams: [{ created_at: '2026-04-30T10:00:00Z' }],
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeResponse(body));

    const result = await getKickChannel('westcol');

    expect(result).not.toBeNull();
    expect(result?.slug).toBe('westcol');
    expect(result?.username).toBe('westcol');
    expect(result?.followers).toBe(850000);
    expect(result?.country).toBe('Colombia');
    expect(result?.recentCategories).toEqual(['Counter-Strike 2', 'Just Chatting']);
    expect(result?.isLive).toBe(true);
    expect(result?.lastLivestreamAt).toEqual(new Date('2026-04-30T10:00:00Z'));
  });

  it('returns null for 404 (channel not found)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeResponse({}, false, 404),
    );
    expect(await getKickChannel('nonexistent')).toBeNull();
  });

  it('returns null when the channel is banned', async () => {
    const body = {
      id: 1,
      user_id: 100,
      slug: 'banned',
      is_banned: true,
      followers_count: 0,
      banner_image: null,
      recent_categories: null,
      user: { id: 100, username: 'banned', bio: null, country: null, profile_pic: null },
      livestream: null,
      previous_livestreams: null,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeResponse(body));
    expect(await getKickChannel('banned')).toBeNull();
  });

  it('throws on non-404 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeResponse({ message: 'boom' }, false, 500),
    );
    await expect(getKickChannel('any')).rejects.toThrow(/Kick API error \(500\)/);
  });

  it('handles missing previous_livestreams gracefully', async () => {
    const body = {
      id: 1,
      user_id: 100,
      slug: 'newbie',
      is_banned: false,
      followers_count: 50,
      banner_image: null,
      recent_categories: null,
      user: { id: 100, username: 'newbie', bio: null, country: null, profile_pic: null },
      livestream: null,
      previous_livestreams: null,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeResponse(body));

    const result = await getKickChannel('newbie');
    expect(result?.lastLivestreamAt).toBeNull();
    expect(result?.recentCategories).toEqual([]);
    expect(result?.isLive).toBe(false);
  });
});
