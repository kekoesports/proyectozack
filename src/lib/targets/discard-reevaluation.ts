import { z } from 'zod';
import { creatorObservationSchema, creatorSearchProfileSchema, type CreatorObservation } from '@/lib/schemas/creator-search-profile';

export const CREATOR_REEVALUATION_VERSION = 'youtube-recent-publications-v1';
const DAY_MS = 86_400_000;
type Fields = Readonly<Record<string, CreatorObservation>>;
type Input = Readonly<{
  platform: string;
  reason: string;
  discardedAt: Date;
  baseline: Fields;
  incoming: Fields;
  searchConfig: unknown;
  now: Date;
}>;

/** Only evidence-bearing performance decisions may reopen; unknown/manual reasons remain suppressed. */
export function canReevaluateDiscard(input: Input): boolean {
  if (input.platform !== 'youtube' || !['audience_low', 'inactive'].includes(input.reason)) return false;
  const config = creatorSearchProfileSchema.safeParse(input.searchConfig);
  const now = input.now.getTime(), discarded = input.discardedAt.getTime();
  if (!config.success || !config.data.platforms.includes('youtube')
    || !Number.isFinite(now) || !Number.isFinite(discarded) || discarded >= now) return false;

  const read = (fields: Fields, key: string, source: string, fresh: boolean): CreatorObservation['value'] => {
    const result = creatorObservationSchema.safeParse(fields[key]);
    if (!result.success) return null;
    const item = result.data;
    if (item.status !== 'available' || item.confidence === 'LOW' || item.source !== source || !item.observed_at) return null;
    const observed = Date.parse(item.observed_at), synced = Date.parse(item.synced_at);
    if (synced < observed || synced > now || observed > now) return null;
    if (fresh ? observed <= discarded || now - observed > DAY_MS : observed > discarded || synced > discarded) return null;
    return item.value;
  };
  const number = (fields: Fields, key: string, source: string, fresh: boolean): number | null => {
    const value = read(fields, key, source, fresh);
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  };
  for (const [fields, fresh] of [[input.baseline, false], [input.incoming, true]] as const) {
    if (read(fields, 'qualificationVersion', 'crm:creator-reevaluation:version', fresh) !== CREATOR_REEVALUATION_VERSION
      || read(fields, 'recentPerformanceCoverage', 'crm:youtube:recent-performance-coverage', fresh) !== 'complete'
      || number(fields, 'recentWindowDays', 'crm:search-profile:windowDays', fresh) !== config.data.windowDays) return false;
  }
  // A score or a query match is not evidence of content fit. These are the actual fresh evaluation flags.
  if (read(input.incoming, 'contentMatch', 'crm:youtube:profile-content-match', true) !== true) return false;
  if (config.data.languages.length > 0) {
    const language = read(input.incoming, 'language', 'youtube:channels.list:defaultLanguage', true);
    if (typeof language !== 'string' || !config.data.languages.some(value =>
      value.toLowerCase().split('-')[0] === language.toLowerCase().split('-')[0])) return false;
  }
  if (!config.data.markets.includes('WORLDWIDE')) {
    const country = read(input.incoming, 'country', 'youtube:channels.list:country', true);
    if (typeof country !== 'string' || !config.data.markets.includes(country.toUpperCase())) return false;
  }
  const oldAudience = number(input.baseline, 'medianRecentVideoViews', 'youtube:videos.list:derived-median', false);
  const audience = number(input.incoming, 'medianRecentVideoViews', 'youtube:videos.list:derived-median', true);
  const oldCount = number(input.baseline, 'recentVideoCount', 'youtube:playlistItems.list:videoPublishedAt', false);
  const count = number(input.incoming, 'recentVideoCount', 'youtube:playlistItems.list:videoPublishedAt', true);
  const last = read(input.incoming, 'lastVideoPublishedAt', 'youtube:playlistItems.list:videoPublishedAt', true);
  const previousLast = read(input.baseline, 'lastVideoPublishedAt', 'youtube:playlistItems.list:videoPublishedAt', false);
  if (oldAudience === null || audience === null || oldCount === null || count === null
    || !Number.isInteger(count) || !Number.isInteger(oldCount)
    || count < config.data.minRecentVideos || audience < config.data.targetMedianViews
    || typeof last !== 'string' || typeof previousLast !== 'string') return false;
  const published = Date.parse(last), previousPublished = Date.parse(previousLast);
  if (!z.iso.datetime().safeParse(last).success || !z.iso.datetime().safeParse(previousLast).success
    || !Number.isFinite(published) || !Number.isFinite(previousPublished)
    || published > now || previousPublished > discarded || now - published > config.data.windowDays * DAY_MS) return false;
  return input.reason === 'audience_low' ? audience > oldAudience
    : published > discarded && published > previousPublished && count > oldCount;
}
