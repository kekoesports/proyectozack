import {
  fetchYouTubeSubscriberCounts,
  fetchYouTubeChannelSnippets,
  searchYouTubeChannels,
  getChannelDetails,
  getChannelAvgViews,
} from '@/lib/services/youtube';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockOk(body: unknown): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

function mockFail(status: number, text = 'API Error'): jest.Mock {
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

    it('channel with hidden subscriber count → returns 0 for that channel', async () => {
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

      expect(result).toEqual([{ channelId: 'UC_hidden', subscriberCount: 0 }]);
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
                statistics: { subscriberCount: '50000' },
              },
              {
                id: 'UC_found2',
                snippet: {
                  title: 'Channel Two',
                  description: 'Desc two',
                  customUrl: '@channeltwo',
                  thumbnails: { default: { url: 'https://img.example.com/2.jpg' } },
                },
                statistics: { subscriberCount: '20000' },
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

  // ── getChannelDetails ─────────────────────────────────────────────────────

  describe('getChannelDetails', () => {
    it('returns channel preview with handle stripped of leading @', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'UC_detail1',
              snippet: {
                title: 'Detail Channel',
                description: 'A description',
                customUrl: '@detailchannel',
                thumbnails: {
                  medium: { url: 'https://img.example.com/med.jpg' },
                  default: { url: 'https://img.example.com/def.jpg' },
                },
              },
              statistics: { subscriberCount: '123456' },
            },
          ],
        }),
        text: async () => '',
      });

      const result = await getChannelDetails(['UC_detail1']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        channelId: 'UC_detail1',
        handle: 'detailchannel',
        title: 'Detail Channel',
        description: 'A description',
        thumbnailUrl: 'https://img.example.com/med.jpg',
        subscriberCount: 123456,
      });
    });

    it('channel without customUrl → handle is null', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'UC_nohandle',
              snippet: {
                title: 'No Handle',
                description: '',
                thumbnails: {},
              },
              statistics: {},
            },
          ],
        }),
        text: async () => '',
      });

      const result = await getChannelDetails(['UC_nohandle']);

      expect(result).toHaveLength(1);
      const ch = result[0];
      expect(ch).toBeDefined();
      expect(ch?.handle).toBeNull();
      expect(ch?.thumbnailUrl).toBeNull();
      expect(ch?.subscriberCount).toBe(0);
    });

    it('falls back to default thumbnail when medium is absent', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'UC_defthumb',
              snippet: {
                title: 'Default Thumb',
                description: '',
                thumbnails: { default: { url: 'https://img.example.com/def.jpg' } },
              },
              statistics: { subscriberCount: '0' },
            },
          ],
        }),
        text: async () => '',
      });

      const result = await getChannelDetails(['UC_defthumb']);

      expect(result).toHaveLength(1);
      expect(result[0]?.thumbnailUrl).toBe('https://img.example.com/def.jpg');
    });

    it('API error → throws with status in message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => 'Internal Server Error',
      });

      await expect(getChannelDetails(['UC_err'])).rejects.toThrow(
        'YouTube channels API error (500)',
      );
    });

    it('empty items array → returns []', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
        text: async () => '',
      });

      const result = await getChannelDetails(['UC_missing']);
      expect(result).toEqual([]);
    });
  });

  // ── getChannelAvgViews ────────────────────────────────────────────────────

  describe('getChannelAvgViews', () => {
    it('channel has no uploads playlist (missing contentDetails) → returns { avgViews: 0, videoCount: 0 }', async () => {
      // getUploadsPlaylistId fetch → items is empty / no uploads key
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
        text: async () => '',
      });

      const result = await getChannelAvgViews('UC_noplaylist');

      expect(result).toEqual({ channelId: 'UC_noplaylist', avgViews: 0, videoCount: 0 });
      // Only 1 fetch — stopped after discovering no playlist
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('channel has playlist but no videos → returns { avgViews: 0, videoCount: 0 }', async () => {
      // Fetch 1: getUploadsPlaylistId
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'UC_empty',
                contentDetails: { relatedPlaylists: { uploads: 'PLempty123' } },
              },
            ],
          }),
          text: async () => '',
        })
        // Fetch 2: getRecentVideoIds → no items
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [] }),
          text: async () => '',
        });

      const result = await getChannelAvgViews('UC_empty');

      expect(result).toEqual({ channelId: 'UC_empty', avgViews: 0, videoCount: 0 });
      // 2 fetches — stopped after discovering no videos
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('channel has videos → returns correct average view count', async () => {
      // Fetch 1: getUploadsPlaylistId
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'UC_active',
                contentDetails: { relatedPlaylists: { uploads: 'PLactive456' } },
              },
            ],
          }),
          text: async () => '',
        })
        // Fetch 2: getRecentVideoIds → 3 videos
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              { snippet: { resourceId: { videoId: 'vid1' } } },
              { snippet: { resourceId: { videoId: 'vid2' } } },
              { snippet: { resourceId: { videoId: 'vid3' } } },
            ],
          }),
          text: async () => '',
        })
        // Fetch 3: getVideoViewCounts → view counts
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              { id: 'vid1', statistics: { viewCount: '3000' } },
              { id: 'vid2', statistics: { viewCount: '6000' } },
              { id: 'vid3', statistics: { viewCount: '9000' } },
            ],
          }),
          text: async () => '',
        });

      const result = await getChannelAvgViews('UC_active');

      // avg = (3000 + 6000 + 9000) / 3 = 6000
      expect(result).toEqual({ channelId: 'UC_active', avgViews: 6000, videoCount: 3 });
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('video with missing viewCount → treated as 0', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'UC_novcount',
                contentDetails: { relatedPlaylists: { uploads: 'PLnovc' } },
              },
            ],
          }),
          text: async () => '',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [{ snippet: { resourceId: { videoId: 'vidA' } } }],
          }),
          text: async () => '',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [{ id: 'vidA', statistics: {} }],
          }),
          text: async () => '',
        });

      const result = await getChannelAvgViews('UC_novcount');

      expect(result).toEqual({ channelId: 'UC_novcount', avgViews: 0, videoCount: 1 });
    });

    it('uses custom count parameter when fetching recent videos', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'UC_count',
                contentDetails: { relatedPlaylists: { uploads: 'PLcount' } },
              },
            ],
          }),
          text: async () => '',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [] }),
          text: async () => '',
        });

      await getChannelAvgViews('UC_count', 5);

      const playlistFetchUrl = (global.fetch as jest.Mock).mock.calls[1][0] as string;
      expect(playlistFetchUrl).toContain('maxResults=5');
    });
  });
});
