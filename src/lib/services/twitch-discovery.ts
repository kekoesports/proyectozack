import { TwitchGameDiscovery, TwitchGameStreams, TwitchFollowerTotal, TwitchCategorySearch, TwitchCategories, TwitchUsers } from '@/lib/schemas/twitch-discovery';
import type { ProviderCoverage, ProviderWarning } from '@/lib/schemas/provider-availability';
import { getAppAccessToken } from './twitch-auth';
import { ProviderReadError, readProviderJson, providerWarning } from './provider-http';
import type { TwitchChannelPreview, TwitchUserPhoto } from './twitch';

export type TwitchGameStream = TwitchChannelPreview & { readonly streamId: string; readonly startedAt: string };
export type TwitchGameStreamsReport = { readonly items: TwitchGameStream[]; readonly coverage: ProviderCoverage };

export type TwitchCategoriesReport = {
  readonly items: { readonly id: string; readonly name: string }[];
  readonly coverage: ProviderCoverage;
};

/** One bounded public category page. Discovery hints are not proof that every match is relevant. */
export async function searchTwitchGameCategories(query: string): Promise<TwitchCategoriesReport> {
  const parsed = TwitchCategorySearch.safeParse({ query });
  if (!parsed.success) throw new ProviderReadError('invalid_response', 'Invalid Twitch category query');
  try {
    const { token, clientId } = await getAppAccessToken();
    const params = new URLSearchParams({ query: parsed.data.query, first: '20' });
    const data = await readProviderJson(`https://api.twitch.tv/helix/search/categories?${params}`,
      TwitchCategories, 'Twitch categories API', { headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` } });
    const items = [...new Map(data.data.map(item => [item.id, item])).values()];
    const warnings: ProviderWarning[] = [];
    if (items.length !== data.data.length) warnings.push('duplicate_record');
    if (data.pagination.cursor) warnings.push('page_limit');
    return { items, coverage: { status: warnings.length ? 'partial' : 'complete', pagesRead: 1, warnings } };
  } catch (error) {
    return { items: [], coverage: { status: 'unavailable', pagesRead: 0, warnings: [providerWarning(error)] } };
  }
}

/** Public live observations only, not historical CCV; callers own retention/permission gates. */
export async function getGameLiveStreams(gameId: string, maxPages = 3): Promise<TwitchGameStreamsReport> {
  return readGameStreams(gameId, maxPages, 100);
}

export async function readGameStreams(
  gameId: string, maxPages: number, first: number, language?: string,
): Promise<TwitchGameStreamsReport> {
  const parsed = TwitchGameDiscovery.safeParse({ gameId, maxPages, first, language });
  if (!parsed.success) throw new ProviderReadError('invalid_response', 'Invalid Twitch discovery options');
  const options = parsed.data;
  const items: TwitchGameStream[] = [];
  const warnings = new Set<ProviderWarning>();
  const users = new Set<string>();
  const streams = new Set<string>();
  const cursors = new Set<string>();
  let pagesRead = 0;
  let after: string | undefined;
  try {
    const { token, clientId } = await getAppAccessToken();
    do {
      const params = new URLSearchParams({ game_id: options.gameId, first: String(options.first) });
      if (options.language) params.set('language', options.language);
      if (after) params.set('after', after);
      const data = await readProviderJson(`https://api.twitch.tv/helix/streams?${params}`, TwitchGameStreams,
        'Twitch streams API', { headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` } });
      pagesRead += 1;
      if (data.data.length > options.first || data.data.some(stream =>
        stream.game_id !== options.gameId || Date.parse(stream.started_at) > Date.now())) {
        throw new ProviderReadError('invalid_response', 'Twitch stream coverage invalid');
      }
      for (const stream of data.data) {
        if (users.has(stream.user_id) || streams.has(stream.id)) { warnings.add('duplicate_record'); continue; }
        users.add(stream.user_id); streams.add(stream.id);
        items.push({
          broadcasterId: stream.user_id, streamId: stream.id, startedAt: stream.started_at,
          login: stream.user_login, displayName: stream.user_name, followerCount: null,
          language: stream.language, currentGame: stream.game_name, isLive: true,
          viewerCount: stream.viewer_count, thumbnailUrl: stream.thumbnail_url || null,
        });
      }
      after = data.pagination.cursor;
      if (after && cursors.has(after)) { warnings.add('repeated_cursor'); break; }
      if (after) cursors.add(after);
    } while (after && pagesRead < options.maxPages);
    if (after && pagesRead === options.maxPages) warnings.add('page_limit');
  } catch (error) { warnings.add(providerWarning(error)); }
  return { items, coverage: {
    status: warnings.size ? (pagesRead > 0 ? 'partial' : 'unavailable') : 'complete',
    pagesRead, warnings: [...warnings],
  } };
}

export type TwitchFollowersReport = {
  readonly items: { readonly broadcasterId: string; readonly followerCount: number | null }[];
  readonly coverage: ProviderCoverage;
};

export type TwitchPhotosReport = { readonly items: TwitchUserPhoto[]; readonly coverage: ProviderCoverage };

/** Batched profile avatars, not live thumbnails. Missing photos never replace the last valid avatar. */
export async function fetchTwitchUserPhotosReport(ids: string[]): Promise<TwitchPhotosReport> {
  const unique = [...new Set(ids)];
  const items: TwitchUserPhoto[] = [];
  const warnings = new Set<ProviderWarning>();
  let pagesRead = 0;
  if (!unique.length) return { items, coverage: { status: 'complete', pagesRead, warnings: [] } };
  try {
    const { token, clientId } = await getAppAccessToken();
    for (let index = 0; index < unique.length; index += 100) {
      const batch = unique.slice(index, index + 100);
      const query = new URLSearchParams(); batch.forEach(id => query.append('id', id));
      const data = await readProviderJson(`https://api.twitch.tv/helix/users?${query}`, TwitchUsers, 'Twitch users API', {
        headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
      });
      pagesRead += 1;
      const seen = new Set<string>();
      for (const user of data.data) {
        if (!batch.includes(user.id) || seen.has(user.id)) throw new ProviderReadError('invalid_response', 'Twitch users coverage invalid');
        seen.add(user.id);
        if (user.profile_image_url) items.push({ userId: user.id, login: user.login, profileImageUrl: user.profile_image_url });
        else warnings.add('metric_unavailable');
      }
      if (seen.size !== batch.length) warnings.add('coverage_incomplete');
    }
  } catch (error) { warnings.add(providerWarning(error)); }
  return { items, coverage: { status: warnings.size ? pagesRead ? 'partial' : 'unavailable' : 'complete', pagesRead, warnings: [...warnings] } };
}

