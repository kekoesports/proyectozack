type TwitchTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
}

type TwitchFollowerResponse = {
  total: number;
}

type TwitchFollowerResult = {
  broadcasterId: string;
  followerCount: number;
}

type TwitchSearchChannelsResponse = {
  data: Array<{
    broadcaster_login: string;
    display_name: string;
    id: string;
    is_live: boolean;
    game_name: string;
    broadcaster_language: string;
    thumbnail_url: string;
  }>;
}

type TwitchStreamsResponse = {
  data: Array<{
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    language: string;
    viewer_count: number;
    thumbnail_url: string;
  }>;
}

type TwitchChannelsResponse = {
  data: Array<{
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    broadcaster_language: string;
    game_name: string;
    title: string;
  }>;
}

export type TwitchChannelPreview = {
  readonly broadcasterId: string;
  readonly login: string;
  readonly displayName: string;
  readonly followerCount: number;
  readonly language: string;
  readonly currentGame: string;
  readonly isLive: boolean;
  readonly viewerCount: number;
  readonly thumbnailUrl: string | null;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Get an app access token via client credentials grant.
 * Caches the token until expiry.
 */
async function getAppAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not set');
  }

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch token error (${res.status}): ${text}`);
  }

  const data: TwitchTokenResponse = await res.json();
  cachedToken = data.access_token;
  // Expire 5 minutes early to avoid edge cases
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

/**
 * Fetch follower counts for multiple Twitch broadcaster IDs.
 */
export async function fetchTwitchFollowerCounts(
  broadcasterIds: string[],
): Promise<TwitchFollowerResult[]> {
  if (broadcasterIds.length === 0) return [];
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID ?? '';

  const map = await _buildFollowerMap(broadcasterIds, clientId, token);
  return Array.from(map.entries()).map(([broadcasterId, followerCount]) => ({
    broadcasterId,
    followerCount,
  }));
}

/**
 * Search Twitch channels by keyword.
 * Returns channels whose names/logins match the query.
 */
export async function searchTwitchChannels(
  query: string,
  liveOnly = false,
): Promise<TwitchChannelPreview[]> {
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID ?? '';

  const url =
    `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}` +
    `&first=20${liveOnly ? '&live_only=true' : ''}`;

  const res = await fetch(url, {
    headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch search API error (${res.status}): ${text}`);
  }

  const data: TwitchSearchChannelsResponse = await res.json();
  const channels = data.data ?? [];
  if (channels.length === 0) return [];

  return channels.map((c) => ({
    broadcasterId: c.id,
    login: c.broadcaster_login,
    displayName: c.display_name,
    followerCount: 0,
    language: c.broadcaster_language,
    currentGame: c.game_name,
    isLive: c.is_live,
    viewerCount: 0,
    thumbnailUrl: c.thumbnail_url || null,
  }));
}

/**
 * Get currently live CS2 streams (game_id = 32399).
 */
export async function getCS2LiveStreams(first = 100, language?: string): Promise<TwitchChannelPreview[]> {
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID ?? '';

  let url = `https://api.twitch.tv/helix/streams?game_id=32399&first=${first}`;
  if (language) url += `&language=${encodeURIComponent(language)}`;
  const res = await fetch(url, {
    headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch streams API error (${res.status}): ${text}`);
  }

  const data: TwitchStreamsResponse = await res.json();
  const streams = data.data ?? [];
  if (streams.length === 0) return [];

  return streams.map((s) => ({
    broadcasterId: s.user_id,
    login: s.user_login,
    displayName: s.user_name,
    followerCount: 0,
    language: s.language,
    currentGame: s.game_name,
    isLive: true,
    viewerCount: s.viewer_count,
    thumbnailUrl: s.thumbnail_url || null,
  }));
}

/**
 * Fetch channel info for specific broadcaster IDs.
 */
export async function getTwitchChannelInfo(
  broadcasterIds: string[],
): Promise<TwitchChannelPreview[]> {
  if (broadcasterIds.length === 0) return [];

  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID ?? '';

  const params = broadcasterIds.map((id) => `broadcaster_id=${encodeURIComponent(id)}`).join('&');
  const url = `https://api.twitch.tv/helix/channels?${params}`;
  const res = await fetch(url, {
    headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch channels API error (${res.status}): ${text}`);
  }

  const data: TwitchChannelsResponse = await res.json();
  const channels = data.data ?? [];
  if (channels.length === 0) return [];

  const followerMap = await _buildFollowerMap(
    channels.map((c) => c.broadcaster_id),
    clientId,
    token,
  );

  return channels.map((c) => ({
    broadcasterId: c.broadcaster_id,
    login: c.broadcaster_login,
    displayName: c.broadcaster_name,
    followerCount: followerMap.get(c.broadcaster_id) ?? 0,
    language: c.broadcaster_language,
    currentGame: c.game_name,
    isLive: false,
    viewerCount: 0,
    thumbnailUrl: null,
  }));
}

type TwitchUsersResponse = {
  data: Array<{
    id: string;
    login: string;
    display_name: string;
    profile_image_url: string;
  }>;
};

export type TwitchUserPhoto = {
  readonly userId: string;
  readonly login: string;
  readonly profileImageUrl: string;
};

/**
 * Fetch profile picture URLs for multiple Twitch user IDs.
 * Uses /helix/users (max 100 IDs per call).
 */
export async function fetchTwitchUserPhotos(
  userIds: string[],
): Promise<TwitchUserPhoto[]> {
  if (userIds.length === 0) return [];
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID ?? '';

  const results: TwitchUserPhoto[] = [];
  const batchSize = 100;

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const params = batch.map((id) => `id=${encodeURIComponent(id)}`).join('&');
    const url = `https://api.twitch.tv/helix/users?${params}`;
    const res = await fetch(url, {
      headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) continue;
    const data: TwitchUsersResponse = await res.json();
    for (const u of data.data ?? []) {
      if (u.profile_image_url) {
        results.push({
          userId: u.id,
          login: u.login,
          profileImageUrl: u.profile_image_url,
        });
      }
    }
  }
  return results;
}

/**
 * Fetch profile picture for a Twitch user by login name (handle).
 */
export async function fetchTwitchUserPhotoByLogin(
  logins: string[],
): Promise<TwitchUserPhoto[]> {
  if (logins.length === 0) return [];
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID ?? '';

  const results: TwitchUserPhoto[] = [];
  const batchSize = 100;

  for (let i = 0; i < logins.length; i += batchSize) {
    const batch = logins.slice(i, i + batchSize);
    const params = batch.map((l) => `login=${encodeURIComponent(l.toLowerCase())}`).join('&');
    const url = `https://api.twitch.tv/helix/users?${params}`;
    const res = await fetch(url, {
      headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) continue;
    const data: TwitchUsersResponse = await res.json();
    for (const u of data.data ?? []) {
      if (u.profile_image_url) {
        results.push({
          userId: u.id,
          login: u.login,
          profileImageUrl: u.profile_image_url,
        });
      }
    }
  }
  return results;
}

// Parallel fetch follower counts into a Map<broadcasterId, count>
async function _buildFollowerMap(
  ids: string[],
  clientId: string,
  token: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;

  const results = await Promise.allSettled(
    ids.map(async (broadcasterId) => {
      const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}`;
      const res = await fetch(url, {
        headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const d: TwitchFollowerResponse = await res.json();
      return { broadcasterId, total: d.total };
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      map.set(result.value.broadcasterId, result.value.total);
    }
  }

  return map;
}
