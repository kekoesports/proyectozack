import type { CreatorObservation } from '@/lib/schemas/creator-search-profile';

/** Observation time is retrieval time; event timestamps belong in value, never invented as history. */
export function creatorObservation(
  value: CreatorObservation['value'], source: string, syncedAt: Date,
  unavailableStatus: 'unavailable' | 'error' = 'unavailable', confidence: CreatorObservation['confidence'] = 'HIGH',
): CreatorObservation {
  const timestamp = syncedAt.toISOString();
  return { value, source, synced_at: timestamp, observed_at: value === null ? null : timestamp,
    status: value === null ? unavailableStatus : 'available', confidence: value === null ? 'LOW' : confidence };
}
