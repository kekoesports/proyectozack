jest.mock('@/lib/env', () => ({
  env: { KICK_CLIENT_ID: 'kick-client', KICK_CLIENT_SECRET: 'kick-secret' },
}));

import { getKickChannel, getKickCs2LiveCreators } from '@/lib/services/kick';

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

  it('accepts the current public payload with string counts and optional fields omitted', async () => {
    const body = {
      id: 1,
      user_id: 100,
      slug: 'current-shape',
      is_banned: false,
      followers_count: '1250',
      banner_image: null,
      user: {
        id: '100',
        username: 'current-shape',
        bio: null,
        profile_pic: null,
      },
      livestream: null,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeResponse(body));

    const result = await getKickChannel('current-shape');

    expect(result?.followers).toBe(1_250);
    expect(result?.country).toBeNull();
    expect(result?.recentCategories).toEqual([]);
    expect(result?.lastLivestreamAt).toBeNull();
  });
});

describe('getKickCs2LiveCreators', () => {
  it('uses the official app token, category and livestream endpoints', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeResponse({ access_token: 'token', expires_in: 3600 }))
      .mockResolvedValueOnce(makeResponse({ data: [{ id: 12, name: 'Counter-Strike 2' }] }))
      .mockResolvedValueOnce(makeResponse({ data: [{
        broadcaster_user: { id: 7, username: 'promise', profile_picture: 'https://img.example/p.jpg' },
        category: { id: 12, name: 'Counter-Strike 2' },
        channel: { slug: 'promise' },
        language_code: 'pt-BR',
        started_at: '2026-08-31T10:00:00Z',
        title: 'Road to global',
        viewer_count: 42,
      }] }));

    const result = await getKickCs2LiveCreators(100);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ slug: 'promise', viewerCount: 42, category: 'Counter-Strike 2' });
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://id.kick.com/oauth/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect((global.fetch as jest.Mock).mock.calls[2][0]).toContain('category_id=12');
  });
});
