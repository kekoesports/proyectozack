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

/**
 * Completa enlaces de referido cuyo formato es estable y depende del código.
 * Mantiene siempre la URL escrita por el operador cuando existe.
 */
export function resolveCreatorCodeRedirectUrl(
  brandName: string,
  code: string,
  redirectUrl: string,
): string {
  const requestedUrl = redirectUrl.trim();
  if (requestedUrl) return requestedUrl;

  const normalizedBrand = brandName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalizedBrand === 'skinsmonkey') {
    return `https://skinsmonkey.com/es/r/${encodeURIComponent(code.trim())}`;
  }

  return '';
}
