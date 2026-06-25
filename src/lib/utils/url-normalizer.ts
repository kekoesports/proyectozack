export type NormalizeResult = {
  originalUrl: string;
  normalizedUrl: string;
  platform: 'twitch' | 'kick' | 'youtube' | 'instagram' | 'tiktok' | 'other';
  isValid: boolean;
};

const STRIP_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  'si', 't', 'feature', 'ab_channel', 'list', 'index', 'pp', 'igshid',
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

function extractYoutubeVideoId(url: URL): string | null {
  // youtube.com/watch?v=ID
  const v = url.searchParams.get('v');
  if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

  // youtu.be/ID
  if (url.hostname === 'youtu.be') {
    const id = url.pathname.slice(1).split('?')[0] ?? '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
  }

  return null;
}

function extractYoutubeShortsId(url: URL): string | null {
  const match = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
  return match ? (match[1] ?? null) : null;
}

export function normalizeContentUrl(rawUrl: string): NormalizeResult {
  const trimmed = rawUrl.trim();

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return { originalUrl: rawUrl, normalizedUrl: rawUrl, platform: 'other', isValid: false };
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  // ── YouTube ───────────────────────────────────────────────────────────────
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
    const normalizedHost = 'youtube.com';

    // Shorts
    const shortsId = extractYoutubeShortsId(url);
    if (shortsId) {
      return {
        originalUrl: rawUrl,
        normalizedUrl: `https://${normalizedHost}/shorts/${shortsId}`,
        platform: 'youtube',
        isValid: true,
      };
    }

    // Regular video
    const videoId = extractYoutubeVideoId(url);
    if (videoId) {
      return {
        originalUrl: rawUrl,
        normalizedUrl: `https://${normalizedHost}/watch?v=${videoId}`,
        platform: 'youtube',
        isValid: true,
      };
    }

    // Channel or playlist page — still valid youtube URL, clean params
    const cleaned = stripTrackingParams(url);
    cleaned.hostname = normalizedHost;
    cleaned.protocol = 'https:';
    return { originalUrl: rawUrl, normalizedUrl: cleaned.toString(), platform: 'youtube', isValid: true };
  }

  // ── Twitch ────────────────────────────────────────────────────────────────
  if (host === 'twitch.tv' || host === 'clips.twitch.tv') {
    // Minimum: twitch.tv/channelname
    if (url.pathname.length < 2) {
      return { originalUrl: rawUrl, normalizedUrl: trimmed, platform: 'twitch', isValid: false };
    }
    const cleaned = stripTrackingParams(url);
    cleaned.protocol = 'https:';
    cleaned.hostname = host;
    return { originalUrl: rawUrl, normalizedUrl: cleaned.toString(), platform: 'twitch', isValid: true };
  }

  // ── Kick ──────────────────────────────────────────────────────────────────
  if (host === 'kick.com') {
    if (url.pathname.length < 2) {
      return { originalUrl: rawUrl, normalizedUrl: trimmed, platform: 'kick', isValid: false };
    }
    const cleaned = stripTrackingParams(url);
    cleaned.protocol = 'https:';
    return { originalUrl: rawUrl, normalizedUrl: cleaned.toString(), platform: 'kick', isValid: true };
  }

  // ── Instagram ─────────────────────────────────────────────────────────────
  if (host === 'instagram.com') {
    // Valid paths: /p/, /reel/, /stories/, /tv/
    const validPath = /^\/(p|reel|stories|tv|reels)\//.test(url.pathname);
    const cleaned = stripTrackingParams(url);
    cleaned.protocol = 'https:';
    return {
      originalUrl: rawUrl,
      normalizedUrl: cleaned.toString(),
      platform: 'instagram',
      isValid: validPath,
    };
  }

  // ── TikTok ────────────────────────────────────────────────────────────────
  if (host === 'tiktok.com' || host === 'vm.tiktok.com') {
    const cleaned = stripTrackingParams(url);
    cleaned.protocol = 'https:';
    return {
      originalUrl: rawUrl,
      normalizedUrl: cleaned.toString(),
      platform: 'tiktok',
      isValid: url.pathname.length > 1,
    };
  }

  // ── Unknown / other ───────────────────────────────────────────────────────
  // Accept any well-formed URL: deal trackers use brand-specific links (key-drop, etc.)
  const cleaned = stripTrackingParams(url);
  cleaned.protocol = 'https:';
  return { originalUrl: rawUrl, normalizedUrl: cleaned.toString(), platform: 'other', isValid: true };
}
