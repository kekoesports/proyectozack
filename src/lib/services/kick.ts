import { env } from '@/lib/env';
import { KickCategories, KickChannels, KickDiscoveryInput, KickLivestreams, KickSlug, KickToken, KickUsers } from '@/lib/schemas/kick-discovery';
import type { ProviderCoverage, ProviderWarning } from '@/lib/schemas/provider-availability';
import { DiscoveryReadError, readDiscoveryJson, type DiscoveryReadOptions } from './discovery-http';
import { CreatorDiscoveryBudgetError, CreatorDiscoveryDeadlineError } from './creator-discovery-deadline';

export const KICK_DISCOVERY_CAPABILITIES = {
  officialLiveCategoryDiscovery: true, exactChannelLookup: true, generalChannelSearch: false,
  followers: false, historicalStreams: false, clips: false, currentAudienceMayBeHidden: true,
  commercialUseRequiresReview: true,
} as const;

export type KickChannelPreview = {
  readonly slug: string; readonly username: string; readonly userId: number;
  readonly followers: number | null; readonly bio: string | null; readonly country: string | null;
  readonly profilePicUrl: string | null; readonly bannerUrl: string | null;
  readonly recentCategories: readonly string[]; readonly currentCategory: string | null;
  readonly isLive: boolean | null; readonly lastLivestreamAt: Date | null;
};
export type KickLiveCreator = {
  readonly userId: number; readonly username: string; readonly slug: string;
  readonly profilePicUrl: string | null; readonly category: string; readonly language: string;
  readonly title: string; readonly viewerCount: number | null; readonly startedAt: Date;
};
export type KickLiveCreatorsReport = { readonly items: KickLiveCreator[]; readonly coverage: ProviderCoverage };
let cachedToken: { value: string; expiresAt: number; clientId: string; secret: string } | null = null;

async function appToken(options: DiscoveryReadOptions): Promise<string> {
  if (options.signal?.aborted) throw new DiscoveryReadError('cancelled');
  const clientId = env.KICK_CLIENT_ID;
  const secret = env.KICK_CLIENT_SECRET;
  if (!clientId || !secret) throw new DiscoveryReadError('not_configured');
  if (cachedToken?.clientId === clientId && cachedToken.secret === secret
    && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const token = await readDiscoveryJson('https://id.kick.com/oauth/token', KickToken, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: secret }),
  }, options);
  cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000, clientId, secret };
  return token.access_token;
}

function warning(error: unknown): ProviderWarning {
  if (error instanceof CreatorDiscoveryBudgetError) return error.code;
  if (error instanceof CreatorDiscoveryDeadlineError) return 'timeout';
  if (error instanceof DiscoveryReadError) {
    if (error.code === 'unauthorized') cachedToken = null;
    if (error.code === 'timeout' || error.code === 'rate_limited' || error.code === 'invalid_response') return error.code;
  }
  return 'request_failed';
}

