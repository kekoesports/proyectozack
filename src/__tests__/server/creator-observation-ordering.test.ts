import { mergeCreatorObservation } from '@/lib/targets/search-profile';
import { creatorProviderGate, type CreatorProviderPermission } from '@/lib/targets/provider-readiness';
import type { CreatorObservation } from '@/lib/schemas/creator-search-profile';

const now = new Date('2026-09-05T10:00:00Z');
const lastGood: CreatorObservation = {
  value: 1200, source: 'official:synthetic', observed_at: '2026-09-05T09:00:00Z',
  synced_at: '2026-09-05T09:05:00Z', status: 'available', confidence: 'HIGH',
};
const permission: CreatorProviderPermission = {
  commercialApproved: true, derivedMetricsApproved: true, retentionDays: 30,
  evidenceRef: 'synthetic-policy-evidence', reviewedBy: 'synthetic-reviewer',
  reviewedAt: new Date('2026-09-04T10:00:00Z'), validUntil: null,
};

describe('monotonic observations and last-good boundaries', () => {
  it('does not replace a newer observation with an older available result arriving late', () => {
    const result = mergeCreatorObservation(lastGood, { ...lastGood, value: 100,
      observed_at: '2026-09-04T09:00:00Z', synced_at: '2026-09-05T10:00:00Z' });
    expect(result.value).toBe(1200);
    expect(result.observed_at).toBe(lastGood.observed_at);
  });
  it('does not regress sync time or mark newer good data failed after an older failed request completes', () => {
    const result = mergeCreatorObservation(lastGood, { ...lastGood, value: null, observed_at: null,
      status: 'error', synced_at: '2026-09-05T08:00:00Z' });
    expect(result).toEqual(lastGood);
  });
  it.each(['error', 'unavailable', 'stale'] as const)('retains the real value on a current %s result', (status) => {
    const result = mergeCreatorObservation(lastGood, { ...lastGood, value: null, observed_at: null,
      synced_at: '2026-09-05T10:00:00Z', status });
    expect(result.value).toBe(1200);
    expect(result.observed_at).toBe(lastGood.observed_at);
    expect(result.status).toBe(status === 'error' ? 'error' : 'stale');
  });
  it('accepts an observed genuine zero rather than treating it as unavailable', () => {
    expect(mergeCreatorObservation(lastGood, { ...lastGood, value: 0,
      observed_at: '2026-09-05T10:00:00Z', synced_at: '2026-09-05T10:00:00Z' }).value).toBe(0);
  });
});

describe('commercial provider approval boundary', () => {
  it('requires credentials and explicit commercial and derived-metric authority', () => {
    expect(creatorProviderGate('youtube', false, permission, now).ready).toBe(false);
    expect(creatorProviderGate('youtube', true, undefined, now).ready).toBe(false);
    expect(creatorProviderGate('youtube', true, { ...permission, commercialApproved: false }, now).ready).toBe(false);
    expect(creatorProviderGate('youtube', true, { ...permission, derivedMetricsApproved: false }, now).ready).toBe(false);
  });
  it.each([
    { evidenceRef: ' ' }, { reviewedBy: null }, { reviewedAt: null },
    { reviewedAt: new Date('2026-09-06T00:00:00Z') }, { validUntil: now }, { retentionDays: 0 },
  ])('rejects incomplete, future or expired review metadata %p', (invalid) => {
    expect(creatorProviderGate('youtube', true, { ...permission, ...invalid }, now).ready).toBe(false);
  });
  it('accepts the complete active permission fixture', () => {
    expect(creatorProviderGate('youtube', true, permission, now)).toMatchObject({ ready: true, code: 'READY' });
  });
});
