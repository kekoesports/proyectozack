import { canReevaluateDiscard, CREATOR_REEVALUATION_VERSION } from '@/lib/targets/discard-reevaluation';
import { creatorObservation } from '@/lib/targets/creator-observations';
import { DEFAULT_CREATOR_SEARCH_PROFILE, type CreatorObservation } from '@/lib/schemas/creator-search-profile';

const now = new Date('2026-09-05T10:00:00Z');
const discardedAt = new Date('2026-09-03T10:00:00Z');
const oldAt = new Date('2026-09-02T10:00:00Z');
function fields(at: Date, median: number, count: number, published: string): Record<string, CreatorObservation> {
  return {
    qualificationVersion: creatorObservation(CREATOR_REEVALUATION_VERSION, 'crm:creator-reevaluation:version', at),
    recentPerformanceCoverage: creatorObservation('complete', 'crm:youtube:recent-performance-coverage', at),
    contentMatch: creatorObservation(true, 'crm:youtube:profile-content-match', at),
    recentWindowDays: creatorObservation(90, 'crm:search-profile:windowDays', at),
    medianRecentVideoViews: creatorObservation(median, 'youtube:videos.list:derived-median', at, 'unavailable', 'MEDIUM'),
    recentVideoCount: creatorObservation(count, 'youtube:playlistItems.list:videoPublishedAt', at),
    lastVideoPublishedAt: creatorObservation(published, 'youtube:playlistItems.list:videoPublishedAt', at),
    language: creatorObservation('es', 'youtube:channels.list:defaultLanguage', at),
    country: creatorObservation('ES', 'youtube:channels.list:country', at),
  };
}
function input(): Parameters<typeof canReevaluateDiscard>[0] {
  return { platform: 'youtube', reason: 'audience_low', discardedAt, now,
    searchConfig: { ...DEFAULT_CREATOR_SEARCH_PROFILE, platforms: ['youtube'], markets: ['ES'], languages: ['es'] },
    baseline: fields(oldAt, 500, 1, '2026-08-01T10:00:00Z'),
    incoming: fields(now, 1500, 4, '2026-09-04T10:00:00Z'),
  };
}
function change(key: string, patch: Partial<CreatorObservation>, baseline = false): Parameters<typeof canReevaluateDiscard>[0] {
  const data = input(), source = baseline ? data.baseline : data.incoming;
  const field = source[key];
  if (!field) throw new Error('Unknown synthetic field');
  return { ...data, [baseline ? 'baseline' : 'incoming']: { ...source, [key]: { ...field, ...patch } } };
}

