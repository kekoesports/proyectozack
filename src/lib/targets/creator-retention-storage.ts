import { creatorObservationSchema, type CreatorObservation } from '@/lib/schemas/creator-search-profile';
import type { CreateTargetInput } from '@/lib/schemas/target';
import { mergeCreatorObservation } from '@/lib/targets/search-profile';
import { retainCreatorFields, retainObservation, type RetentionEvidence } from './creator-retention';

/** Storage seals each field independently; failed refreshes cannot renew the previous lease. */
export function prepareRetainedCreatorFields(previous: RetentionEvidence, incoming: Readonly<Record<string, unknown>>,
  target: CreateTargetInput, now: Date): {
    fields: Record<string, CreatorObservation>; observedFields: Record<string, CreatorObservation>;
  } {
  const fields = retainCreatorFields(previous, now);
  const observedFields: Record<string, CreatorObservation> = {};
  for (const [key, raw] of Object.entries(incoming)) {
    const parsed = creatorObservationSchema.safeParse(raw);
    if (!parsed.success || Date.parse(parsed.data.synced_at) > now.getTime()) continue;
    const next = retainObservation(parsed.data, previous.retentionDays, now);
    // A missing/failed observation may change freshness but must not create a fresh value.
    const absent = parsed.data.value === null && parsed.data.observed_at === null ? parsed.data : null;
    if (!next && !absent) continue;
    const observation = next ?? absent;
    if (!observation) continue;
    observedFields[key] = observation;
    fields[key] = mergeCreatorObservation(fields[key], observation);
  }
  // The score and explanatory payload cannot outlive ANY of their retained provider inputs.
  const inputs = Object.entries(observedFields).filter(([key, value]) => !key.startsWith('processing:')
    && !key.startsWith('review:') && !value.source.startsWith('crm:') && value.expires_at && value.observed_at);
  const retentionDays = previous.retentionDays;
  if (inputs.length && retentionDays !== null && Number.isSafeInteger(retentionDays) && retentionDays > 0) {
    const observed = Math.min(...inputs.map(([, value]) => Date.parse(value.observed_at ?? '')));
    const expiry = Math.min(...inputs.map(([, value]) => Date.parse(value.expires_at ?? '')));
    const derived = (value: string | number, source: string): CreatorObservation => ({ value, source,
      observed_at: new Date(observed).toISOString(), synced_at: now.toISOString(),
      expires_at: new Date(expiry).toISOString(), retention_days: retentionDays, status: 'available', confidence: 'MEDIUM' });
    if (target.fitScore !== undefined) {
      observedFields.fitScore = derived(target.fitScore, 'crm:scoreCreatorFit');
      observedFields.fitReasons = derived(JSON.stringify(target.fitReasons ?? []), 'crm:scoreCreatorFit:reasons');
      observedFields.qualificationStatus = derived(target.qualificationStatus ?? 'review', 'crm:qualification-status');
    }
    if (observedFields.recentVideoCount) {
      if (target.avgRecentVideoViews !== undefined) observedFields.avgRecentVideoViews = derived(target.avgRecentVideoViews, 'crm:youtube:mean-views');
      if (target.minRecentVideoViews !== undefined) observedFields.minRecentVideoViews = derived(target.minRecentVideoViews, 'crm:youtube:min-views');
    }
    for (const key of ['fitScore', 'fitReasons', 'qualificationStatus', 'avgRecentVideoViews', 'minRecentVideoViews']) {
      const next = observedFields[key];
      if (next) fields[key] = mergeCreatorObservation(fields[key], next);
    }
  }
  return { fields, observedFields };
}