/** No follower identities/scopes; only public aggregate total, with at most five requests in flight. */
export async function fetchTwitchFollowerCountsReport(
  ids: string[], auth?: { readonly token: string; readonly clientId: string },
): Promise<TwitchFollowersReport> {
  const uniqueIds = [...new Set(ids)];
  const items: TwitchFollowersReport['items'] = [];
  const warnings = new Set<ProviderWarning>();
  let pagesRead = 0;
  if (!uniqueIds.length) return { items, coverage: { status: 'complete', pagesRead, warnings: [] } };
  const { token, clientId } = auth ?? await getAppAccessToken();
  for (let index = 0; index < uniqueIds.length; index += 5) {
    const batch = await Promise.all(uniqueIds.slice(index, index + 5).map(async broadcasterId => {
      try {
        const query = new URLSearchParams({ broadcaster_id: broadcasterId, first: '1' });
        const data = await readProviderJson(`https://api.twitch.tv/helix/channels/followers?${query}`,
          TwitchFollowerTotal, 'Twitch followers API', { headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` } });
        pagesRead += 1;
        return { broadcasterId, followerCount: data.total };
      } catch (error) {
        warnings.add(providerWarning(error));
        return { broadcasterId, followerCount: null };
      }
    }));
    items.push(...batch);
    // Finish only the already-started batch; do not launch more after any failed read.
    if ([...warnings].some(value => ['rate_limited', 'timeout', 'request_failed', 'invalid_response', 'budget_exhausted', 'budget_unavailable'].includes(value))) {
      items.push(...uniqueIds.slice(index + 5).map(broadcasterId => ({ broadcasterId, followerCount: null })));
      break;
    }
  }
  return { items, coverage: {
    status: warnings.size ? (pagesRead ? 'partial' : 'unavailable') : 'complete',
    pagesRead, warnings: [...warnings],
  } };
}
