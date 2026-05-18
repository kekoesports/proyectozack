/**
 * Core sync functions for YouTube and Twitch metrics.
 * Used by: /api/cron/sync-metrics + scripts/sync-followers.ts
 */

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${parseFloat((n / 1_000_000).toFixed(1))}M`;
  if (n >= 1_000) return `${parseFloat((n / 1_000).toFixed(1))}K`;
  return String(n);
}

// ── YouTube ───────────────────────────────────────────────────────────────────

function parseYouTubeUrl(profileUrl: string): { type: string; value: string } | null {
  try {
    const url = new URL(profileUrl);
    const path = url.pathname
      .replace(/\/$/, '')
      .replace(/\/(videos|featured|about|playlists|community|shorts|streams|live)$/, '');

    const channelMatch = path.match(/^\/channel\/(UC[\w-]+)$/);
    if (channelMatch?.[1]) return { type: 'id', value: channelMatch[1] };

    const handleMatch = path.match(/^\/@([\w.-]+)$/);
    if (handleMatch?.[1]) return { type: 'handle', value: `@${handleMatch[1]}` };

    const customMatch = path.match(/^\/c\/([\w.-]+)$/);
    if (customMatch?.[1]) return { type: 'custom', value: customMatch[1] };

    const userMatch = path.match(/^\/user\/([\w.-]+)$/);
    if (userMatch?.[1]) return { type: 'username', value: userMatch[1] };

    const rawMatch = path.match(/^\/([\w.-]+)$/);
    if (rawMatch?.[1] && rawMatch[1] !== 'watch' && rawMatch[1] !== 'results')
      return { type: 'custom', value: rawMatch[1] };

    return null;
  } catch {
    return null;
  }
}

export async function fetchYouTubeSubscribers(
  profileUrl: string | null,
  handle: string,
  apiKey: string,
): Promise<{ count: number; channelId: string } | null> {
  const base = 'https://www.googleapis.com/youtube/v3/channels';

  async function tryFetch(param: string, paramType: string): Promise<{ count: number; channelId: string } | null> {
    const url = `${base}?part=statistics,id&${paramType}=${encodeURIComponent(param)}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as {
      items?: { id?: string; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }[]
    };
    const item = data.items?.[0];
    if (!item) return null;
    if (item.statistics?.hiddenSubscriberCount) return null;
    const count = item.statistics?.subscriberCount;
    if (!count) return null;
    return { count: parseInt(count, 10), channelId: item.id ?? '' };
  }

  // Direct channel ID in handle
  if (handle.startsWith('UC')) {
    const r = await tryFetch(handle, 'id');
    if (r) return r;
  }

  // Parse profile_url
  const parsed = profileUrl ? parseYouTubeUrl(profileUrl) : null;
  if (parsed) {
    const paramType = parsed.type === 'id' ? 'id' : parsed.type === 'handle' ? 'forHandle' : 'forUsername';
    const r = await tryFetch(parsed.value, paramType);
    if (r) return r;
  }

  // If handle looks like a URL, parse it too
  if (handle.startsWith('http') || handle.includes('/')) {
    const parsedFromHandle = parseYouTubeUrl(handle.startsWith('http') ? handle : `https://${handle}`);
    if (parsedFromHandle) {
      const paramType = parsedFromHandle.type === 'id' ? 'id' : parsedFromHandle.type === 'handle' ? 'forHandle' : 'forUsername';
      const r = await tryFetch(parsedFromHandle.value, paramType);
      if (r) return r;
    }
  }

  // Fallback: handle as @handle / forUsername
  const cleanHandle = handle.replace(/^@/, '').trim();
  if (cleanHandle && !cleanHandle.startsWith('http') && !cleanHandle.includes('/')) {
    const r = await tryFetch(`@${cleanHandle}`, 'forHandle');
    if (r) return r;
    const r2 = await tryFetch(cleanHandle, 'forUsername');
    if (r2) return r2;
  }

  return null;
}

// ── Twitch ────────────────────────────────────────────────────────────────────

export async function getTwitchToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Twitch token error: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function fetchTwitchFollowers(
  profileUrl: string | null,
  handle: string,
  clientId: string,
  token: string,
): Promise<{ count: number; userId: string } | null> {
  // Extract login from handle or URL
  let login: string | null = null;

  if (handle && !handle.startsWith('http') && !handle.includes('/') && handle.length > 0 && handle !== 'about') {
    login = handle.replace(/^@/, '').toLowerCase();
  } else {
    const urlToParse = profileUrl
      ?? (handle.startsWith('http') ? handle : null)
      ?? (handle.includes('/') ? `https://${handle}` : null);
    if (urlToParse) {
      try {
        const url = new URL(urlToParse.startsWith('http') ? urlToParse : `https://${urlToParse}`);
        const path = url.pathname
          .replace(/\/$/, '')
          .replace(/\/(about|videos|clips|schedule|squad|followers)$/, '');
        const match = path.match(/^\/([\w]+)$/);
        if (match?.[1]) login = match[1].toLowerCase();
      } catch {}
    }
  }

  if (!login) return null;

  const userRes = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
    { headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}` } },
  );
  if (!userRes.ok) return null;
  const userData = await userRes.json() as { data?: { id: string }[] };
  const userId = userData.data?.[0]?.id;
  if (!userId) return null;

  const follRes = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}`,
    { headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}` } },
  );
  if (!follRes.ok) return null;
  const follData = await follRes.json() as { total?: number };
  if (follData.total === undefined) return null;
  return { count: follData.total, userId };
}
