import type { CreatorDiscoveryPlatformResult } from '@/db/schema/creatorDiscoveryRuns';
import { persistDiscoveredCreator, type DiscoveredCreatorInput } from '@/lib/queries/creatorIdentity';
import { finishCreatorDiscoveryRun, startCreatorDiscoveryRun } from '@/lib/queries/creatorDiscoveryRuns';
import { getCreatorProviderReadiness } from '@/lib/queries/creatorProviderReadiness';
import { createCreatorBudgetGuard } from '@/lib/queries/creatorDiscoveryBudget';
import { creatorSearchProfileSchema, DEFAULT_CREATOR_SEARCH_PROFILE, type CreatorSearchConfig, type CreatorPlatform } from '@/lib/schemas/creator-search-profile';
import type { ProviderCoverage } from '@/lib/schemas/provider-availability';
import { fetchTwitchFollowerCountsReport, fetchTwitchUserPhotosReport, getGameLiveStreams, searchTwitchGameCategories, type TwitchGameStream } from './twitch';
import { getChannelRecentPerformanceReport, searchYouTubeChannelsFromRecentVideosReport, type YouTubeChannelPreview } from './youtube';
import { getKickLiveCreatorsReport } from './kick';
import { isLikelyPublisherChannel } from '@/lib/targets/qualification';
import { creatorDiscoveryStatus, sumDiscoveryResults } from '@/lib/targets/discovery-result';
import { scoreCreatorFit, CREATOR_FIT_SCORE_VERSION } from '@/lib/targets/creator-fit-score';
import { enrichPublicCreator } from '@/lib/targets/creator-enrichment';
import { creatorObservation } from '@/lib/targets/creator-observations';
import { withCreatorDiscoveryDeadline, CreatorDiscoveryDeadlineError, CreatorDiscoveryBudgetError, type CreatorDiscoveryDeadline, type CreatorDiscoveryExecutionOptions } from './creator-discovery-deadline';

export type CreatorDiscoverySummary = {
  readonly runId: number;
  readonly status: 'success' | 'partial' | 'failed';
  readonly found: number;
  readonly qualified: number;
  readonly inserted: number;
  readonly updated: number;
  readonly platformResults: readonly CreatorDiscoveryPlatformResult[];
};

/** Existing persistence path. No messaging; permission gates precede every provider family. */
export async function runCreatorTargetDiscovery(
  trigger: 'manual' | 'scheduled', config: CreatorSearchConfig = DEFAULT_CREATOR_SEARCH_PROFILE,
  options: CreatorDiscoveryExecutionOptions = {},
): Promise<CreatorDiscoverySummary> {
  const parsed = creatorSearchProfileSchema.safeParse(config);
  if (!parsed.success) throw new Error('invalid_creator_search_config');
  return withCreatorDiscoveryDeadline(deadline => executeDiscovery(trigger, parsed.data, deadline), {
    beforeRequest: options.beforeRequest ?? createCreatorBudgetGuard('adhoc', parsed.data.searchPagesPerDay),
  });
}

