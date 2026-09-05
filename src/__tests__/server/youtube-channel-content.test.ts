import {
  getChannelDetails,
  getChannelAvgViews,
} from '@/lib/services/youtube';

// ── Helpers ──────────────────────────────────────────────────────────────────

const upload = (videoId: string, videoPublishedAt: string) => ({
  contentDetails: { videoId, videoPublishedAt },
  snippet: { publishedAt: videoPublishedAt, resourceId: { videoId } },
});

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

describe('youtube channel details and content', () => {
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
              statistics: { subscriberCount: '123456', videoCount: '0', viewCount: '0' },
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
        country: null,
        defaultLanguage: null,
        videoCount: 0,
        viewCount: 0,
        warnings: [],
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
              statistics: { subscriberCount: '0', videoCount: '0', viewCount: '0' },
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
              statistics: { subscriberCount: '0', videoCount: '0', viewCount: '0' },
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
    it('channel has no uploads playlist → unavailable, not observed zero', async () => {
      // getUploadsPlaylistId fetch → items is empty / no uploads key
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
        text: async () => '',
      });

      await expect(getChannelAvgViews('UC_noplaylist')).rejects.toThrow('YouTube playlist unavailable');
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
              upload('vid1', '2026-08-24T10:00:00Z'),
              upload('vid2', '2026-08-23T10:00:00Z'),
              upload('vid3', '2026-08-22T10:00:00Z'),
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

    it('video with missing viewCount → unavailable, not observed zero', async () => {
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
            items: [upload('vidA', '2026-08-24T10:00:00Z')],
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

      await expect(getChannelAvgViews('UC_novcount')).rejects.toThrow('YouTube video coverage unavailable');
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
