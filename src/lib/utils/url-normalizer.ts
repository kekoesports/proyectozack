export type ContentPlatform = 'twitch' | 'kick' | 'youtube' | 'instagram' | 'tiktok' | 'other';

export type NormalizeResult = {
  originalUrl: string;
  normalizedUrl: string;
  platform: ContentPlatform;
  isValid: boolean;
};

const STRIP_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  'si', 't', 'feature', 'ab_channel', 'list', 'index', 'pp', 'igshid',
  'fbclid', 'gclid', 'si_id', 's', 'ref_src', 'ref_url',
]);

/** Drive, the tracking Sheet itself, and shorteners are never final evidence. */
const REJECT_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
  'sheets.google.com',
  'bit.ly',
  't.co',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'cutt.ly',
  'rb.gy',
  'is.gd',
]);

function stripTrackingParams(url: URL): URL {
  const cleaned = new URL(url.toString());
  for (const key of [...cleaned.searchParams.keys()]) {
    if (STRIP_PARAMS.has(key) || key.startsWith('utm_')) {
      cleaned.searchParams.delete(key);
    }
  }
  return cleaned;
}

function finalize(url: URL, hostname: string): string {
  const cleaned = stripTrackingParams(url);
  cleaned.protocol = 'https:';
  cleaned.hostname = hostname;
  cleaned.hash = '';
  if (cleaned.pathname.length > 1 && cleaned.pathname.endsWith('/')) {
    cleaned.pathname = cleaned.pathname.slice(0, -1);
  }
  return cleaned.toString();
}

function extractYoutubeVideoId(url: URL): string | null {
  const v = url.searchParams.get('v');
  if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

  if (url.hostname.replace(/^www\./, '').toLowerCase() === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0] ?? '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
  }

  return null;
}

function extractYoutubeShortsId(url: URL): string | null {
  const match = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
  return match ? (match[1] ?? null) : null;
}

function invalid(rawUrl: string, normalizedUrl = rawUrl): NormalizeResult {
  return { originalUrl: rawUrl, normalizedUrl, platform: 'other', isValid: false };
}

export function normalizeContentUrl(rawUrl: string): NormalizeResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) return invalid(rawUrl);

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return invalid(rawUrl);
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (REJECT_HOSTS.has(host)) return invalid(rawUrl, trimmed);

  if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
    const shortsId = extractYoutubeShortsId(url);
    if (shortsId) {
      return {
        originalUrl: rawUrl,
        normalizedUrl: `https://youtube.com/shorts/${shortsId}`,
        platform: 'youtube',
        isValid: true,
      };
    }

    const videoId = extractYoutubeVideoId(url);
    if (videoId) {
      return {
        originalUrl: rawUrl,
        normalizedUrl: `https://youtube.com/watch?v=${videoId}`,
        platform: 'youtube',
        isValid: true,
      };
    }

    return {
      originalUrl: rawUrl,
      normalizedUrl: finalize(url, 'youtube.com'),
      platform: 'youtube',
      isValid: true,
    };
  }

  if (host === 'twitch.tv' || host === 'clips.twitch.tv') {
    if (url.pathname.length < 2) return { originalUrl: rawUrl, normalizedUrl: trimmed, platform: 'twitch', isValid: false };
    return {
      originalUrl: rawUrl,
      normalizedUrl: finalize(url, host),
      platform: 'twitch',
      isValid: true,
    };
  }

  if (host === 'kick.com') {
    if (url.pathname.length < 2) return { originalUrl: rawUrl, normalizedUrl: trimmed, platform: 'kick', isValid: false };
    return {
      originalUrl: rawUrl,
      normalizedUrl: finalize(url, host),
      platform: 'kick',
      isValid: true,
    };
  }

  if (host === 'instagram.com') {
    const validPath = /^\/(p|reel|stories|tv|reels)\//.test(url.pathname);
    return {
      originalUrl: rawUrl,
      normalizedUrl: finalize(url, host),
      platform: 'instagram',
      isValid: validPath,
    };
  }

  if (host === 'tiktok.com' || host === 'vm.tiktok.com') {
    return {
      originalUrl: rawUrl,
      normalizedUrl: finalize(url, host),
      platform: 'tiktok',
      isValid: url.pathname.length > 1,
    };
  }

  // content_platform enum has no `x` value yet — store as other, still valid evidence.
  if (host === 'x.com' || host === 'twitter.com' || host === 'mobile.twitter.com') {
    const validPath = /\/status\/\d+/.test(url.pathname) || url.pathname.length > 1;
    return {
      originalUrl: rawUrl,
      normalizedUrl: finalize(url, 'x.com'),
      platform: 'other',
      isValid: validPath,
    };
  }

  return invalid(rawUrl, trimmed);
}

/** Canonical URL for dedupe, or null when the link is not publishable evidence. */
export function canonicalEvidenceUrl(rawUrl: string): string | null {
  const result = normalizeContentUrl(rawUrl);
  return result.isValid ? result.normalizedUrl : null;
}
