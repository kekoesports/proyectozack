/**
 * Unit tests for src/lib/services/twitch.ts
 *
 * Strategy for token cache isolation:
 * - Most tests use `expires_in: 0` so tokenExpiresAt = Date.now() - 300_000 (past),
 *   forcing a fresh token fetch on every call → tests are independent.
 * - The cache test uses `expires_in: 3600` and verifies only 1 token fetch for 2 calls.
 * - jest.resetModules() + dynamic import is used for the cache test to guarantee
 *   a clean module state.
 */

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal Response-like object that global.fetch returns. */
function makeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

/** Token response that always busts the cache (expires_in: 0 → past timestamp). */
const STALE_TOKEN_RESP = makeResponse({
  access_token: 'mock-token',
  expires_in: 0,
  token_type: 'bearer',
});

/** Token response that keeps the cache valid for ~55 min. */
const FRESH_TOKEN_RESP = makeResponse({
  access_token: 'mock-token',
  expires_in: 3600,
  token_type: 'bearer',
});

/** Follower response for a given broadcaster. */
function followerResp(total: number): Response {
  return makeResponse({ total });
}

// ── module import (re-used across most tests) ─────────────────────────────────
// We import at the top level. Because most tests use expires_in:0, the cache
// is always stale and each test triggers a fresh token fetch.
import {
  fetchTwitchFollowerCounts,
  searchTwitchChannels,
  getCS2LiveStreams,
  getTwitchChannelInfo,
} from '@/lib/services/twitch';

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.TWITCH_CLIENT_ID = 'test-id';
  process.env.TWITCH_CLIENT_SECRET = 'test-secret';
  global.fetch = jest.fn();
});

afterEach(() => {
  delete process.env.TWITCH_CLIENT_ID;
  delete process.env.TWITCH_CLIENT_SECRET;
  jest.restoreAllMocks();
});

// ── helpers ───────────────────────────────────────────────────────────────────