describe('discard reevaluation is fail-closed on fresh, complete, comparable evidence only', () => {
  it('allows a genuine audience improvement meeting current requirements', () => expect(canReevaluateDiscard(input())).toBe(true));
  it('allows verified new activity after the discard with an improved publication count', () => {
    expect(canReevaluateDiscard({ ...input(), reason: 'inactive' })).toBe(true);
  });
  it.each(['already_represented', 'not_interesting', 'brand_incompatible', 'other', 'wrong_content', 'no_contact', 'country', 'language', 'reopened', ''])
    ('never interprets manual/commercial reason %s as performance permission', reason => {
      expect(canReevaluateDiscard({ ...input(), reason })).toBe(false);
    });
  it.each(['twitch', 'kick', 'instagram'])('does not infer historical improvement from %s snapshots', platform => {
    expect(canReevaluateDiscard({ ...input(), platform })).toBe(false);
  });
  it.each(['unavailable', 'error', 'stale'] as const)('does not treat %s last-good as fresh evidence', status => {
    expect(canReevaluateDiscard(change('medianRecentVideoViews', { status }))).toBe(false);
  });
  it.each(['medianRecentVideoViews', 'recentVideoCount', 'lastVideoPublishedAt', 'qualificationVersion', 'recentWindowDays', 'recentPerformanceCoverage', 'contentMatch'])
    ('blocks missing/null required field %s', key => {
      expect(canReevaluateDiscard(change(key, { value: null }))).toBe(false);
      expect(canReevaluateDiscard({ ...input(), incoming: {} })).toBe(false);
    });
  it('blocks partial pagination, a different metric definition, or a mismatched window', () => {
    expect(canReevaluateDiscard(change('recentPerformanceCoverage', { value: 'partial' }))).toBe(false);
    expect(canReevaluateDiscard(change('qualificationVersion', { value: 'older-version' }, true))).toBe(false);
    expect(canReevaluateDiscard(change('recentWindowDays', { value: 30 }, true))).toBe(false);
  });
  it('does not reopen when the new measurement meets a lowered threshold but has not improved', () => {
    expect(canReevaluateDiscard({ ...change('medianRecentVideoViews', { value: 500 }),
      searchConfig: { ...DEFAULT_CREATOR_SEARCH_PROFILE, targetMedianViews: 100 } })).toBe(false);
  });
  it('requires both current minimum publication count and audience, not only one improved metric', () => {
    expect(canReevaluateDiscard(change('recentVideoCount', { value: 2 }))).toBe(false);
    expect(canReevaluateDiscard(change('medianRecentVideoViews', { value: 999 }))).toBe(false);
  });
  it('preserves a measured zero baseline but never substitutes zero for an unknown baseline', () => {
    expect(canReevaluateDiscard(change('medianRecentVideoViews', { value: 0 }, true))).toBe(true);
    expect(canReevaluateDiscard(change('medianRecentVideoViews', { value: null }, true))).toBe(false);
  });
  it('rejects old, future, malformed or out-of-order observation timestamps', () => {
    for (const patch of [
      { observed_at: '2026-09-03T09:00:00Z' }, { observed_at: '2026-09-06T10:00:00Z' },
      { observed_at: '2026-09-04T09:59:59Z' }, { observed_at: 'not-a-date' },
      { synced_at: '2026-09-05T09:59:59Z' }, { synced_at: '2026-09-06T10:00:00Z' },
    ]) expect(canReevaluateDiscard(change('medianRecentVideoViews', patch))).toBe(false);
  });
  it('requires the baseline to have existed before the actual decision', () => {
    expect(canReevaluateDiscard(change('medianRecentVideoViews', { synced_at: now.toISOString() }, true))).toBe(false);
  });
  it('requires verified configured market, language and content matches', () => {
    expect(canReevaluateDiscard(change('language', { value: 'en' }))).toBe(false);
    expect(canReevaluateDiscard(change('country', { value: null }))).toBe(false);
    expect(canReevaluateDiscard(change('contentMatch', { value: false }))).toBe(false);
  });
  it('does not require a country for a worldwide profile, or language when unrestricted', () => {
    expect(canReevaluateDiscard({ ...change('country', { value: null }), searchConfig: DEFAULT_CREATOR_SEARCH_PROFILE })).toBe(true);
  });
  it('rejects expired, impossible or malformed publication dates', () => {
    for (const value of ['2026-09-06T10:00:00Z', '2026-02-30T10:00:00Z', 'September 4 2026', '2025-01-01T10:00:00Z']) {
      expect(canReevaluateDiscard(change('lastVideoPublishedAt', { value }))).toBe(false);
    }
  });
  it('does not mistake an observation of the same old video for restored activity', () => {
    expect(canReevaluateDiscard({ ...change('lastVideoPublishedAt', { value: '2026-09-03T09:00:00Z' }), reason: 'inactive' })).toBe(false);
    expect(canReevaluateDiscard({ ...change('recentVideoCount', { value: 4 }, true), reason: 'inactive' })).toBe(false);
  });
  it('rejects invented source/confidence and invalid or missing profile config', () => {
    expect(canReevaluateDiscard(change('medianRecentVideoViews', { source: 'guess' }))).toBe(false);
    expect(canReevaluateDiscard(change('medianRecentVideoViews', { confidence: 'LOW' }))).toBe(false);
    expect(canReevaluateDiscard({ ...input(), searchConfig: undefined })).toBe(false);
    expect(canReevaluateDiscard({ ...input(), discardedAt: new Date('invalid') })).toBe(false);
  });
});
