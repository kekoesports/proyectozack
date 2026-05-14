import { env } from './env';

/**
 * Strip any whitespace (spaces, tabs, newlines, carriage returns) from a
 * raw base URL and remove trailing slashes. Whitespace is never valid in
 * a URL authority, and removing the trailing slash lets us safely
 * concatenate with paths that start with `/`.
 *
 * Exported so the regex can be tested directly without depending on
 * `process.env`.
 */
export function normalizeSiteUrl(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/\/+$/, '');
}

/**
 * Public site base URL — the single source of truth for every absolute
 * URL we emit in metadata, sitemap, robots, JSON-LD, RSS feeds and
 * outbound emails. Guaranteed to have no whitespace and no trailing
 * slash.
 */
export const SITE_URL: string = normalizeSiteUrl(env.NEXT_PUBLIC_SITE_URL);

/**
 * Build an absolute URL from a path. Ensures exactly one `/` between the
 * base and the path, so callers can pass either `"/blog"` or `"blog"`
 * without creating double slashes.
 *
 * @example
 *   absoluteUrl('/blog')            // 'https://socialpro.es/blog'
 *   absoluteUrl('blog/foo')         // 'https://socialpro.es/blog/foo'
 *   absoluteUrl('')                 // 'https://socialpro.es'
 *   absoluteUrl('/#hash')           // 'https://socialpro.es/#hash'
 */
export function absoluteUrl(path: string): string {
  if (path === '' || path === '/') return SITE_URL;
  return `${SITE_URL}/${path.replace(/^\/+/, '')}`;
}

/**
 * Returns an absolute URL for use in JSON-LD schema `image` fields.
 * Safe for both relative paths ("/images/...") and already-absolute URLs
 * (Vercel Blob, external CDNs). Returns undefined for null/empty values.
 */
export function schemaImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return absoluteUrl(url);
}