/** Bounded official V2 live observations; coverage is not a historical or worldwide census. */
export async function getKickLiveCreatorsReport(
  input: KickDiscoveryInput = {}, options: DiscoveryReadOptions = {},
): Promise<KickLiveCreatorsReport> {
  const parsed = KickDiscoveryInput.safeParse(input);
  if (!parsed.success) throw new DiscoveryReadError('invalid_input');
  const config = parsed.data;
  const items: KickLiveCreator[] = [];
  const warnings = new Set<ProviderWarning>();
  const cursors = new Set<string>();
  const users = new Set<number>();
  let pagesRead = 0;
  let cursor: string | undefined;
  try {
    const token = await appToken(options);
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
    const categoryQuery = new URLSearchParams({ name: config.categoryName, limit: '25' });
    const categories = await readDiscoveryJson(`https://api.kick.com/public/v2/categories?${categoryQuery}`,
      KickCategories, { headers }, options);
    const category = categories.data.find(row => row.name.toLowerCase() === config.categoryName.toLowerCase());
    if (!category) {
      if (!categories.pagination || categories.pagination.next_cursor) warnings.add('coverage_incomplete');
      return { items, coverage: { status: warnings.size ? 'partial' : 'complete', pagesRead, warnings: [...warnings] } };
    }
    do {
      const query = new URLSearchParams({ category_id: String(category.id), limit: String(config.pageSize) });
      config.languageCodes.forEach(language => query.append('language_code', language));
      if (cursor) query.set('cursor', cursor);
      const page = await readDiscoveryJson(`https://api.kick.com/public/v2/livestreams?${query}`,
        KickLivestreams, { headers }, options);
      if (page.data.length > config.pageSize || page.data.some(stream =>
        stream.category.id !== category.id || Date.parse(stream.started_at) > Date.now()
        || (config.languageCodes.length > 0 && !config.languageCodes.some(language =>
          language.toLowerCase() === stream.language_code.toLowerCase())))) {
        throw new DiscoveryReadError('invalid_response');
      }
      pagesRead++;
      if (!page.pagination) warnings.add('coverage_incomplete');
      for (const stream of page.data) {
        if (users.has(stream.broadcaster_user.id)) { warnings.add('duplicate_record'); continue; }
        users.add(stream.broadcaster_user.id);
        // No API min-audience parameter. Filter before the candidate cap, not before pagination.
        // Zero may mean hidden audience; it cannot prove any configured measured-viewer minimum.
        if (config.minViewerCount !== undefined
          && (stream.viewer_count === 0 || stream.viewer_count < config.minViewerCount)) continue;
        if (items.length >= config.limit) { warnings.add('coverage_incomplete'); continue; }
        items.push({
          userId: stream.broadcaster_user.id, username: stream.broadcaster_user.username,
          slug: stream.channel.slug, profilePicUrl: stream.broadcaster_user.profile_picture || null,
          category: stream.category.name, language: stream.language_code, title: stream.title,
          // Kick also uses zero when audience sharing is disabled; never rank that as a measured zero.
          viewerCount: stream.viewer_count > 0 ? stream.viewer_count : null,
          startedAt: new Date(stream.started_at),
        });
      }
      cursor = page.pagination?.next_cursor ?? undefined;
      if (cursor && cursors.has(cursor)) { warnings.add('repeated_cursor'); break; }
      if (cursor) cursors.add(cursor);
      if (cursor && items.length >= config.limit) { warnings.add('coverage_incomplete'); break; }
    } while (cursor && pagesRead < config.maxPages);
    if (cursor && pagesRead >= config.maxPages) warnings.add('page_limit');
  } catch (error) { warnings.add(warning(error)); }
  return { items, coverage: {
    status: warnings.size ? (pagesRead ? 'partial' : 'unavailable') : 'complete',
    pagesRead, warnings: [...warnings],
  } };
}

/** Compatibility wrapper. New orchestration must consume the report to retain partial coverage. */
export async function getKickCs2LiveCreators(limit = 100): Promise<KickLiveCreator[]> {
  return (await getKickLiveCreatorsReport({ limit })).items;
}

/** Exact official channel + user lookup. No private frontend API or invented follower/history metrics. */
export async function getKickChannel(slug: string, options: DiscoveryReadOptions = {}): Promise<KickChannelPreview | null> {
  const parsed = KickSlug.safeParse(slug);
  if (!parsed.success) throw new DiscoveryReadError('invalid_input');
  try {
    const token = await appToken(options);
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
    const query = new URLSearchParams({ slug: parsed.data });
    const channels = await readDiscoveryJson(`https://api.kick.com/public/v1/channels?${query}`,
      KickChannels, { headers }, options).catch((error: unknown) => {
        if (error instanceof DiscoveryReadError && error.status === 404) return null;
        throw error;
      });
    if (!channels) return null;
    if (channels.data.length === 0) return null;
    if (channels.data.length !== 1 || channels.data[0]?.slug !== parsed.data) throw new DiscoveryReadError('invalid_response');
    const channel = channels.data[0];
    const userQuery = new URLSearchParams({ id: String(channel.broadcaster_user_id) });
    const users = await readDiscoveryJson(`https://api.kick.com/public/v1/users?${userQuery}`, KickUsers, { headers }, options);
    const user = users.data.find(row => row.user_id === channel.broadcaster_user_id);
    if (!user) throw new DiscoveryReadError('invalid_response');
    const startedAt = channel.stream?.is_live && channel.stream.start_time ? new Date(channel.stream.start_time) : null;
    if (startedAt && startedAt.getTime() > Date.now()) throw new DiscoveryReadError('invalid_response');
    return {
      slug: channel.slug, username: user.name, userId: user.user_id, followers: null,
      bio: channel.channel_description ?? null, country: null, profilePicUrl: user.profile_picture || null,
      bannerUrl: channel.banner_picture || null, recentCategories: [], currentCategory: channel.category?.name ?? null,
      isLive: channel.stream?.is_live ?? null, lastLivestreamAt: startedAt,
    };
  } catch (error) {
    if (error instanceof DiscoveryReadError && error.code === 'unauthorized') cachedToken = null;
    throw error;
  }
}
