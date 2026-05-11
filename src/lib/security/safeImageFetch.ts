import { env } from '@/lib/env';

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const SITE_HOST = safeHost(env.NEXT_PUBLIC_SITE_URL);

// Hostnames permitidos para fetch de imágenes en endpoints OG (SSRF-defense).
// Solo orígenes propios o CDNs públicos usados por talents/giveaways. NO leer de DB ni input.
const ALLOWED_IMAGE_HOSTS: readonly string[] = [
  ...(SITE_HOST ? [SITE_HOST] : []),
  'socialpro.es',
  'www.socialpro.es',
];

const ALLOWED_IMAGE_SUFFIXES: readonly string[] = [
  '.vercel-storage.com',     // Vercel Blob
  '.public.blob.vercel-storage.com',
  '.jtvnw.net',              // Twitch CDN
  '.ytimg.com',              // YouTube thumbnails
  '.twitchcdn.net',
];

export function isAllowedImageUrl(rawUrl: string): boolean {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return false; }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  if (ALLOWED_IMAGE_HOSTS.includes(host)) return true;
  return ALLOWED_IMAGE_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/**
 * Fetch + base64-encode una URL de imagen externa con defensas SSRF:
 *  - HTTPS only + allowlist de hostnames (corta IPs privadas, localhost, etc.)
 *  - Timeout de 5s con AbortSignal
 *  - Cap de 5MB en el body para evitar DoS por payload
 * Retorna null si falla cualquier check (silencioso, el caller usa fallback).
 */
export async function safeFetchImageAsBase64(rawUrl: string): Promise<string | null> {
  if (!isAllowedImageUrl(rawUrl)) return null;
  try {
    const res = await fetch(rawUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const len = Number(res.headers.get('content-length') ?? '0');
    if (len > MAX_BYTES) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return null;
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    if (!mime.startsWith('image/')) return null;
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}
