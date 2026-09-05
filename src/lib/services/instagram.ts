import {
  InstagramBusinessDiscovery, InstagramDiscoveryConfig, InstagramDiscoveryOptions, InstagramUsername,
} from '@/lib/schemas/instagram-discovery';
import type { ProviderCoverage, ProviderWarning } from '@/lib/schemas/provider-availability';
import { DiscoveryReadError, readDiscoveryJson, type DiscoveryErrorCode, type DiscoveryReadOptions } from './discovery-http';

export type InstagramCapabilities = {
  readonly ready: boolean;
  readonly exactProfessionalLookup: boolean;
  readonly generalProfileSearch: false;
  readonly hashtagDiscoveryImplemented: false;
  readonly thirdPartyInsights: false;
  readonly connectedAccountInsightsImplemented: false;
  readonly missingConfiguration: readonly string[];
  readonly missingPermissions: readonly string[];
  readonly purposeAndRetentionReviewRequired: true;
};

/** Technical preflight only. It neither accepts terms nor verifies that Meta approved the app's purpose. */
export function getInstagramDiscoveryCapabilities(input: InstagramDiscoveryConfig): InstagramCapabilities {
  const parsed = InstagramDiscoveryConfig.safeParse(input);
  const missingConfiguration: string[] = [];
  const missingPermissions: string[] = [];
  if (!parsed.success) missingConfiguration.push('valid_configuration');
  const config = parsed.success ? parsed.data : null;
  if (config) {
    if (config.loginMode !== 'facebook') missingConfiguration.push('facebook_login');
    if (!config.accessToken) missingConfiguration.push('access_token');
    if (!config.ownInstagramUserId) missingConfiguration.push('connected_professional_account');
    for (const permission of ['instagram_basic', 'instagram_manage_insights', 'pages_read_engagement']) {
      if (!config.grantedPermissions.includes(permission)) missingPermissions.push(permission);
    }
    if (config.pageRoleViaBusinessManager && !config.grantedPermissions.some(value => value === 'ads_read' || value === 'ads_management')) {
      missingPermissions.push('ads_read_or_ads_management');
    }
  }
  return {
    ready: missingConfiguration.length === 0 && missingPermissions.length === 0,
    exactProfessionalLookup: config?.loginMode === 'facebook',
    generalProfileSearch: false, hashtagDiscoveryImplemented: false, thirdPartyInsights: false,
    connectedAccountInsightsImplemented: false, missingConfiguration, missingPermissions,
    purposeAndRetentionReviewRequired: true,
  };
}

export type InstagramPublicMedia = {
  readonly id: string; readonly mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  readonly permalink: string | null; readonly publishedAt: string | null;
  readonly caption: string | null; readonly likes: number | null; readonly comments: number | null;
  /** Public views may include paid AND organic views; not a reach or organic-performance metric. */
  readonly views: number | null;
};
export type InstagramProfessionalProfile = {
  readonly id: string; readonly username: string; readonly profileUrl: string; readonly accountType: 'professional';
  readonly biography: string | null; readonly website: string | null;
  readonly followers: number | null; readonly mediaCount: number | null;
  readonly profilePicUrl: null; readonly country: null;
  readonly media: readonly InstagramPublicMedia[];
};
export type InstagramDiscoveryReport = {
  readonly profile: InstagramProfessionalProfile | null;
  readonly coverage: ProviderCoverage;
  readonly capabilities: InstagramCapabilities;
  readonly error: { readonly code: DiscoveryErrorCode | 'missing_permission' | 'unavailable_profile'; readonly status: number | null } | null;
};
type Options = InstagramDiscoveryOptions & DiscoveryReadOptions;

function safeWarning(error: unknown): ProviderWarning {
  if (error instanceof DiscoveryReadError && ['rate_limited', 'timeout', 'invalid_response'].includes(error.code)) {
    if (error.code === 'rate_limited') return 'rate_limited';
    if (error.code === 'timeout') return 'timeout';
    return 'invalid_response';
  }
  return 'request_failed';
}