async function executeDiscovery(
  trigger: 'manual' | 'scheduled', config: CreatorSearchConfig, deadline: CreatorDiscoveryDeadline,
): Promise<CreatorDiscoverySummary> {
  const parsed = creatorSearchProfileSchema.safeParse(config);
  if (!parsed.success) throw new Error('invalid_creator_search_config');
  const options = parsed.data;
  const platforms = [...new Set(options.platforms)];
  const runId = await startCreatorDiscoveryRun(trigger);
  const platformResults: CreatorDiscoveryPlatformResult[] = [];
  try {
    deadline.ensure();
    const gates = await getCreatorProviderReadiness();
    deadline.ensure();
    for (const platform of platforms) {
      const gate = gates.find(item => item.platform === platform);
      if (deadline.expired()) platformResults.push(notRun(platform, 'DEADLINE_EXCEEDED'));
      else if (!gate?.ready) platformResults.push(notRun(platform, gate?.code ?? 'READINESS_UNAVAILABLE'));
      else if (platform === 'youtube') platformResults.push(await discoverYouTubeTargets(options, deadline, runId));
      else if (platform === 'twitch') platformResults.push(await discoverTwitchTargets(options, deadline, runId));
      else if (platform === 'kick') platformResults.push(await discoverKickTargets(options, deadline, runId));
      // Official professional-account lookup is not a general keyword search engine.
      else platformResults.push(notRun(platform, 'KNOWN_PROFESSIONAL_USERNAME_REQUIRED'));
    }
  } catch {
    for (const platform of platforms.filter(value => !platformResults.some(row => row.platform === value))) {
      platformResults.push(notRun(platform, deadline.expired() ? 'DEADLINE_EXCEEDED' : 'READINESS_UNAVAILABLE'));
    }
  }
  // Final status bookkeeping is awaited even after cancellation; never leave a write running behind a race.
  await finishCreatorDiscoveryRun(runId, platformResults);
  return {
    runId, status: creatorDiscoveryStatus(platformResults),
    found: sumDiscoveryResults(platformResults, 'found'), qualified: sumDiscoveryResults(platformResults, 'qualified'),
    inserted: sumDiscoveryResults(platformResults, 'inserted'), updated: sumDiscoveryResults(platformResults, 'updated'), platformResults,
  };
}

