import { z } from 'zod';
import { normalizeTwitchLogin } from '@/lib/utils/social-profile-url';
import { getAppAccessToken } from './twitch-auth';
import { readProviderJson, ProviderReadError } from './provider-http';
import { readGameStreams, fetchTwitchFollowerCountsReport } from './twitch-discovery';
export { getGameLiveStreams, fetchTwitchFollowerCountsReport, searchTwitchGameCategories, fetchTwitchUserPhotosReport } from './twitch-discovery';
export type { TwitchGameStream, TwitchGameStreamsReport, TwitchFollowersReport, TwitchCategoriesReport, TwitchPhotosReport } from './twitch-discovery';

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
  readonly followerCount: number | null;
  readonly language: string;
  readonly currentGame: string;
  readonly isLive: boolean | null;
  readonly viewerCount: number | null;
  readonly thumbnailUrl: string | null;
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

  const data = await readProviderJson(url, TwitchSearchChannelsSchema, 'Twitch search API', {
    headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
  });

  const channels = data.data;
  if (channels.length === 0) return [];

  return channels.map((c) => ({
    broadcasterId: c.id,
    login: c.broadcaster_login,
    displayName: c.display_name,
    followerCount: null,
    language: c.broadcaster_language,
    currentGame: c.game_name,
    isLive: c.is_live,
    viewerCount: null,
    thumbnailUrl: c.thumbnail_url || null,
  }));
}

/**
 * Get currently live CS2 streams (game_id = 32399).
 */
export async function getCS2LiveStreams(first = 100, language?: string): Promise<TwitchChannelPreview[]> {
  const report = await readGameStreams('32399', 1, first, language);
  // Legacy first-page API remains bounded; new discovery consumes the full coverage report.
  if (report.coverage.warnings.some(warning => warning !== 'page_limit')) {
    throw new ProviderReadError(report.coverage.warnings[0] ?? 'coverage_incomplete', 'Twitch streams API coverage unavailable');
  }
  return report.items;
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
  const data = await readProviderJson(url, TwitchChannelsSchema, 'Twitch channels API', {
    headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
  });

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
    followerCount: followerMap.get(c.broadcaster_id) ?? null,
    language: c.broadcaster_language,
    currentGame: c.game_name,
    isLive: null,
    viewerCount: null,
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
export async function fetchTwitchLiveByLogins(logins: string[]): Promise<TwitchLiveStream[]> {
  const validLogins = logins
    .map(normalizeTwitchLogin)
    .filter((login): login is string => login !== null);
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

  const report = await fetchTwitchFollowerCountsReport(ids, { clientId, token });
  for (const item of report.items) {
    if (item.followerCount !== null) map.set(item.broadcasterId, item.followerCount);
  }

  return map;
}
