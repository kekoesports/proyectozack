import { z } from 'zod';
import { env } from '@/lib/env';

const TwitchTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

const TwitchFollowerSchema = z.object({
  total: z.number(),
});

type TwitchFollowerResult = {
  broadcasterId: string;
  followerCount: number;
};

const TwitchSearchChannelsSchema = z.object({
  data: z.array(
    z.object({
      broadcaster_login: z.string(),
      display_name: z.string(),
      id: z.string(),
      is_live: z.boolean(),
      game_name: z.string(),
      broadcaster_language: z.string(),
      thumbnail_url: z.string(),
    }),
  ),
});

const TwitchStreamsSchema = z.object({
  data: z.array(
    z.object({
      user_id: z.string(),
      user_login: z.string(),
      user_name: z.string(),
      game_id: z.string(),
      game_name: z.string(),
      language: z.string(),
      viewer_count: z.number(),
      thumbnail_url: z.string(),
    }),
  ),
});

const TwitchChannelsSchema = z.object({
  data: z.array(
    z.object({
      broadcaster_id: z.string(),
      broadcaster_login: z.string(),
      broadcaster_name: z.string(),
      broadcaster_language: z.string(),
      game_name: z.string(),
      title: z.string(),
    }),
  ),
});

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

type TwitchAuth = { readonly token: string; readonly clientId: string };

let cachedAuth: TwitchAuth | null = null;
let tokenExpiresAt = 0;

/**
 * Get an app access token + clientId via client credentials grant.
 * Caches the token until expiry. Returns both because every Helix call needs
 * the `Client-Id` header alongside the bearer.
 */
async function getAppAccessToken(): Promise<TwitchAuth> {
  if (cachedAuth && Date.now() < tokenExpiresAt) {
    return cachedAuth;
  }

  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
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

  const data = TwitchTokenSchema.parse(await res.json());
  cachedAuth = { token: data.access_token, clientId };
  // Expire 5 minutes early to avoid edge cases
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  return cachedAuth;
}

/**
 * Fetch follower counts for multiple Twitch broadcaster IDs.
 */
export async function fetchTwitchFollowerCounts(
  broadcasterIds: string[],
): Promise<TwitchFollowerResult[]> {
  if (broadcasterIds.length === 0) return [];
  const { token, clientId } = await getAppAccessToken();

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
  const { token, clientId } = await getAppAccessToken();

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

  const data = TwitchSearchChannelsSchema.parse(await res.json());
  const channels = data.data;
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
  const { token, clientId } = await getAppAccessToken();

  let url = `https://api.twitch.tv/helix/streams?game_id=32399&first=${first}`;
  if (language) url += `&language=${encodeURIComponent(language)}`;
  const res = await fetch(url, {
    headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch streams API error (${res.status}): ${text}`);
  }

  const data = TwitchStreamsSchema.parse(await res.json());
  const streams = data.data;
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

  const { token, clientId } = await getAppAccessToken();

  const params = broadcasterIds.map((id) => `broadcaster_id=${encodeURIComponent(id)}`).join('&');
  const url = `https://api.twitch.tv/helix/channels?${params}`;
  const res = await fetch(url, {
    headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitch channels API error (${res.status}): ${text}`);
  }

  const data = TwitchChannelsSchema.parse(await res.json());
  const channels = data.data;
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

const TwitchUsersSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      login: z.string(),
      display_name: z.string(),
      profile_image_url: z.string(),
    }),
  ),
});

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
  const { token, clientId } = await getAppAccessToken();

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
    const data = TwitchUsersSchema.parse(await res.json());
    for (const u of data.data) {
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
  const { token, clientId } = await getAppAccessToken();

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
    const data = TwitchUsersSchema.parse(await res.json());
    for (const u of data.data) {
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

const TwitchLiveStreamSchema = z.object({
  data: z.array(
    z.object({
      user_id:      z.string(),
      user_login:   z.string(),
      game_name:    z.string(),
      title:        z.string(),
      viewer_count: z.number(),
      started_at:   z.string(),
      thumbnail_url: z.string(),
    }),
  ),
});

export type TwitchLiveStream = {
  userId:       string;
  userLogin:    string;
  gameName:     string;
  title:        string;
  viewerCount:  number;
  startedAt:    Date;
  thumbnailUrl: string;
};

/**
 * Fetch live stream data for a list of Twitch handles (user_login).
 * Returns only streamers who are currently live.
 * Batches in chunks of 100 per Twitch API limits.
 *
 * IMPORTANT: if the API call fails, the caller must NOT update the DB
 * to avoid false "offline" marks due to transient errors.
 */
/** Extrae el login de un valor que puede ser handle o URL completa de Twitch. */
function normalizeTwitchHandle(raw: string): string {
  const s = raw.trim();
  // Si contiene "/", extraer el último segmento no-vacío (e.g. "twitch.tv/user" → "user", ".../user/about" → "user")
  if (s.includes('/')) {
    const parts = s.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? s;
  }
  return s;
}

export async function fetchTwitchLiveByLogins(logins: string[]): Promise<TwitchLiveStream[]> {
  const validLogins = logins
    .map(normalizeTwitchHandle)
    .filter((l) => l.length > 0 && /^[a-zA-Z0-9_]+$/.test(l));
  if (validLogins.length === 0) return [];
  const { token, clientId } = await getAppAccessToken();

  const results: TwitchLiveStream[] = [];
  for (let i = 0; i < validLogins.length; i += 100) {
    const chunk = validLogins.slice(i, i + 100);
    const params = chunk
      .map((l) => `user_login=${encodeURIComponent(l.toLowerCase())}`)
      .join('&');
    const res = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
      headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Twitch streams API error (${res.status}): ${text}`);
    }
    const data = TwitchLiveStreamSchema.parse(await res.json());
    for (const s of data.data) {
      results.push({
        userId:      s.user_id,
        userLogin:   s.user_login,
        gameName:    s.game_name,
        title:       s.title,
        viewerCount: s.viewer_count,
        startedAt:   new Date(s.started_at),
        thumbnailUrl: s.thumbnail_url,
      });
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
      const d = TwitchFollowerSchema.parse(await res.json());
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
