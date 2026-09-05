import { creatorMetricMirrors, nextCreatorExpiry, projectCreatorTarget, retainCreatorFields, retainObservation } from '@/lib/targets/creator-retention';
import { prepareRetainedCreatorFields } from '@/lib/targets/creator-retention-storage';
import { BEFORE, NOW, observed, targetFixture } from './creator-retention-fixtures';

const expiry = new Date('2026-09-06T12:00:00Z');
const evidence = { fields: { followers: observed(1234) }, expiresAt: expiry, retentionDays: 2 };
const target = { platform: 'youtube', username: 'synthetic', profileUrl: 'https://example.invalid/synthetic' } as const;

it('expires at the exact TTL boundary, not one millisecond later', () => {
  expect(retainObservation(observed(1), 1, new Date(NOW.getTime() - 1))?.value).toBe(1);
  expect(retainObservation(observed(1), 1, NOW)).toBeNull();
});
it('preserves a measured zero while null stays unavailable', () => {
  expect(retainObservation(observed(0), 2, NOW)?.value).toBe(0);
  expect(retainObservation(observed(null), 2, NOW)).toBeNull();
});
it.each([null, 0, -1, 1.2, Infinity])('fails closed without a valid recorded retention interval: %p', days => {
  expect(retainObservation(observed(3), days, NOW)).toBeNull();
});
it('does not use sync time for an absent or expired observation', () => {
  expect(retainObservation(observed(123, BEFORE, { observed_at: null, synced_at: NOW.toISOString() }), 30, NOW)).toBeNull();
  expect(retainObservation(observed(123, BEFORE, { synced_at: NOW.toISOString() }), 1, NOW)).toBeNull();
});
it('rejects future, malformed and contradictory dates', () => {
  expect(retainObservation(observed(1, new Date(NOW.getTime() + 1)), 30, NOW)).toBeNull();
  expect(retainObservation(observed(1, NOW, { synced_at: BEFORE.toISOString() }), 30, NOW)).toBeNull();
  expect(retainObservation({ ...observed(1), observed_at: 'not-a-date' }, 30, NOW)).toBeNull();
});
it('cannot extend an existing stamped deadline or a shorter legacy account deadline', () => {
  const stamped = observed(1, BEFORE, { expires_at: NOW.toISOString(), synced_at: NOW.toISOString() });
  expect(retainObservation(stamped, 30, NOW)).toBeNull();
  expect(retainObservation(observed(1), 30, NOW, NOW)).toBeNull();
  expect(retainObservation(observed(1, BEFORE, { expires_at: expiry.toISOString() }), 30, NOW, NOW)?.value).toBe(1);
});
it.each(['unavailable', 'error'] as const)('failed %s refresh keeps the original last-good lease', status => {
  const result = prepareRetainedCreatorFields(evidence, { followers: observed(null, NOW, { status }) }, target, NOW);
  expect(result.fields.followers).toMatchObject({ value: 1234, observed_at: BEFORE.toISOString(),
    synced_at: NOW.toISOString(), expires_at: expiry.toISOString(), status: status === 'error' ? 'error' : 'stale' });
  expect(retainCreatorFields({ ...evidence, fields: result.fields }, expiry)).toEqual({});
});
it('a fresh field does not renew an unrelated expired last-good field', () => {
  const result = prepareRetainedCreatorFields({ ...evidence, retentionDays: 1 },
    { currentViewers: observed(20, NOW), followers: observed(null, NOW) }, target, NOW);
  expect(result.fields.followers?.value).toBeNull();
  expect(creatorMetricMirrors(result.fields).followers).toBeNull();
  expect(result.fields.currentViewers?.expires_at).toBe('2026-09-06T12:00:00.000Z');
});
it('a late older response does not replace a newer field or extend its lease', () => {
  const result = prepareRetainedCreatorFields({ ...evidence, fields: { followers: observed(5, NOW) } },
    { followers: observed(10, BEFORE, { synced_at: NOW.toISOString() }) }, target, NOW);
  expect(result.fields.followers?.value).toBe(5);
  expect(result.fields.followers?.observed_at).toBe(NOW.toISOString());
});
it('derived score and reasons cannot outlive the oldest provider input', () => {
  const result = prepareRetainedCreatorFields({ ...evidence, fields: {} },
    { followers: observed(500), currentViewers: observed(20, NOW) }, { ...target, fitScore: 75, fitReasons: ['Synthetic'] }, NOW);
  expect(result.fields.fitScore).toMatchObject({ value: 75, expires_at: expiry.toISOString(), observed_at: BEFORE.toISOString() });
  expect(nextCreatorExpiry(result.fields)).toEqual(expiry);
});
it('does not invent a score observation when only sync/processing markers exist', () => {
  const result = prepareRetainedCreatorFields({ ...evidence, fields: {} },
    { 'processing:scoring': observed('version', NOW, { source: 'crm:scoreCreatorFit' }) }, { ...target, fitScore: 99 }, NOW);
  expect(result.fields.fitScore).toBeUndefined();
});
it('expired API metrics disappear without changing identity, contacts, notes or decisions', () => {
  const raw = targetFixture();
  const view = projectCreatorTarget(raw, { ...evidence, retentionDays: 1 }, NOW);
  expect(view).toMatchObject({ followers: null, fitScore: null, fitReasons: [], qualificationStatus: 'unavailable',
    recentVideoCount: null, avgRecentVideoViews: null, bio: null, profilePicUrl: null, metricAvailability: 'unavailable',
    status: raw.status, notes: raw.notes, contactEmail: raw.contactEmail, contactedAt: raw.contactedAt,
    username: raw.username, fullName: raw.fullName, brandUserId: raw.brandUserId, externalUrl: raw.externalUrl });
  expect(raw.followers).toBe(1234);
});
it('keeps valid partial last-good metrics but does not expose a raw legacy score', () => {
  expect(projectCreatorTarget(targetFixture(), evidence, NOW)).toMatchObject({ followers: 1234, fitScore: null });
});
it('does not invent provider expiry or delete manually imported unlinked records', () => {
  expect(projectCreatorTarget(targetFixture(), undefined, NOW)).toMatchObject({ followers: 1234, fitScore: 75, metricAvailability: 'untracked' });
});
it('a cleared DB placeholder is unavailable even on a formerly linked target', () => {
  expect(projectCreatorTarget({ ...targetFixture(), fitScore: 0, qualificationStatus: 'unavailable' }, undefined, NOW).fitScore).toBeNull();
});
it.each(['qualified', 'review', 'rejected'])('preserves %s while its score is valid, then hides it when expired', status => {
  const source = { ...evidence, fields: { fitScore: observed(75) } };
  expect(projectCreatorTarget({ ...targetFixture(), qualificationStatus: status }, source, NOW).qualificationStatus).toBe(status);
  expect(projectCreatorTarget({ ...targetFixture(), qualificationStatus: status }, source, expiry).qualificationStatus).toBe('unavailable');
});