/** Exact known professional username only. Config is injected; no env reads, scraping, OAuth or contact. */
export async function lookupInstagramProfessional(
  username: string, input: InstagramDiscoveryConfig, options: Options = {},
): Promise<InstagramDiscoveryReport> {
  const capabilities = getInstagramDiscoveryCapabilities(input);
  const parsedConfig = InstagramDiscoveryConfig.safeParse(input);
  const parsedName = InstagramUsername.safeParse(username);
  const parsedOptions = InstagramDiscoveryOptions.safeParse(options);
  if (!capabilities.ready || !parsedConfig.success || !parsedName.success || !parsedOptions.success) {
    return { profile: null, capabilities, coverage: { status: 'unavailable', pagesRead: 0, warnings: [] },
      error: { code: !parsedName.success || !parsedOptions.success ? 'invalid_input'
        : capabilities.missingPermissions.length ? 'missing_permission' : 'not_configured', status: null } };
  }
  const config = parsedConfig.data;
  const settings = parsedOptions.data;
  const token = config.accessToken;
  const ownId = config.ownInstagramUserId;
  if (!token || !ownId) throw new DiscoveryReadError('not_configured');
  const media: InstagramPublicMedia[] = [];
  const ids = new Set<string>();
  const cursors = new Set<string>();
  const warnings = new Set<ProviderWarning>();
  let profile: InstagramProfessionalProfile | null = null;
  let pagesRead = 0;
  let after: string | undefined;
  let error: InstagramDiscoveryReport['error'] = null;
  try {
    do {
      const edge = `media.limit(${settings.pageSize})${after ? `.after(${after})` : ''}`;
      const fields: string = `business_discovery.username(${parsedName.data}){id,username,biography,website,followers_count,media_count,${edge}{id,media_type,permalink,timestamp,caption,like_count,comments_count,view_count}}`;
      const query = new URLSearchParams({ fields });
      const result = await readDiscoveryJson(`https://graph.facebook.com/${config.apiVersion}/${ownId}?${query}`,
        InstagramBusinessDiscovery, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }, options);
      const current = result.business_discovery;
      if (!current) {
        error = { code: 'unavailable_profile', status: null };
        warnings.add('coverage_incomplete');
        break;
      }
      if (current.username !== parsedName.data || (profile && current.id !== profile.id)
        || (current.media && current.media.data.length > settings.pageSize)
        || current.media?.data.some(item => item.timestamp && Date.parse(item.timestamp) > Date.now())) {
        throw new DiscoveryReadError('invalid_response');
      }
      pagesRead++;
      if (!profile) profile = {
        id: current.id, username: current.username, profileUrl: `https://www.instagram.com/${current.username}/`,
        accountType: 'professional', biography: current.biography ?? null, website: current.website || null,
        followers: current.followers_count ?? null, mediaCount: current.media_count ?? null,
        profilePicUrl: null, country: null, media,
      };
      if (!current.media) { warnings.add('coverage_incomplete'); break; }
      for (const item of current.media.data) {
        if (ids.has(item.id)) { warnings.add('duplicate_record'); continue; }
        ids.add(item.id);
        if (media.length >= settings.maxMedia) { warnings.add('coverage_incomplete'); continue; }
        media.push({
          id: item.id, mediaType: item.media_type, permalink: item.permalink ?? null,
          publishedAt: item.timestamp ?? null, caption: item.caption ?? null,
          likes: item.like_count ?? null, comments: item.comments_count ?? null, views: item.view_count ?? null,
        });
      }
      after = current.media.paging?.cursors?.after ?? undefined;
      if (after && cursors.has(after)) { warnings.add('repeated_cursor'); break; }
      if (after) cursors.add(after);
      if (after && media.length >= settings.maxMedia) { warnings.add('coverage_incomplete'); break; }
    } while (after && pagesRead < settings.maxPages);
    if (after && pagesRead >= settings.maxPages) warnings.add('page_limit');
  } catch (caught) {
    warnings.add(safeWarning(caught));
    error = { code: caught instanceof DiscoveryReadError ? caught.code : 'request_failed',
      status: caught instanceof DiscoveryReadError ? caught.status : null };
  }
  return {
    profile, capabilities, error,
    coverage: { status: warnings.size || error ? (profile ? 'partial' : 'unavailable') : 'complete',
      pagesRead, warnings: [...warnings] },
  };
}
