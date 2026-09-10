jest.mock('server-only', () => ({}));

import { getAgencyVideos } from '@/lib/agency-videos';

afterEach(() => jest.restoreAllMocks());

test('uses validated official thumbnails and preserves the curated video identities', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify({
    thumbnail_url: 'https://p16-common-sign.tiktokcdn-eu.com/cover.image?signature=fixture',
  })));
  const videos = await getAgencyVideos();
  expect(videos).toHaveLength(3);
  expect(videos.every(video => video.thumbnail?.startsWith('https://p16-common-sign.tiktokcdn-eu.com/'))).toBe(true);
  expect(videos[0]?.url).toBe('https://www.tiktok.com/@socialproagency/video/7683853921047055648');
  expect(fetcher).toHaveBeenCalledTimes(3);
});

test('rejects metadata that redirects image loading outside the official CDN', async () => {
  jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify({
    thumbnail_url: 'https://tiktokcdn-eu.com.attacker.example/cover.jpg',
  })));
  expect((await getAgencyVideos()).every(video => video.thumbnail === null)).toBe(true);
});

test('keeps a working original-video link when TikTok is down or sends invalid JSON', async () => {
  jest.spyOn(global, 'fetch')
    .mockRejectedValueOnce(new Error('network unavailable'))
    .mockResolvedValueOnce(new Response('not json'))
    .mockResolvedValueOnce(new Response('', { status: 503 }));
  const videos = await getAgencyVideos();
  expect(videos).toHaveLength(3);
  expect(videos.every(video => video.thumbnail === null && video.url.includes('/@socialproagency/video/'))).toBe(true);
});
