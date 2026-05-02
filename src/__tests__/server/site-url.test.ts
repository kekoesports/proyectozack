
import { SITE_URL, absoluteUrl, normalizeSiteUrl } from '@/lib/site-url';

describe('normalizeSiteUrl', () => {
  it('strips trailing newlines and whitespace', () => {
    expect(normalizeSiteUrl('https://socialpro.es\n')).toBe('https://socialpro.es');
    expect(normalizeSiteUrl('https://socialpro.es  ')).toBe('https://socialpro.es');
    expect(normalizeSiteUrl('  https://socialpro.es\r\n')).toBe('https://socialpro.es');
  });

  it('strips internal newlines and tabs', () => {
    expect(normalizeSiteUrl('https://socialpro.es\n/')).toBe('https://socialpro.es');
    expect(normalizeSiteUrl('https://\tsocialpro.es')).toBe('https://socialpro.es');
  });

  it('strips one or more trailing slashes', () => {
    expect(normalizeSiteUrl('https://socialpro.es/')).toBe('https://socialpro.es');
    expect(normalizeSiteUrl('https://socialpro.es//')).toBe('https://socialpro.es');
  });

  it('leaves a well-formed URL unchanged', () => {
    expect(normalizeSiteUrl('https://socialpro.es')).toBe('https://socialpro.es');
  });
});

describe('SITE_URL (from env)', () => {
  it('is trimmed and has no trailing slash', () => {
    // jest.setup.ts sets NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
    expect(SITE_URL).toBe('http://localhost:3000');
    expect(SITE_URL.endsWith('/')).toBe(false);
    expect(/\s/.test(SITE_URL)).toBe(false);
  });
});

describe('absoluteUrl', () => {
  it('prefixes a path with a single leading slash', () => {
    expect(absoluteUrl('/blog')).toBe('http://localhost:3000/blog');
    expect(absoluteUrl('blog')).toBe('http://localhost:3000/blog');
    expect(absoluteUrl('//blog')).toBe('http://localhost:3000/blog');
  });

  it('returns the base URL for empty or root paths', () => {
    expect(absoluteUrl('')).toBe('http://localhost:3000');
    expect(absoluteUrl('/')).toBe('http://localhost:3000');
  });

  it('handles nested paths and fragments', () => {
    expect(absoluteUrl('/blog/some-post')).toBe('http://localhost:3000/blog/some-post');
    expect(absoluteUrl('/#casos')).toBe('http://localhost:3000/#casos');
  });

  it('preserves query strings', () => {
    expect(absoluteUrl('/blog?q={search_term_string}')).toBe(
      'http://localhost:3000/blog?q={search_term_string}',
    );
  });
});