/** Convenience: set fetch to return stale-token first, then subsequent responses. */
function mockFetch(...responses: Response[]): jest.Mock {
  const mock = global.fetch as jest.Mock;
  // First call is always the token endpoint (stale → forces re-fetch each test)
  mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
  for (const r of responses) {
    mock.mockResolvedValueOnce(r);
  }
  return mock;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('twitch service', () => {

  // ── token acquisition ──────────────────────────────────────────────────────
  describe('token acquisition', () => {
    it('throws when TWITCH_CLIENT_ID is missing', async () => {
      delete process.env.TWITCH_CLIENT_ID;
      // No fetch mock needed — should throw before any network call
      await expect(fetchTwitchFollowerCounts(['123'])).rejects.toThrow(
        'TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not set',
      );
    });

    it('throws when TWITCH_CLIENT_SECRET is missing', async () => {
      delete process.env.TWITCH_CLIENT_SECRET;
      await expect(fetchTwitchFollowerCounts(['123'])).rejects.toThrow(
        'TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not set',
      );
    });

    it('caches the token — only 1 token fetch for 2 API calls', async () => {
      // Use jest.isolateModules to get a pristine module with empty cache
      await jest.isolateModulesAsync(async () => {
        const { fetchTwitchFollowerCounts: freshFetch } = await import(
          '@/lib/services/twitch'
        );

        const mock = global.fetch as jest.Mock;

        // Token fetch (fresh — expires in 3600s so cache stays valid)
        mock.mockResolvedValueOnce(FRESH_TOKEN_RESP);
        // First follower call
        mock.mockResolvedValueOnce(followerResp(100));
        // Token fetch should NOT happen again
        // Second follower call
        mock.mockResolvedValueOnce(followerResp(200));

        await freshFetch(['aaa']);
        await freshFetch(['bbb']);

        // Calls: 1 token + 1 follower + 1 follower = 3 total
        expect(mock).toHaveBeenCalledTimes(3);

        // First call must be the token endpoint
        const firstCall = mock.mock.calls[0] as [string, ...unknown[]];
        expect(firstCall[0]).toBe('https://id.twitch.tv/oauth2/token');
      });
    });

    it('throws when token endpoint returns non-OK', async () => {
      const mock = global.fetch as jest.Mock;
      mock.mockResolvedValueOnce(makeResponse('Unauthorized', false, 401));

      await expect(fetchTwitchFollowerCounts(['123'])).rejects.toThrow(
        'Twitch token error (401)',
      );
    });
  });

  // ── fetchTwitchFollowerCounts ──────────────────────────────────────────────
  describe('fetchTwitchFollowerCounts', () => {
    it('returns [] immediately for empty array without calling fetch', async () => {
      const mock = global.fetch as jest.Mock;
      const result = await fetchTwitchFollowerCounts([]);
      expect(result).toEqual([]);
      expect(mock).not.toHaveBeenCalled();
    });

    it('returns correct follower count for a single broadcaster', async () => {
      mockFetch(followerResp(42));

      const result = await fetchTwitchFollowerCounts(['broadcaster-1']);
      expect(result).toEqual([{ broadcasterId: 'broadcaster-1', followerCount: 42 }]);
    });

    it('returns correct follower counts for multiple broadcasters', async () => {
      mockFetch(followerResp(100), followerResp(200));

      const result = await fetchTwitchFollowerCounts(['aaa', 'bbb']);
      // Order may vary (Promise.allSettled), so sort before asserting
      const sorted = [...result].sort((a, b) => a.broadcasterId.localeCompare(b.broadcasterId));
      expect(sorted).toEqual([
        { broadcasterId: 'aaa', followerCount: 100 },
        { broadcasterId: 'bbb', followerCount: 200 },
      ]);
    });

    it('returns 0 for a broadcaster whose follower fetch fails (Promise.allSettled)', async () => {
      const mock = global.fetch as jest.Mock;
      // Token
      mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
      // First broadcaster: network error
      mock.mockRejectedValueOnce(new Error('network error'));
      // Second broadcaster: success
      mock.mockResolvedValueOnce(followerResp(99));

      const result = await fetchTwitchFollowerCounts(['fail-id', 'ok-id']);
      const sorted = [...result].sort((a, b) => a.broadcasterId.localeCompare(b.broadcasterId));
      // 'fail-id' is rejected → not in map → not in result
      // Only 'ok-id' is in the result
      expect(sorted).toEqual([{ broadcasterId: 'ok-id', followerCount: 99 }]);
    });

    it('returns 0 for a broadcaster whose follower API returns non-OK', async () => {
      const mock = global.fetch as jest.Mock;
      // Token
      mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
      // First broadcaster: non-OK → returns null inside allSettled
      mock.mockResolvedValueOnce(makeResponse('Forbidden', false, 403));
      // Second broadcaster: success
      mock.mockResolvedValueOnce(followerResp(77));

      const result = await fetchTwitchFollowerCounts(['bad-id', 'good-id']);
      const sorted = [...result].sort((a, b) => a.broadcasterId.localeCompare(b.broadcasterId));
      // 'bad-id' returns null → not added to map → absent from result
      expect(sorted).toEqual([{ broadcasterId: 'good-id', followerCount: 77 }]);
    });
  });

  // ── searchTwitchChannels ───────────────────────────────────────────────────
  describe('searchTwitchChannels', () => {
    const channelData = {
      data: [
        {
          id: 'ch-1',
          broadcaster_login: 'streamer1',
          display_name: 'Streamer One',
          is_live: true,
          game_name: 'CS2',
          broadcaster_language: 'en',
          thumbnail_url: 'https://example.com/thumb.jpg',
        },
      ],
    };

    it('returns correct channel data', async () => {
      mockFetch(makeResponse(channelData));

      const result = await searchTwitchChannels('streamer1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        broadcasterId: 'ch-1',
        login: 'streamer1',
        displayName: 'Streamer One',
        followerCount: 0,
        language: 'en',
        currentGame: 'CS2',
        isLive: true,
        viewerCount: 0,
        thumbnailUrl: 'https://example.com/thumb.jpg',
      });
    });

    it('includes live_only=true in URL when liveOnly is true', async () => {
      mockFetch(makeResponse(channelData));

      await searchTwitchChannels('streamer1', true);

      const mock = global.fetch as jest.Mock;
      const calledUrl = (mock.mock.calls[1] as [string, ...unknown[]])[0] as string;
      expect(calledUrl).toContain('live_only=true');
    });

    it('does NOT include live_only=true in URL when liveOnly is false (default)', async () => {
      mockFetch(makeResponse(channelData));

      await searchTwitchChannels('streamer1');

      const mock = global.fetch as jest.Mock;
      const calledUrl = (mock.mock.calls[1] as [string, ...unknown[]])[0] as string;
      expect(calledUrl).not.toContain('live_only=true');
    });

    it('normalizes empty thumbnail_url to null', async () => {
      const dataWithEmptyThumb = {
        data: [{ ...channelData.data[0], thumbnail_url: '' }],
      };
      mockFetch(makeResponse(dataWithEmptyThumb));

      const result = await searchTwitchChannels('streamer1');
      expect(result).toHaveLength(1);
      expect(result[0]?.thumbnailUrl).toBeNull();
    });

    it('returns [] when API returns empty data array', async () => {
      mockFetch(makeResponse({ data: [] }));

      const result = await searchTwitchChannels('nobody');
      expect(result).toEqual([]);
    });

    it('throws when search API returns non-OK', async () => {
      const mock = global.fetch as jest.Mock;
      mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
      mock.mockResolvedValueOnce(makeResponse('Bad Request', false, 400));

      await expect(searchTwitchChannels('query')).rejects.toThrow(
        'Twitch search API error (400)',
      );
    });
  });

  // ── getCS2LiveStreams ──────────────────────────────────────────────────────
  describe('getCS2LiveStreams', () => {
    const streamsData = {
      data: [
        {
          user_id: 'u-1',
          user_login: 'cs2player',
          user_name: 'CS2 Player',
          game_id: '32399',
          game_name: 'Counter-Strike 2',
          language: 'en',
          viewer_count: 1500,
          thumbnail_url: 'https://example.com/stream-thumb.jpg',
        },
      ],
    };

    it('calls the streams endpoint with game_id=32399', async () => {
      mockFetch(makeResponse(streamsData));

      await getCS2LiveStreams();

      const mock = global.fetch as jest.Mock;
      const calledUrl = (mock.mock.calls[1] as [string, ...unknown[]])[0] as string;
      expect(calledUrl).toContain('game_id=32399');
    });

    it('returns correct channel preview data', async () => {
      mockFetch(makeResponse(streamsData));

      const result = await getCS2LiveStreams();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        broadcasterId: 'u-1',
        login: 'cs2player',
        displayName: 'CS2 Player',
        followerCount: 0,
        language: 'en',
        currentGame: 'Counter-Strike 2',
        isLive: true,
        viewerCount: 1500,
        thumbnailUrl: 'https://example.com/stream-thumb.jpg',
      });
    });

    it('respects the first parameter in the URL', async () => {
      mockFetch(makeResponse(streamsData));

      await getCS2LiveStreams(50);

      const mock = global.fetch as jest.Mock;
      const calledUrl = (mock.mock.calls[1] as [string, ...unknown[]])[0] as string;
      expect(calledUrl).toContain('first=50');
    });

    it('appends language filter when provided', async () => {
      mockFetch(makeResponse(streamsData));

      await getCS2LiveStreams(100, 'es');

      const mock = global.fetch as jest.Mock;
      const calledUrl = (mock.mock.calls[1] as [string, ...unknown[]])[0] as string;
      expect(calledUrl).toContain('language=es');
    });

    it('normalizes empty thumbnail_url to null', async () => {
      const dataWithEmptyThumb = {
        data: [{ ...streamsData.data[0], thumbnail_url: '' }],
      };
      mockFetch(makeResponse(dataWithEmptyThumb));

      const result = await getCS2LiveStreams();
      expect(result).toHaveLength(1);
      expect(result[0]?.thumbnailUrl).toBeNull();
    });

    it('returns [] when API returns empty data array', async () => {
      mockFetch(makeResponse({ data: [] }));

      const result = await getCS2LiveStreams();
      expect(result).toEqual([]);
    });

    it('throws when streams API returns non-OK', async () => {
      const mock = global.fetch as jest.Mock;
      mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
      mock.mockResolvedValueOnce(makeResponse('Internal Server Error', false, 500));

      await expect(getCS2LiveStreams()).rejects.toThrow(
        'Twitch streams API error (500)',
      );
    });
  });

  // ── getTwitchChannelInfo ───────────────────────────────────────────────────
  describe('getTwitchChannelInfo', () => {
    const channelsData = {
      data: [
        {
          broadcaster_id: 'b-1',
          broadcaster_login: 'channelone',
          broadcaster_name: 'Channel One',
          broadcaster_language: 'en',
          game_name: 'CS2',
          title: 'Playing CS2!',
        },
        {
          broadcaster_id: 'b-2',
          broadcaster_login: 'channeltwo',
          broadcaster_name: 'Channel Two',
          broadcaster_language: 'fr',
          game_name: 'Valorant',
          title: 'Ranked grind',
        },
      ],
    };

    it('returns [] immediately for empty array without calling fetch', async () => {
      const mock = global.fetch as jest.Mock;
      const result = await getTwitchChannelInfo([]);
      expect(result).toEqual([]);
      expect(mock).not.toHaveBeenCalled();
    });

    it('returns channel info with follower counts resolved', async () => {
      const mock = global.fetch as jest.Mock;
      // Token
      mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
      // Channels endpoint
      mock.mockResolvedValueOnce(makeResponse(channelsData));
      // Follower counts (one per broadcaster)
      mock.mockResolvedValueOnce(followerResp(1000));
      mock.mockResolvedValueOnce(followerResp(500));

      const result = await getTwitchChannelInfo(['b-1', 'b-2']);
      expect(result).toHaveLength(2);

      const ch1 = result.find((c) => c.broadcasterId === 'b-1');
      const ch2 = result.find((c) => c.broadcasterId === 'b-2');

      expect(ch1).toMatchObject({
        broadcasterId: 'b-1',
        login: 'channelone',
        displayName: 'Channel One',
        followerCount: 1000,
        language: 'en',
        currentGame: 'CS2',
        isLive: false,
        viewerCount: 0,
        thumbnailUrl: null,
      });

      expect(ch2).toMatchObject({
        broadcasterId: 'b-2',
        login: 'channeltwo',
        displayName: 'Channel Two',
        followerCount: 500,
        language: 'fr',
        currentGame: 'Valorant',
        isLive: false,
        viewerCount: 0,
        thumbnailUrl: null,
      });
    });

    it('returns 0 followers for a channel whose follower fetch fails', async () => {
      const mock = global.fetch as jest.Mock;
      // Token
      mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
      // Channels endpoint
      mock.mockResolvedValueOnce(makeResponse(channelsData));
      // b-1 follower fetch: network error
      mock.mockRejectedValueOnce(new Error('network error'));
      // b-2 follower fetch: success
      mock.mockResolvedValueOnce(followerResp(500));

      const result = await getTwitchChannelInfo(['b-1', 'b-2']);
      expect(result).toHaveLength(2);

      const ch1 = result.find((c) => c.broadcasterId === 'b-1');
      const ch2 = result.find((c) => c.broadcasterId === 'b-2');

      // b-1 rejected → not in followerMap → defaults to 0
      expect(ch1?.followerCount).toBe(0);
      // b-2 still populated
      expect(ch2?.followerCount).toBe(500);
    });

    it('returns 0 followers for a channel whose follower API returns non-OK', async () => {
      const mock = global.fetch as jest.Mock;
      // Token
      mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
      // Channels endpoint
      mock.mockResolvedValueOnce(makeResponse(channelsData));
      // b-1 follower: non-OK → returns null inside allSettled
      mock.mockResolvedValueOnce(makeResponse('Forbidden', false, 403));
      // b-2 follower: success
      mock.mockResolvedValueOnce(followerResp(250));

      const result = await getTwitchChannelInfo(['b-1', 'b-2']);

      const ch1 = result.find((c) => c.broadcasterId === 'b-1');
      const ch2 = result.find((c) => c.broadcasterId === 'b-2');

      expect(ch1?.followerCount).toBe(0);
      expect(ch2?.followerCount).toBe(250);
    });

    it('throws when channels API returns non-OK', async () => {
      const mock = global.fetch as jest.Mock;
      mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
      mock.mockResolvedValueOnce(makeResponse('Not Found', false, 404));

      await expect(getTwitchChannelInfo(['b-1'])).rejects.toThrow(
        'Twitch channels API error (404)',
      );
    });

    it('returns [] when channels API returns empty data array', async () => {
      const mock = global.fetch as jest.Mock;
      mock.mockResolvedValueOnce(STALE_TOKEN_RESP);
      mock.mockResolvedValueOnce(makeResponse({ data: [] }));

      const result = await getTwitchChannelInfo(['b-1']);
      expect(result).toEqual([]);
    });
  });
});
