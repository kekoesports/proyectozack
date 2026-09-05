import { getChannelDetails, getChannelRecentContent, getChannelRecentPerformance } from '@/lib/services/youtube';

jest.mock('@/lib/env', () => ({ env: { YOUTUBE_API_KEY: 'synthetic-key' } }));

const snippet = { title: 'Synthetic channel', description: '' };
const complete = { subscriberCount: '12', videoCount: '2', viewCount: '100' };
const channel = (statistics: unknown, id = 'UC_synthetic') => ({ id, snippet, statistics });
const playlist = { items: [{ id: 'UC_synthetic', contentDetails: { relatedPlaylists: { uploads: 'UU_synthetic' } } }] };
const upload = (videoId = 'video-a') => ({ contentDetails: { videoId, videoPublishedAt: '2026-09-01T12:00:00Z' }, snippet: {
  resourceId: { videoId }, publishedAt: '2026-09-01T12:00:00Z', title: 'Synthetic video',
} });
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-05T12:00:00Z'));
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected synthetic request'));
});
afterEach(() => jest.restoreAllMocks());

describe('YouTube channel availability, not fabricated counters', () => {
  it.each([
    undefined, {}, { subscriberCount: '12' }, { ...complete, hiddenSubscriberCount: true },
    ...['-1', '1.5', '1200oops', 'NaN', '', '9007199254740993'].map(viewCount => ({ ...complete, viewCount })),
  ])('preserves channel identity with a warning for incomplete statistics: %j', async statistics => {
    jest.mocked(fetch).mockResolvedValue(response({ items: [channel(statistics)] }));
    expect(await getChannelDetails(['UC_synthetic'])).toEqual([expect.objectContaining({
      channelId: 'UC_synthetic', warnings: ['metric_unavailable'],
    })]);
  });

  it('keeps complete verified zero counters', async () => {
    jest.mocked(fetch).mockResolvedValue(response({ items: [channel({ subscriberCount: '0', videoCount: '0', viewCount: '0' })] }));
    expect(await getChannelDetails(['UC_synthetic'])).toEqual([expect.objectContaining({
      subscriberCount: 0, videoCount: 0, viewCount: 0,
    })]);
  });

  it('keeps another fully verified channel without filling the missing one', async () => {
    jest.mocked(fetch).mockResolvedValue(response({ items: [channel({}), channel(complete, 'UC_valid')] }));
    expect(await getChannelDetails(['UC_synthetic', 'UC_valid'])).toEqual([
      expect.objectContaining({ channelId: 'UC_synthetic', subscriberCount: null, viewCount: null, videoCount: null }),
      expect.objectContaining({ channelId: 'UC_valid' }),
    ]);
  });

  it('rejects duplicate IDs instead of selecting an arbitrary observation', async () => {
    jest.mocked(fetch).mockResolvedValue(response({ items: [channel(complete), channel({ ...complete, viewCount: '999' })] }));
    await expect(getChannelDetails(['UC_synthetic'])).rejects.toThrow(/coverage|duplicate/i);
  });

  it('accepts the maximum safe integer, deduplicates requested IDs and bounds HTTP', async () => {
    jest.mocked(fetch).mockResolvedValue(response({ items: [channel({ ...complete, viewCount: String(Number.MAX_SAFE_INTEGER) })] }));
    expect(await getChannelDetails(['UC_synthetic', 'UC_synthetic'])).toEqual([expect.objectContaining({ viewCount: Number.MAX_SAFE_INTEGER })]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(jest.mocked(fetch).mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('does not attach a remote error body to a quota/permission error', async () => {
    jest.mocked(fetch).mockResolvedValue(new Response('synthetic-private-marker', { status: 403 }));
    await expect(getChannelDetails(['UC_synthetic'])).rejects.toThrow(/^YouTube channels API error \(403\)$/);
  });
});

describe('YouTube recent content coverage', () => {
  it('does not equate an unavailable uploads playlist with an empty channel', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response({ items: [] }));
    await expect(getChannelRecentContent('UC_synthetic')).rejects.toThrow(/unavailable|coverage/i);
  });

  it('does not qualify a channel with unavailable recent coverage', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response({ items: [] }));
    await expect(getChannelRecentPerformance('UC_synthetic')).rejects.toThrow(/unavailable|coverage/i);
  });

  it('accepts a verified empty playlist, without a statistics request', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist)).mockResolvedValueOnce(response({ items: [] }));
    expect(await getChannelRecentContent('UC_synthetic')).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects a missing playlist items field instead of treating it as zero', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist)).mockResolvedValueOnce(response({}));
    await expect(getChannelRecentContent('UC_synthetic')).rejects.toThrow();
  });

  it.each([{}, { viewCount: '-1' }, { viewCount: '1oops' }, { viewCount: '9007199254740993' }])(
    'rejects unavailable/invalid video views: %j', async statistics => {
      jest.mocked(fetch).mockResolvedValueOnce(response(playlist))
        .mockResolvedValueOnce(response({ items: [upload()] }))
        .mockResolvedValueOnce(response({ items: [{ id: 'video-a', statistics }] }));
      await expect(getChannelRecentContent('UC_synthetic')).rejects.toThrow(/unavailable|coverage/i);
    },
  );

  it('rejects a partial video response rather than silently dropping missing uploads', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist))
      .mockResolvedValueOnce(response({ items: [upload(), upload('video-b')] }))
      .mockResolvedValueOnce(response({ items: [{ id: 'video-a', statistics: { viewCount: '10' } }] }));
    await expect(getChannelRecentContent('UC_synthetic')).rejects.toThrow(/coverage/i);
  });

  it('keeps genuine zero views while absent optional engagement stays null', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist))
      .mockResolvedValueOnce(response({ items: [upload()] }))
      .mockResolvedValueOnce(response({ items: [{ id: 'video-a', statistics: { viewCount: '0' } }] }));
    expect(await getChannelRecentContent('UC_synthetic')).toEqual([expect.objectContaining({ views: 0, likes: null, comments: null })]);
  });

  it('rejects a limited window when an unconsumed page remains', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist))
      .mockResolvedValueOnce(response({ items: [upload()], nextPageToken: 'more' }));
    await expect(getChannelRecentContent('UC_synthetic', 365, 1)).rejects.toThrow(/coverage/i);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid publication dates instead of misclassifying their window', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist)).mockResolvedValueOnce(response({ items: [{
      ...upload(), contentDetails: { ...upload().contentDetails, videoPublishedAt: 'not-a-date' },
    }] }));
    await expect(getChannelRecentContent('UC_synthetic')).rejects.toThrow(/coverage/i);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects duplicate video IDs rather than double counting', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist))
      .mockResolvedValueOnce(response({ items: [upload(), upload()] }));
    await expect(getChannelRecentContent('UC_synthetic')).rejects.toThrow(/coverage/i);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects duplicate statistics rows instead of choosing a last value', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist))
      .mockResolvedValueOnce(response({ items: [upload()] }))
      .mockResolvedValueOnce(response({ items: [
        { id: 'video-a', statistics: { viewCount: '10' } },
        { id: 'video-a', statistics: { viewCount: '99' } },
      ] }));
    await expect(getChannelRecentContent('UC_synthetic')).rejects.toThrow(/coverage/i);
  });

  it('follows an empty nonterminal page instead of publishing zero', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist))
      .mockResolvedValueOnce(response({ items: [], nextPageToken: 'more' }))
      .mockResolvedValueOnce(response({ items: [upload()] }))
      .mockResolvedValueOnce(response({ items: [{ id: 'video-a', statistics: { viewCount: '10' } }] }));
    expect(await getChannelRecentContent('UC_synthetic')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('rejects repeated pagination tokens rather than looping on empty pages', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist))
      .mockResolvedValueOnce(response({ items: [], nextPageToken: 'more' }))
      .mockResolvedValueOnce(response({ items: [], nextPageToken: 'more' }));
    await expect(getChannelRecentContent('UC_synthetic')).rejects.toThrow(/coverage/i);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('surfaces a bounded content API rejection without the remote body', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(playlist))
      .mockResolvedValueOnce(new Response('synthetic-private-marker', { status: 403 }));
    await expect(getChannelRecentContent('UC_synthetic')).rejects.toThrow(/^YouTube playlistItems API error \(403\)$/);
    for (const [, init] of jest.mocked(fetch).mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
