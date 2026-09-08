import { matchesLiveCategory, matchesTwitchCategory } from './live-category';

export const LIVE_SAMPLE_INTERVAL_MINUTES = 10;
// Twitch's standard developer terms allow a 24-hour cache. Keep the rolling
// measurement inside that boundary unless provider-backed evidence changes.
export const LIVE_AUDIENCE_WINDOW_DAYS = 1;
export const MINIMUM_MEASURED_MINUTES = 60;
export const MINIMUM_TWITCH_AVERAGE_VIEWERS = 80;
export const MINIMUM_TWITCH_CS2_CONTENT_SHARE = 0.3;
export const ALL_CATEGORY_SAMPLE_SOURCE_SUFFIX = ':all-categories-v2';

export type LiveAudienceQuality = 'green' | 'yellow' | 'red' | 'insufficient';

export type AudienceSample = Readonly<{
  platform: 'twitch' | 'kick';
  categoryName: string;
  viewerCount: number | null;
  observedAt: Date;
  streamStartedAt: Date;
  source: string;
}>;

export type LiveAudienceSummary = Readonly<{
  averageViewers: number | null;
  measuredMinutes: number;
  cs2MeasuredMinutes: number;
  cs2ContentShare: number | null;
  sampleCount: number;
  quality: LiveAudienceQuality;
}>;

export function liveSampleBucket(at: Date): Date {
  const interval = LIVE_SAMPLE_INTERVAL_MINUTES * 60_000;
  return new Date(Math.floor(at.getTime() / interval) * interval);
}

export function isCs2LiveCategory(platform: 'twitch' | 'kick', id: string, name: string): boolean {
  return platform === 'twitch'
    ? matchesTwitchCategory({ id, name }, 'Counter-Strike 2')
    : matchesLiveCategory(name, 'Counter-Strike 2');
}

/** Regular samples approximate a time-weighted mean; gaps never receive invented weight. */
export function summarizeLiveAudience(samples: readonly AudienceSample[]): LiveAudienceSummary {
  const measured = samples.filter((sample): sample is AudienceSample & { viewerCount: number } =>
    sample.source.endsWith(ALL_CATEGORY_SAMPLE_SOURCE_SUFFIX)
      && sample.viewerCount !== null && Number.isSafeInteger(sample.viewerCount) && sample.viewerCount >= 0)
    .sort((left, right) => left.observedAt.getTime() - right.observedAt.getTime());
  let weightedAudience = 0;
  let measuredMinutes = 0;
  let cs2MeasuredMinutes = 0;
  for (let index = 0; index < measured.length; index++) {
    const sample = measured[index];
    if (!sample) continue;
    const next = measured[index + 1];
    const sameStream = next?.streamStartedAt.getTime() === sample.streamStartedAt.getTime();
    const gapMinutes = sameStream ? (next.observedAt.getTime() - sample.observedAt.getTime()) / 60_000 : 0;
    const weight = sameStream && gapMinutes > 0
      ? Math.min(LIVE_SAMPLE_INTERVAL_MINUTES, gapMinutes)
      : LIVE_SAMPLE_INTERVAL_MINUTES;
    measuredMinutes += weight;
    weightedAudience += sample.viewerCount * weight;
    if (matchesLiveCategory(sample.categoryName, 'Counter-Strike 2')) cs2MeasuredMinutes += weight;
  }
  if (measuredMinutes < MINIMUM_MEASURED_MINUTES) {
    return { averageViewers: null, measuredMinutes, cs2MeasuredMinutes, cs2ContentShare: null,
      sampleCount: measured.length, quality: 'insufficient' };
  }
  const averageViewers = Math.round(weightedAudience / measuredMinutes);
  const cs2ContentShare = cs2MeasuredMinutes / measuredMinutes;
  const quality = averageViewers >= MINIMUM_TWITCH_AVERAGE_VIEWERS
    && cs2ContentShare >= MINIMUM_TWITCH_CS2_CONTENT_SHARE ? 'green' : 'red';
  return { averageViewers, measuredMinutes, cs2MeasuredMinutes, cs2ContentShare, sampleCount: measured.length, quality };
}
