import {
  fetchYouTubeSubscriberCounts,
  fetchYouTubeChannelSnippets,
  searchYouTubeChannels,
  searchYouTubeChannelsFromRecentVideos,
  fetchYouTubeLive,
} from '@/lib/services/youtube';

// ── Helpers ──────────────────────────────────────────────────────────────────

function _mockOk(body: unknown): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

function _mockFail(status: number, text = 'API Error'): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
    text: async () => text,
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.YOUTUBE_API_KEY = 'test-key';
  global.fetch = jest.fn();
});

afterEach(() => {
  delete process.env.YOUTUBE_API_KEY;
  jest.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('youtube service', () => {
  describe('fetchYouTubeLive', () => {
    const CHANNEL_ID = `UC${'a'.repeat(22)}`;

    it('detects live videos through public feeds without consuming search.list quota', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '<feed><yt:videoId>video-live</yt:videoId><yt:videoId>video-offline</yt:videoId></feed>',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [
            {
              id: 'video-live',
              snippet: {
                channelId: CHANNEL_ID,
                title: 'En directo',
                liveBroadcastContent: 'live',
                thumbnails: { high: { url: 'https://example.com/live.jpg' } },
              },
            },
            {
              id: 'video-offline',
              snippet: {
                channelId: CHANNEL_ID,
                title: 'Grabado',
                liveBroadcastContent: 'none',
                thumbnails: {},
              },
            },
          ] }),
          text: async () => '',
        });

      await expect(fetchYouTubeLive([CHANNEL_ID])).resolves.toEqual([{
        channelId: CHANNEL_ID,
        videoId: 'video-live',
        title: 'En directo',
        thumbnailUrl: 'https://example.com/live.jpg',
      }]);

      const urls = (global.fetch as jest.Mock).mock.calls.map(([url]) => String(url));
      expect(urls.some((url) => url.includes('/search?'))).toBe(false);
    });

    it('ignores malformed channel IDs without calling Google', async () => {
      await expect(fetchYouTubeLive(['@handle', 'https://youtube.com/foo'])).resolves.toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('limits each feed to five videos and batches video confirmation', async () => {
      const feed = Array.from({ length: 7 }, (_, i) => `<yt:videoId>video-${i}</yt:videoId>`).join('');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => `<feed>${feed}</feed>` })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [] }), text: async () => '' });

      await expect(fetchYouTubeLive([CHANNEL_ID])).resolves.toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      const videosUrl = String((global.fetch as jest.Mock).mock.calls[1][0]);
      expect(videosUrl).toContain('/videos?');
      expect(videosUrl).toContain('video-4');
      expect(videosUrl).not.toContain('video-5');
    });
  });

  // ── fetchYouTubeSubscriberCounts ──────────────────────────────────────────

  describe('fetchYouTubeSubscriberCounts', () => {
    it('empty array → returns [] without calling fetch', async () => {
      const result = await fetchYouTubeSubscriberCounts([]);
      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('single channel ID → calls fetch once, returns correct subscriber count', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'UC_channel1',
              statistics: { subscriberCount: '1500000', viewCount: '0', videoCount: '0' },
            },
          ],
        }),
        text: async () => '',
      });

      const result = await fetchYouTubeSubscriberCounts(['UC_channel1']);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('UC_channel1');
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('test-key');
      expect(result).toEqual([{ channelId: 'UC_channel1', subscriberCount: 1500000 }]);
    });

    it('channel with hidden subscriber count → omits unknown metric without overwriting it', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'UC_hidden',
              // subscriberCount absent — hidden by creator
              statistics: { viewCount: '999', videoCount: '5' },
            },
          ],
        }),
        text: async () => '',
      });

      const result = await fetchYouTubeSubscriberCounts(['UC_hidden']);

      expect(result).toEqual([]);
    });

    it('API returns non-OK status (403) → throws with status in message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
        text: async () => 'quotaExceeded',
      });

      await expect(fetchYouTubeSubscriberCounts(['UC_channel1'])).rejects.toThrow(
        'YouTube API error (403)',
      );
    });

    it('missing YOUTUBE_API_KEY → throws', async () => {
      delete process.env.YOUTUBE_API_KEY;
      await expect(fetchYouTubeSubscriberCounts(['UC_channel1'])).rejects.toThrow(
        'YOUTUBE_API_KEY is not set',
      );
    });

    it('51 channel IDs → makes 2 fetch calls (batching at 50)', async () => {
      const ids = Array.from({ length: 51 }, (_, i) => `UC_ch${i}`);

      const batchResponse = (batch: string[]) => ({
        ok: true,
        status: 200,
        json: async () => ({
          items: batch.map((id) => ({
            id,
            statistics: { subscriberCount: '100', viewCount: '0', videoCount: '0' },
          })),
        }),
        text: async () => '',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(batchResponse(ids.slice(0, 50)))
        .mockResolvedValueOnce(batchResponse(ids.slice(50)));

      const result = await fetchYouTubeSubscriberCounts(ids);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(51);
      expect(result.every((r) => r.subscriberCount === 100)).toBe(true);
    });
  });

  // ── fetchYouTubeChannelSnippets ───────────────────────────────────────────

  describe('fetchYouTubeChannelSnippets', () => {
    it('empty array → returns []', async () => {
      const result = await fetchYouTubeChannelSnippets([]);
      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns correct snippet data (defaultLanguage, country)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'UC_snip1',
              snippet: { defaultLanguage: 'en', country: 'US' },
            },
            {
              id: 'UC_snip2',
              snippet: { defaultLanguage: 'es' },
            },
          ],
        }),
        text: async () => '',
      });

      const result = await fetchYouTubeChannelSnippets(['UC_snip1', 'UC_snip2']);

      expect(result).toEqual([
        { channelId: 'UC_snip1', defaultLanguage: 'en', country: 'US' },
        { channelId: 'UC_snip2', defaultLanguage: 'es', country: null },
      ]);
    });

    it('snippet missing both fields → nulls for both', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [{ id: 'UC_bare', snippet: {} }],
        }),
        text: async () => '',
      });

      const result = await fetchYouTubeChannelSnippets(['UC_bare']);

      expect(result).toEqual([{ channelId: 'UC_bare', defaultLanguage: null, country: null }]);
    });

    it('51 channel IDs → makes 2 fetch calls (batching at 50)', async () => {
      const ids = Array.from({ length: 51 }, (_, i) => `UC_s${i}`);

      const batchResponse = (batch: string[]) => ({
        ok: true,
        status: 200,
        json: async () => ({
          items: batch.map((id) => ({ id, snippet: { defaultLanguage: 'en', country: 'US' } })),
        }),
        text: async () => '',
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(batchResponse(ids.slice(0, 50)))
        .mockResolvedValueOnce(batchResponse(ids.slice(50)));

      const result = await fetchYouTubeChannelSnippets(ids);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(51);
    });
  });

  // ── searchYouTubeChannels ─────────────────────────────────────────────────

  describe('searchYouTubeChannels', () => {
    it('search returns no results → returns [] without calling getChannelDetails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
        text: async () => '',
      });

      const result = await searchYouTubeChannels('nobody');

      expect(result).toEqual([]);
      // Only the search fetch — no second fetch for channel details
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('search returns results → calls second fetch for channel details, returns combined data', async () => {
      // First fetch: search
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              { id: { channelId: 'UC_found1' } },
              { id: { channelId: 'UC_found2' } },
            ],
          }),
          text: async () => '',
        })
        // Second fetch: getChannelDetails
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'UC_found1',
                snippet: {
                  title: 'Channel One',
                  description: 'Desc one',
                  customUrl: '@channelone',
                  thumbnails: { medium: { url: 'https://img.example.com/1.jpg' } },
                },
                statistics: { subscriberCount: '50000', videoCount: '2', viewCount: '500' },
              },
              {
                id: 'UC_found2',
                snippet: {
                  title: 'Channel Two',
                  description: 'Desc two',
                  customUrl: '@channeltwo',
                  thumbnails: { default: { url: 'https://img.example.com/2.jpg' } },
                },
                statistics: { subscriberCount: '20000', videoCount: '2', viewCount: '500' },
              },
            ],
          }),
          text: async () => '',
        });

      const result = await searchYouTubeChannels('gaming', 5);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        channelId: 'UC_found1',
        handle: 'channelone',
        title: 'Channel One',
        description: 'Desc one',
        thumbnailUrl: 'https://img.example.com/1.jpg',
        subscriberCount: 50000,
      });
      expect(result[1]).toMatchObject({
        channelId: 'UC_found2',
        handle: 'channeltwo',
        thumbnailUrl: 'https://img.example.com/2.jpg',
        subscriberCount: 20000,
      });
    });

    it('search with regionCode and relevanceLanguage → includes them in URL', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [] }),
          text: async () => '',
        });

      await searchYouTubeChannels('test', 5, 'MX', 'es');

      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('regionCode=MX');
      expect(calledUrl).toContain('relevanceLanguage=es');
    });

    it('API error on search → throws', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
        text: async () => 'rateLimitExceeded',
      });

      await expect(searchYouTubeChannels('gaming')).rejects.toThrow(
        'YouTube search API error (429)',
      );
    });
  });

  describe('searchYouTubeChannelsFromRecentVideos', () => {
    it('discovers unique active channels through recent video results', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [
            { snippet: { channelId: 'UC_promise' } },
            { snippet: { channelId: 'UC_promise' } },
          ] }),
          text: async () => '',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [{
            id: 'UC_promise',
            snippet: { title: 'Promise', description: 'CS2', thumbnails: {} },
            statistics: { subscriberCount: '3200', videoCount: '2', viewCount: '500' },
          }] }),
          text: async () => '',
        });

      const result = await searchYouTubeChannelsFromRecentVideos(
        'CS2 gameplay',
        15,
        new Date('2026-06-01T00:00:00Z'),
      );

      expect(result).toHaveLength(1);
      const searchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(searchUrl).toContain('type=video');
      expect(searchUrl).toContain('order=date');
      expect(searchUrl).toContain('publishedAfter=2026-06-01T00%3A00%3A00.000Z');
    });
  });

});
