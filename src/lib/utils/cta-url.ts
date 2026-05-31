// Hostnames known to serve only images, not websites
const IMAGE_HOSTNAMES = new Set([
  'i.imgur.com',
  'images.opencollective.com',
  'cdn.discordapp.com',
  'i.redd.it',
  'pbs.twimg.com',
  'media.discordapp.net',
]);

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif|tiff?)(\?.*)?$/i;

export function isImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return IMAGE_HOSTNAMES.has(u.hostname) || IMAGE_EXT_RE.test(u.pathname);
  } catch {
    return true; // malformed URL → treated as invalid
  }
}

/** Returns the first valid non-image URL, or null if none exist. */
export function resolveCtaUrl(
  redirectUrl: string,
  brandMainUrl?: string | null,
): string | null {
  if (!isImageUrl(redirectUrl)) return redirectUrl;
  if (brandMainUrl && !isImageUrl(brandMainUrl)) return brandMainUrl;
  return null;
}
