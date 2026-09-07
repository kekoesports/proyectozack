import { hostnameFromUrl, isHostOrSubdomain } from '@/lib/utils/hostnames';

describe('hostname URL helpers', () => {
  it.each([
    ['https://youtube.com/watch?v=1', 'youtube.com'],
    ['https://www.youtube.com/watch?v=1', 'youtube.com'],
    ['http://sub.imgur.com/image.png', 'imgur.com'],
  ])('accepts %s for %s', (url, expectedHost) => {
    expect(isHostOrSubdomain(url, expectedHost)).toBe(true);
  });

  it.each([
    ['https://youtube.com.evil.example/watch?v=1', 'youtube.com'],
    ['https://evilyoutube.com/watch?v=1', 'youtube.com'],
    ['javascript:alert(1)', 'youtube.com'],
    ['not-a-url', 'youtube.com'],
  ])('rejects %s for %s', (url, expectedHost) => {
    expect(isHostOrSubdomain(url, expectedHost)).toBe(false);
  });

  it('normalizes hostname case and a trailing dot', () => {
    expect(hostnameFromUrl('https://WWW.YouTube.COM./watch')).toBe('www.youtube.com');
  });
});
