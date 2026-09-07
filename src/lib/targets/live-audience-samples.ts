import { matchesLiveCategory, matchesTwitchCategory } from './live-category';

export const LIVE_SAMPLE_INTERVAL_MINUTES = 10;
export const LIVE_AUDIENCE_WINDOW_DAYS = 30;
export const MINIMUM_MEASURED_MINUTES = 60;

export type LiveAudienceQuality = 'green' | 'yellow' | 'red' | 'insufficient';

export type AudienceSample = Readonly<{
  viewerCount: number | null;
  observedAt: Date;
  streamStartedAt: Date;
}>;

export type LiveAudienceSummary = Readonly<{
  averageViewers: number | null;
  measuredMinutes: number;
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
    sample.viewerCount !== null && Number.isSafeInteger(sample.viewerCount) && sample.viewerCount >= 0)
    .sort((left, right) => left.observedAt.getTime() - right.observedAt.getTime());
  let weightedAudience = 0;
  let measuredMinutes = 0;
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
  }
  if (measuredMinutes < MINIMUM_MEASURED_MINUTES) {
    return { averageViewers: null, measuredMinutes, sampleCount: measured.length, quality: 'insufficient' };
  }
  const averageViewers = Math.round(weightedAudience / measuredMinutes);
  const quality = averageViewers >= 90 ? 'green' : averageViewers >= 70 ? 'yellow' : 'red';
  return { averageViewers, measuredMinutes, sampleCount: measured.length, quality };
}
