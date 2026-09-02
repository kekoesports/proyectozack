import { normalizePlatform, type CanonicalPlatform } from '@/lib/utils/platform';

type SocialProfileInput = {
  readonly platform: string;
  readonly profileUrl?: string | null;
  readonly handle?: string | null;
  readonly platformId?: string | null;
};

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'igshid',
  'ref_src',
]);

const ALLOWED_HOSTS: Record<CanonicalPlatform, readonly string[]> = {
  youtube: ['youtube.com', 'm.youtube.com', 'youtu.be'],
  twitch: ['twitch.tv', 'm.twitch.tv'],
  x: ['x.com', 'twitter.com', 'mobile.twitter.com'],
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com'],
  kick: ['kick.com'],
  discord: ['discord.gg', 'discord.com', 'discordapp.com'],
};

function parseWebUrl(rawValue: string): URL | null {
  const value = rawValue.trim();
  if (!value || /[\u0000-\u001F\u007F]/.test(value)) return null;

  try {
    const candidate = value.startsWith('//')
      ? `https:${value}`
      : /^[a-z][a-z0-9+.-]*:/i.test(value)
        ? value
        : `https://${value}`;
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function normalizedHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

function isAllowedProfileUrl(url: URL, platform: CanonicalPlatform): boolean {
  const host = normalizedHost(url);
  return ALLOWED_HOSTS[platform].includes(host) && url.pathname.replace(/\/+$/, '').length > 0;
}

function canonicalizeProfileUrl(url: URL, platform: CanonicalPlatform): string {
  const normalized = new URL(url.toString());
  normalized.protocol = 'https:';
  normalized.port = '';
  normalized.hash = '';

  if (platform === 'youtube') normalized.hostname = 'www.youtube.com';
  if (platform === 'twitch') normalized.hostname = 'www.twitch.tv';
  if (platform === 'x') normalized.hostname = 'x.com';
  if (platform === 'instagram') normalized.hostname = 'www.instagram.com';
  if (platform === 'tiktok' && normalizedHost(normalized) !== 'vm.tiktok.com') {
    normalized.hostname = 'www.tiktok.com';
  }
  if (platform === 'kick') normalized.hostname = 'kick.com';

  for (const key of [...normalized.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key) || key.startsWith('utm_')) {
      normalized.searchParams.delete(key);
    }
  }

  if (normalized.pathname.length > 1 && normalized.pathname.endsWith('/')) {
    normalized.pathname = normalized.pathname.replace(/\/+$/, '');
  }

  return normalized.toString();
}

function cleanHandle(value: string | null | undefined): string | null {
  const handle = value?.trim().replace(/^@/, '') ?? '';
  if (!handle || /[\s/\\?#]/.test(handle)) return null;
  return handle;
}

function profileUrlFromHandle(input: SocialProfileInput, platform: CanonicalPlatform): string | null {
  const rawHandle = input.handle?.trim() ?? '';
  const handleAsUrl = parseWebUrl(rawHandle);
  if (handleAsUrl && isAllowedProfileUrl(handleAsUrl, platform)) {
    return canonicalizeProfileUrl(handleAsUrl, platform);
  }

  const handle = cleanHandle(rawHandle);
  const platformId = cleanHandle(input.platformId);

  switch (platform) {
    case 'youtube': {
      const channelId = platformId?.startsWith('UC') ? platformId : handle?.startsWith('UC') ? handle : null;
      if (channelId) return `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`;
      return handle ? `https://www.youtube.com/@${encodeURIComponent(handle)}` : null;
    }
    case 'twitch':
      return handle ? `https://www.twitch.tv/${encodeURIComponent(handle)}` : null;
    case 'x':
      return handle ? `https://x.com/${encodeURIComponent(handle)}` : null;
    case 'instagram':
      return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}` : null;
    case 'tiktok':
      return handle ? `https://www.tiktok.com/@${encodeURIComponent(handle)}` : null;
    case 'kick':
      return handle ? `https://kick.com/${encodeURIComponent(handle)}` : null;
    case 'discord':
      return null;
  }
}

/**
 * Returns a safe, absolute social profile URL. Scheme-less legacy values are
 * repaired and missing URLs are derived from the platform handle when possible.
 */
export function normalizeSocialProfileUrl(input: SocialProfileInput): string | null {
  const platform = normalizePlatform(input.platform);
  if (!platform) return null;

  const suppliedUrl = input.profileUrl?.trim();
  if (suppliedUrl) {
    const parsed = parseWebUrl(suppliedUrl);
    if (parsed && isAllowedProfileUrl(parsed, platform)) {
      return canonicalizeProfileUrl(parsed, platform);
    }
  }

  return profileUrlFromHandle(input, platform);
}

/**
 * Normaliza un login de Twitch heredado. Algunos registros antiguos guardan
 * la URL completa (e incluso una subruta /about) en la columna `handle`.
 */
export function normalizeTwitchLogin(rawValue: string | null | undefined): string | null {
  const profileUrl = normalizeSocialProfileUrl({ platform: 'twitch', handle: rawValue ?? null });
  if (!profileUrl) return null;

  const [login] = new URL(profileUrl).pathname.split('/').filter(Boolean);
  return login && /^[a-zA-Z0-9_]+$/.test(login) ? login : null;
}