type RunEvidence = { warnings: Set<string>; searchPages: number; candidateChecks: number; found: number };
const newEvidence = (): RunEvidence => ({ warnings: new Set(), searchPages: 0, candidateChecks: 0, found: 0 });
function recordCoverage(evidence: RunEvidence, coverage: ProviderCoverage): void {
  coverage.warnings.forEach(warning => evidence.warnings.add(warning));
  if (coverage.status !== 'complete' && !coverage.warnings.length) evidence.warnings.add('coverage_incomplete');
}
function stopsProvider(coverage: ProviderCoverage): boolean {
  return coverage.warnings.some(warning => ['rate_limited', 'timeout', 'request_failed', 'invalid_response', 'budget_exhausted', 'budget_unavailable'].includes(warning));
}
function normalized(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function contentMatch(text: string, config: CreatorSearchConfig): boolean | null {
  const value = normalized(text);
  return config.keywords.some(keyword => value.includes(normalized(keyword))) ? true : null;
}
function languageMatches(language: string | null, config: CreatorSearchConfig): boolean {
  return !config.languages.length || (!!language && config.languages.some(value =>
    language.toLowerCase().split('-')[0] === value.toLowerCase().split('-')[0]));
}
function marketMatches(country: string | null, config: CreatorSearchConfig): boolean {
  return config.markets.includes('WORLDWIDE') || (!!country && config.markets.includes(country.toUpperCase()));
}

async function discoverYouTubeTargets(config: CreatorSearchConfig, deadline: CreatorDiscoveryDeadline, runId: number): Promise<CreatorDiscoveryPlatformResult> {
  const evidence = newEvidence();
  try {
    const channels = new Map<string, { channel: YouTubeChannelPreview; query: string; observedAt: Date }>();
    const publishedAfter = new Date(Date.now() - config.windowDays * 86_400_000);
    let remaining = config.searchPagesPerDay;
    let stopped = false;
    for (const query of [...new Set(config.keywords)]) {
      deadline.ensure();
      if (!remaining || channels.size >= config.maxCandidatesPerPlatform) { evidence.warnings.add('search_budget_limit'); break; }
      // Invocation ceiling only, not a claim about the provider's daily quota ledger.
      remaining -= 1;
      const report = await searchYouTubeChannelsFromRecentVideosReport(query, {
        publishedAfter, maxResults: Math.min(50, config.maxCandidatesPerPlatform), maxPages: 1,
        ...(config.languages.length === 1 && config.languages[0] ? { language: config.languages[0] } : {}),
      });
      deadline.ensure();
      evidence.searchPages += report.coverage.pagesRead;
      recordCoverage(evidence, report.coverage);
      for (const channel of report.items) {
        if (!channels.has(channel.channelId)) channels.set(channel.channelId, { channel, query, observedAt: new Date() });
      }
      evidence.found = channels.size;
      if (stopsProvider(report.coverage)) { stopped = true; break; }
    }
    evidence.found = channels.size;
    const rows: DiscoveredCreatorInput[] = [];
    for (const { channel, query, observedAt } of [...channels.values()].slice(0, config.maxCandidatesPerPlatform)) {
      deadline.ensure();
      if (stopped) break;
      if (isLikelyPublisherChannel(`${channel.title} ${channel.description}`)) continue;
      if (!marketMatches(channel.country, config) || !languageMatches(channel.defaultLanguage, config)) {
        if (!channel.country || !channel.defaultLanguage) evidence.warnings.add('profile_filter_unverified');
        continue;
      }
      evidence.candidateChecks += 1;
      const report = await getChannelRecentPerformanceReport(channel.channelId, config.windowDays);
      deadline.ensure();
      recordCoverage(evidence, report.coverage);
      const performance = report.data;
      if (!performance || report.coverage.status !== 'complete') {
        if (stopsProvider(report.coverage)) break;
        continue;
      }
      if (performance.videoCount < config.minRecentVideos || performance.medianViews < config.targetMedianViews) continue;
      const score = scoreCreatorFit({
        contentMatch: contentMatch(`${channel.title} ${channel.description}`, config),
        audience: performance.medianViews, targetAudience: config.targetMedianViews,
        activityConfirmed: performance.videoCount >= config.minRecentVideos, growthPercent: null,
        marketMatch: true, professionalContact: null, brandReviewedMatch: null,
      });
      const now = new Date();
      rows.push({ externalId: channel.channelId, target: {
        username: channel.channelId, fullName: channel.title, platform: 'youtube',
        profileUrl: channel.handle ? `https://www.youtube.com/@${channel.handle}` : `https://www.youtube.com/channel/${channel.channelId}`,
        profilePicUrl: channel.thumbnailUrl ?? undefined, followers: channel.subscriberCount ?? undefined,
        bio: channel.description || undefined, countryCode: channel.country ?? undefined,
        defaultLanguage: channel.defaultLanguage ?? undefined, lastVideoAt: performance.lastVideoAt ?? undefined,
        recentVideoCount: performance.videoCount, minRecentVideoViews: performance.minViews,
        avgRecentVideoViews: performance.avgViews, recentVideosWindowDays: performance.windowDays,
        qualificationUpdatedAt: now, qualificationStatus: 'review', fitScore: score.score,
        fitReasons: [
          `${performance.videoCount} vídeos publicados en ${performance.windowDays} días; mediana ${performance.medianViews} vistas acumuladas observadas.`,
          'No son vistas obtenidas sólo durante ese período; no hay mínimo por peor vídeo.', ...score.reasons,
        ], sourceQuery: query, lastActivityAt: performance.lastVideoAt ?? undefined, lastDiscoveredAt: now,
        complianceStatus: 'manual-review', contactUrl: `https://www.youtube.com/channel/${channel.channelId}/about`,
        discoveredVia: `profile:youtube:${query}`,
      }, fields: {
        publicBio: creatorObservation(channel.description || null, 'official:youtube:channels.list:snippet.description', observedAt),
        followers: creatorObservation(channel.subscriberCount, 'youtube:channels.list:subscriberCount', observedAt),
        lifetimeViews: creatorObservation(channel.viewCount, 'youtube:channels.list:viewCount', observedAt),
        channelVideoCount: creatorObservation(channel.videoCount, 'youtube:channels.list:videoCount', observedAt),
        country: creatorObservation(channel.country, 'youtube:channels.list:country', observedAt),
        language: creatorObservation(channel.defaultLanguage, 'youtube:channels.list:defaultLanguage', observedAt),
        avatar: creatorObservation(channel.thumbnailUrl, 'youtube:channels.list:thumbnail', observedAt),
        recentVideoCount: creatorObservation(performance.videoCount, 'youtube:playlistItems.list:videoPublishedAt', now),
        medianRecentVideoViews: creatorObservation(performance.medianViews, 'youtube:videos.list:derived-median', now, 'unavailable', 'MEDIUM'),
        recentWindowDays: creatorObservation(performance.windowDays, 'crm:search-profile:windowDays', now),
        lastVideoPublishedAt: creatorObservation(performance.lastVideoAt?.toISOString() ?? null, 'youtube:playlistItems.list:videoPublishedAt', now),
      } });
    }
    return await persist('youtube', rows, evidence, deadline, runId);
  } catch (error) { return failed('youtube', error, evidence); }
}

async function discoverTwitchTargets(config: CreatorSearchConfig, deadline: CreatorDiscoveryDeadline, runId: number): Promise<CreatorDiscoveryPlatformResult> {
  if (!config.markets.includes('WORLDWIDE')) return notRun('twitch', 'COUNTRY_FILTER_UNAVAILABLE');
  const evidence = newEvidence();
  try {
    const channels = new Map<string, { channel: TwitchGameStream; query: string; observedAt: Date }>();
    const visited = new Set<string>();
    let remaining = config.searchPagesPerDay;
    let stopped = false;
    for (const query of [...new Set(config.keywords)]) {
      deadline.ensure();
      if (remaining < 2 || channels.size >= config.maxCandidatesPerPlatform || stopped) { evidence.warnings.add('search_budget_limit'); break; }
      remaining -= 1;
      const categories = await searchTwitchGameCategories(query);
      deadline.ensure();
      evidence.searchPages += categories.coverage.pagesRead;
      recordCoverage(evidence, categories.coverage);
      if (stopsProvider(categories.coverage)) { stopped = true; break; }
      for (const category of categories.items) {
        deadline.ensure();
        if (visited.has(category.id) || !remaining || channels.size >= config.maxCandidatesPerPlatform) continue;
        if (!contentMatch(category.name, config)) continue;
        visited.add(category.id);
        const pages = Math.min(3, remaining);
        remaining -= pages;
        const report = await getGameLiveStreams(category.id, pages);
        deadline.ensure();
        evidence.searchPages += report.coverage.pagesRead;
        recordCoverage(evidence, report.coverage);
        for (const channel of report.items) {
          if (languageMatches(channel.language, config) && !channels.has(channel.broadcasterId)) {
            channels.set(channel.broadcasterId, { channel, query, observedAt: new Date() });
          }
        }
        evidence.found = channels.size;
        if (stopsProvider(report.coverage)) { stopped = true; break; }
      }
    }
    evidence.found = channels.size;
    const candidates = [...channels.values()].slice(0, config.maxCandidatesPerPlatform);
    if (channels.size > candidates.length) evidence.warnings.add('candidate_limit');
    deadline.ensure();
    const followers = stopped ? null : await fetchTwitchFollowerCountsReport(candidates.map(item => item.channel.broadcasterId));
    deadline.ensure();
    const followersAt = new Date();
    if (followers) recordCoverage(evidence, followers.coverage);
    const followerMap = new Map(followers?.items.map(item => [item.broadcasterId, item.followerCount]) ?? []);
    const photos = stopped || (followers && stopsProvider(followers.coverage)) ? null
      : await fetchTwitchUserPhotosReport(candidates.map(item => item.channel.broadcasterId));
    deadline.ensure();
    const photosAt = new Date();
    if (photos) recordCoverage(evidence, photos.coverage);
    const photoMap = new Map(photos?.items.map(item => [item.userId, item.profileImageUrl]) ?? []);
    const now = new Date();
    const rows: DiscoveredCreatorInput[] = candidates.flatMap(({ channel, query, observedAt }) => {
      evidence.candidateChecks += 1;
      const count = followerMap.get(channel.broadcasterId) ?? null;
      // Existing live-prospect audience thresholds; a single observation is not historical CCV.
      if (!((count !== null && count >= 250) || (channel.viewerCount !== null && channel.viewerCount >= 20))) return [];
      const score = scoreCreatorFit({ contentMatch: true, audience: channel.viewerCount, targetAudience: 20,
        activityConfirmed: true, growthPercent: null, marketMatch: true, professionalContact: null, brandReviewedMatch: null });
      return [{ externalId: channel.broadcasterId, target: {
        username: channel.login.toLowerCase(), fullName: channel.displayName, platform: 'twitch',
        profileUrl: `https://www.twitch.tv/${channel.login}`, followers: count ?? undefined,
        profilePicUrl: photoMap.get(channel.broadcasterId),
        defaultLanguage: channel.language || undefined, qualificationStatus: 'review', fitScore: score.score,
        fitReasons: ['Espectadores en directo: observación puntual, no media histórica.', ...score.reasons],
        sourceQuery: query, lastActivityAt: new Date(channel.startedAt), lastDiscoveredAt: now,
        complianceStatus: 'manual-review', contactUrl: `https://www.twitch.tv/${channel.login}/about`,
        discoveredVia: `profile:twitch:${query}`, enrichedAt: now,
      }, fields: {
        followers: creatorObservation(count, 'twitch:channels/followers:total', followersAt, followers?.coverage.status === 'complete' ? 'unavailable' : 'error'),
        currentViewers: creatorObservation(channel.viewerCount, 'twitch:streams:viewer_count', observedAt),
        streamId: creatorObservation(channel.streamId, 'twitch:streams:id', observedAt),
        streamStartedAt: creatorObservation(channel.startedAt, 'twitch:streams:started_at', observedAt),
        language: creatorObservation(channel.language || null, 'twitch:streams:language', observedAt),
        category: creatorObservation(channel.currentGame, 'twitch:streams:game_name', observedAt),
        avatar: creatorObservation(photoMap.get(channel.broadcasterId) ?? null, 'twitch:users:profile_image_url', photosAt, photos?.coverage.status === 'complete' ? 'unavailable' : 'error'),
      } }];
    });
    return await persist('twitch', rows, evidence, deadline, runId);
  } catch (error) { return failed('twitch', error, evidence); }
}

async function discoverKickTargets(config: CreatorSearchConfig, deadline: CreatorDiscoveryDeadline, runId: number): Promise<CreatorDiscoveryPlatformResult> {
  if (!config.markets.includes('WORLDWIDE')) return notRun('kick', 'COUNTRY_FILTER_UNAVAILABLE');
  const evidence = newEvidence();
  try {
    const rows = new Map<string, DiscoveredCreatorInput>();
    const found = new Set<string>();
    let remaining = config.searchPagesPerDay;
    for (const query of [...new Set(config.keywords)]) {
      deadline.ensure();
      if (!remaining || rows.size >= config.maxCandidatesPerPlatform) { evidence.warnings.add('search_budget_limit'); break; }
      const pages = Math.min(3, remaining); remaining -= pages;
      const report = await getKickLiveCreatorsReport({ categoryName: query, languageCodes: config.languages,
        limit: config.maxCandidatesPerPlatform, maxPages: pages }, { signal: deadline.signal, maxRetries: 0 });
      deadline.ensure();
      evidence.searchPages += report.coverage.pagesRead;
      recordCoverage(evidence, report.coverage);
      for (const creator of report.items) {
        const externalId = String(creator.userId);
        if (found.has(externalId)) continue;
        found.add(externalId); evidence.candidateChecks += 1;
        evidence.found = found.size;
        if (rows.size >= config.maxCandidatesPerPlatform || !languageMatches(creator.language, config)
          || isLikelyPublisherChannel(`${creator.username} ${creator.title}`)) continue;
        if (creator.viewerCount === null || creator.viewerCount < 20) continue;
        const score = scoreCreatorFit({ contentMatch: contentMatch(creator.category, config), audience: creator.viewerCount,
          targetAudience: 20, activityConfirmed: true, growthPercent: null, marketMatch: true,
          professionalContact: null, brandReviewedMatch: null });
        const now = new Date();
        rows.set(externalId, { externalId, target: { username: creator.slug.toLowerCase(), fullName: creator.username, platform: 'kick',
          profileUrl: `https://kick.com/${creator.slug}`, profilePicUrl: creator.profilePicUrl ?? undefined,
          followers: undefined, defaultLanguage: creator.language || undefined,
          qualificationStatus: 'review', fitScore: score.score,
          fitReasons: ['Seguidores no disponibles. Directo puntual, no media histórica.', ...score.reasons],
          sourceQuery: query, lastActivityAt: creator.startedAt, lastDiscoveredAt: now,
          complianceStatus: 'manual-review', contactUrl: `https://kick.com/${creator.slug}`,
          discoveredVia: `profile:kick:${query}`, enrichedAt: now }, fields: {
          followers: creatorObservation(null, 'kick:public-api:followers-unavailable', now),
          streamTitle: creatorObservation(creator.title || null, 'official:kick:livestreams:stream_title', now),
          currentViewers: creatorObservation(creator.viewerCount, 'kick:livestreams:viewer_count', now),
          streamStartedAt: creatorObservation(creator.startedAt.toISOString(), 'kick:livestreams:started_at', now),
          category: creatorObservation(creator.category, 'kick:livestreams:category', now),
          language: creatorObservation(creator.language || null, 'kick:livestreams:language_code', now),
          avatar: creatorObservation(creator.profilePicUrl, 'kick:livestreams:profile_picture', now),
        } });
      }
      if (stopsProvider(report.coverage)) break;
    }
    evidence.found = found.size;
    return await persist('kick', [...rows.values()], evidence, deadline, runId);
  } catch (error) { return failed('kick', error, evidence); }
}

async function persist(platform: CreatorPlatform, rows: DiscoveredCreatorInput[], evidence: RunEvidence,
  deadline: CreatorDiscoveryDeadline, runId: number): Promise<CreatorDiscoveryPlatformResult> {
  let inserted = 0, updated = 0, qualified = 0;
  for (const row of rows) {
    if (deadline.expired()) { evidence.warnings.add('deadline_exceeded'); break; }
    // Atomic identity + observations + target write, always awaited, never raced.
    try {
      const enriched = enrichForReview(row, evidence);
      deadline.ensure();
      const result = await persistDiscoveredCreator({ ...enriched, runId });
      inserted += result.inserted; updated += result.updated;
      if (result.identityReview) evidence.warnings.add('identity_review_required');
      else if (!result.represented) qualified += 1;
      if (deadline.expired()) { evidence.warnings.add('deadline_exceeded'); break; }
    } catch (error) { evidence.warnings.add(error instanceof CreatorDiscoveryDeadlineError ? 'deadline_exceeded' : 'persistence_failed'); break; }
  }
  const incomplete = evidence.warnings.size > 0;
  const budgetStopped = evidence.warnings.has('budget_exhausted') || evidence.warnings.has('budget_unavailable');
  const status = incomplete ? !budgetStopped && evidence.searchPages === 0 && evidence.candidateChecks === 0 ? 'failed' : 'partial' : 'success';
  return { platform, status, found: evidence.found, qualified,
    inserted, updated, warnings: [...evidence.warnings],
    usage: { searchPages: evidence.searchPages, candidateChecks: evidence.candidateChecks },
    error: incomplete ? 'Cobertura parcial: consulta las incidencias; no equivale a una búsqueda completa.' : null };
}

/** Only actual public biographies enter extraction; live titles are not biographies. */
function enrichForReview(row: DiscoveredCreatorInput, evidence: RunEvidence): DiscoveredCreatorInput {
  const now = new Date();
  const publicBio = row.fields.publicBio;
  const hasBio = typeof publicBio?.value === 'string' && publicBio.status === 'available' && publicBio.observed_at !== null;
  const result = enrichPublicCreator({ syncedAt: now.toISOString(), professionalPublicFields: [],
    ...(hasBio ? { bio: { value: publicBio.value, source: publicBio.source, observedAt: publicBio.observed_at } } : {}),
  });
  const fields = { ...row.fields,
    'processing:scoring': creatorObservation(CREATOR_FIT_SCORE_VERSION, 'crm:scoreCreatorFit', now),
    'processing:enrichment': creatorObservation(!result.ok ? 'invalid_public_input'
      : hasBio ? 'public_bio_extracted_for_review' : 'no_public_bio_available', 'crm:enrichPublicCreator', now),
  };
  if (!result.ok) { evidence.warnings.add('enrichment_invalid_input'); return { ...row, fields }; }
  for (const warning of result.warnings) evidence.warnings.add(`enrichment:${warning}`);
  const reviewFields = Object.fromEntries(Object.entries(result.fields).map(([key, value]) => [`review:${key}`, value]));
  const links = Object.fromEntries(result.crosslinks.map((link, index) => [`review:crosslink:${link.platform}:${index}`, link.observation]));
  // These suggestions cannot overwrite manual target contacts or become verified CONTACTABILITY.
  // Namespaced fields and explicit flags retain the helper's review-only/no-auto-merge contract.
  return { ...row, fields: { ...fields, ...reviewFields, ...links,
    'review:requiresReview': creatorObservation(true, 'crm:enrichPublicCreator', now),
    'review:autoMerge': creatorObservation(false, 'crm:enrichPublicCreator', now),
  } };
}

function notRun(platform: CreatorPlatform, code: string): CreatorDiscoveryPlatformResult {
  return { platform, status: code === 'DEADLINE_EXCEEDED' ? 'partial' : 'skipped', found: 0, qualified: 0, inserted: 0, updated: 0,
    error: 'No ejecutado: falta una condición verificable para esta búsqueda.', warnings: [code],
    usage: { searchPages: 0, candidateChecks: 0 } };
}
function failed(platform: CreatorPlatform, error: unknown, evidence: RunEvidence): CreatorDiscoveryPlatformResult {
  const timedOut = error instanceof CreatorDiscoveryDeadlineError;
  const budgetStopped = error instanceof CreatorDiscoveryBudgetError;
  return { platform, status: timedOut || budgetStopped ? 'partial' : 'failed', found: evidence.found, qualified: 0, inserted: 0, updated: 0,
    error: timedOut ? 'Tiempo máximo de búsqueda agotado; no se iniciarán más consultas ni escrituras de perfiles.' : safeCreatorDiscoveryError(error, platform),
    warnings: [...evidence.warnings, timedOut ? 'deadline_exceeded' : budgetStopped ? error.code : 'provider_failure'],
    usage: { searchPages: evidence.searchPages, candidateChecks: evidence.candidateChecks } };
}
export function safeCreatorDiscoveryError(error: unknown, platform: CreatorPlatform): string {
  const message = error instanceof Error ? error.message : '';
  if (platform === 'twitch' && message.includes('Twitch token error')) return 'Twitch ha rechazado las credenciales configuradas';
  if (platform === 'kick' && message.includes('Kick token error')) return 'Kick ha rechazado las credenciales configuradas';
  if (message.includes('YOUTUBE_API_KEY') || message.includes('TWITCH_CLIENT') || message.includes('KICK_CLIENT')) {
    return 'Credenciales de plataforma no disponibles';
  }
  return message.includes('403') ? 'La plataforma rechazó la consulta o agotó su cuota'
    : 'No se pudo completar la consulta de esta plataforma';
}
