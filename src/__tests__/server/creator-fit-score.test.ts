import { scoreCreatorFit } from '@/lib/targets/creator-fit-score';
import { creatorProviderGate } from '@/lib/targets/provider-readiness';

describe('evidence based score', () => {
  const input = { contentMatch: true, audience: 1000, targetAudience: 1000, activityConfirmed: true,
    growthPercent: null, marketMatch: true, professionalContact: null, brandReviewedMatch: null };
  it('shows every component and no invented growth/contact/brand approval', () => {
    const result = scoreCreatorFit(input);
    expect(result.score).toBe(70);
    expect(result.breakdown).toHaveLength(7);
    expect(result.breakdown.reduce((sum, item) => sum + item.max, 0)).toBe(100);
    expect(result.breakdown.find((item) => item.key === 'GROWTH')?.earned).toBe(0);
  });
  it('distinguishes unavailable audience from a measured zero', () => {
    const unknown = scoreCreatorFit({ ...input, audience: null });
    const zero = scoreCreatorFit({ ...input, audience: 0 });
    expect(unknown.score).toBe(zero.score);
    expect(unknown.reasons).not.toEqual(zero.reasons);
  });
  it('cannot award more than 100 or negative points', () => {
    const full = scoreCreatorFit({ ...input, audience: 1e9, growthPercent: 1e6, professionalContact: true, brandReviewedMatch: true });
    expect(full.score).toBe(100);
    expect(scoreCreatorFit({ ...input, growthPercent: -200 }).score).toBe(70);
  });
});

describe('provider-purpose preflight', () => {
  const now = new Date('2026-09-05T15:00:00Z');
  it('valid credentials alone never imply approval', () => {
    expect(creatorProviderGate('twitch', true, undefined, now).code).toBe('PROVIDER_APPROVAL_REQUIRED');
    expect(creatorProviderGate('kick', false, undefined, now).code).toBe('CREDENTIALS_REQUIRED');
  });
  it('requires documented reviewed current permission', () => {
    const approved = { commercialApproved: true, derivedMetricsApproved: true, retentionDays: 30,
      evidenceRef: 'fixture-provider-permission', reviewedBy: 'fixture-reviewer', reviewedAt: new Date('2026-09-04Z'), validUntil: null };
    expect(creatorProviderGate('youtube', true, approved, now).ready).toBe(true);
    expect(creatorProviderGate('youtube', true, { ...approved, validUntil: new Date('2026-09-01Z') }, now).ready).toBe(false);
    expect(creatorProviderGate('youtube', true, { ...approved, evidenceRef: '' }, now).ready).toBe(false);
  });
});
