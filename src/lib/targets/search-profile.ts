import { nextCronOccurrence } from '@/lib/agents/worker/cron';
import type { CreatorSearchConfig, CreatorObservation } from '@/lib/schemas/creator-search-profile';

export function nextCreatorSearchAt(config: CreatorSearchConfig, after: Date): Date | null {
  if (!config.enabled) return null;
  const [hour, minute] = config.scheduleTime.split(':');
  if (hour === undefined || minute === undefined) throw new Error('invalid_creator_schedule');
  return nextCronOccurrence(`${Number(minute)} ${Number(hour)} * * *`, after, config.timezone);
}

/** Failed refreshes change availability, never overwrite the last valid observation. */
export function mergeCreatorObservation(
  previous: CreatorObservation | undefined,
  incoming: CreatorObservation,
): CreatorObservation {
  if (previous && Date.parse(incoming.synced_at) < Date.parse(previous.synced_at)) return previous;
  if (previous?.observed_at && incoming.observed_at
    && Date.parse(incoming.observed_at) < Date.parse(previous.observed_at)) {
    return { ...previous, synced_at: incoming.synced_at };
  }
  if (incoming.status === 'available' && incoming.value !== null) return incoming;
  if (!previous || previous.value === null) return { ...incoming, value: null, observed_at: null };
  return { ...previous, synced_at: incoming.synced_at, status: incoming.status === 'error' ? 'error' : 'stale' };
}

export function normalizeCreatorAccountKey(platform: string, id: string): string {
  // YouTube channel IDs are case-sensitive. Human handles on other providers are not.
  return `${platform}:${platform === 'youtube' && /^UC[\w-]{22}$/.test(id) ? id : id.trim().replace(/^@/, '').toLowerCase()}`;
}
