import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { creatorAccounts, creatorAccountObservations, creatorFeedback, creatorIdentities, creatorProviderPermissions, talentSocials, targets } from '@/db/schema';
import { creatorObservation } from '@/lib/targets/creator-observations';
import { CREATOR_REEVALUATION_VERSION } from '@/lib/targets/discard-reevaluation';
import { DEFAULT_CREATOR_SEARCH_PROFILE, type CreatorObservation } from '@/lib/schemas/creator-search-profile';
import type { DiscoveredCreatorInput } from '@/lib/queries/creatorIdentity';

const mockTransaction = jest.fn(), mockBulk = jest.fn();
jest.mock('@/lib/db', () => ({ db: { transaction: (...args: unknown[]) => mockTransaction(...args) } }));
jest.mock('@/lib/queries/targets', () => ({ bulkUpsertTargets: (...args: unknown[]) => mockBulk(...args) }));
import { persistDiscoveredCreator } from '@/lib/queries/creatorIdentity';
import { recordTargetStatusHistory } from '@/lib/queries/targetStatusHistory';

const now = new Date('2026-09-05T10:00:00Z'), discardedAt = new Date('2026-09-03T10:00:00Z');
const permission = { commercialApproved: true, derivedMetricsApproved: true, retentionDays: 30,
  evidenceRef: 'synthetic', reviewedBy: 'synthetic', reviewedAt: new Date('2026-09-01T00:00:00Z'), validUntil: null };
const target = { id: 22, platform: 'youtube', username: 'UC-synthetic', status: 'descartado', notes: 'Synthetic manual notes',
  contactedAt: null, createdAt: new Date('2026-01-01T00:00:00Z') };
const account = { id: 33, creatorId: 44, targetId: 22, fields: {}, externalId: 'UC-synthetic' };
function fields(at: Date, median: number): Record<string, CreatorObservation> {
  return {
    qualificationVersion: creatorObservation(CREATOR_REEVALUATION_VERSION, 'crm:creator-reevaluation:version', at),
    recentPerformanceCoverage: creatorObservation('complete', 'crm:youtube:recent-performance-coverage', at),
    contentMatch: creatorObservation(true, 'crm:youtube:profile-content-match', at),
    recentWindowDays: creatorObservation(90, 'crm:search-profile:windowDays', at),
    medianRecentVideoViews: creatorObservation(median, 'youtube:videos.list:derived-median', at),
    recentVideoCount: creatorObservation(4, 'youtube:playlistItems.list:videoPublishedAt', at),
    lastVideoPublishedAt: creatorObservation('2026-09-01T10:00:00Z', 'youtube:playlistItems.list:videoPublishedAt', at),
  };
}
const incoming: DiscoveredCreatorInput = { runId: 77, externalId: account.externalId,
  searchConfig: DEFAULT_CREATOR_SEARCH_PROFILE,
  target: { platform: 'youtube', username: target.username, profileUrl: 'https://youtube.com/channel/UC-synthetic' },
  fields: fields(now, 1500),
};
type Write = { table: unknown; values: Record<string, unknown>; where?: SQL };
let writes: Write[], events: string[], conditions: Array<{ table: unknown; where: SQL }>;
let decision: Record<string, unknown> | null, baseline: Record<string, unknown> | null;
let represented: boolean, objection: boolean, replay: boolean, feedbackFails: boolean;
let conflictingDecisions: Array<{ id: number; createdAt: Date; actorId: string; status: string; reason: string }> | null;

function selectRows(table: unknown, projection: unknown): unknown[] {
  if (table === creatorProviderPermissions) return [permission];
  if (table === creatorAccounts) return [account];
  if (table === targets) return [target];
  if (table === talentSocials) return [];
  if (table === creatorIdentities) return [{ talentId: represented ? 99 : null }];
  if (table === creatorFeedback) return projection ? objection ? [{ id: 11 }] : [] : decision ? [decision] : [];
  if (table === creatorAccountObservations) return projection ? replay ? [{ id: 55 }] : [] : baseline ? [baseline] : [];
  throw new Error('Unexpected table in synthetic transaction');
}
const tx = {
  execute: async () => undefined,
  select: (projection?: unknown) => ({ from: (table: unknown) => ({ where: (where: SQL) => {
    conditions.push({ table, where });
    const rows = selectRows(table, projection);
    const builder = Object.assign(Promise.resolve(rows), {
      for: async () => { events.push('target-locked'); return rows; },
    });
    return Object.assign(builder, { limit: () => builder, orderBy: (...order: SQL[]) => {
      if (table === creatorFeedback && !projection && conflictingDecisions) {
        const byTimestamp = order[0] && new PgDialect().sqlToQuery(order[0]).sql.includes('created_at');
        const ordered = [...conflictingDecisions].sort((a, b) => byTimestamp ? b.createdAt.getTime() - a.createdAt.getTime() : b.id - a.id);
        return Object.assign(Promise.resolve(ordered), { limit: async () => ordered.slice(0, 1), for: async () => ordered });
      }
      return Object.assign(builder, { limit: () => builder });
    } });
  } }) }),
  insert: (table: unknown) => ({ values: (values: Record<string, unknown> | Array<Record<string, unknown>>) => {
    if (table === creatorFeedback && feedbackFails) throw new Error('synthetic_history_unavailable');
    for (const item of Array.isArray(values) ? values : [values]) {
      writes.push({ table, values: item });
      if (table === creatorFeedback) decision = { id: 100, ...item };
    }
    if (table === creatorFeedback) events.push('history');
    return Object.assign(Promise.resolve(), { returning: async () => [{ id: 88 }],
      onConflictDoNothing: async () => { replay = true; },
    });
  } }),
  update: (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async (where: SQL) => {
    writes.push({ table, values, where });
    if (table === targets && typeof values.status === 'string') { target.status = values.status; events.push('status'); }
  } }) }),
};

describe('identity → discard evidence → history/status/observations integration (mock DB, no external effects)', () => {
  beforeEach(() => {
    jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(now);
    target.status = 'descartado'; represented = false; objection = false; replay = false; feedbackFails = false;
    writes = []; events = []; conditions = [];
    conflictingDecisions = null;
    decision = { id: 66, actorId: 'synthetic-human', status: 'descartado', reason: 'audience_low', createdAt: discardedAt };
    baseline = { id: 55, fields: fields(new Date('2026-09-02T10:00:00Z'), 500) };
    mockTransaction.mockImplementation((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
    mockBulk.mockImplementation(async () => { events.push('upsert'); return { inserted: 0, updated: 1, ids: [22] }; });
  });
  afterEach(() => jest.useRealTimers());
  it('reopens exactly the existing target to review after a row lock and durable audit record', async () => {
    await expect(persistDiscoveredCreator(incoming)).resolves.toMatchObject({ suppressed: false, reopened: true, inserted: 0 });
    expect(target.status).toBe('pendiente');
    expect(events).toEqual(['target-locked', 'upsert', 'history', 'status']);
    expect(writes.find(row => row.table === creatorFeedback)?.values).toMatchObject({ actorId: null,
      previousStatus: 'descartado', status: 'pendiente', reason: 'evidence_improved', targetId: 22 });
    const status = writes.find(row => row.table === targets);
    expect(status?.values).not.toHaveProperty('contactedAt'); expect(status?.values).not.toHaveProperty('notes');
    expect(target.notes).toBe('Synthetic manual notes');
    expect(writes.filter(row => row.table === creatorAccountObservations)).toHaveLength(1);
  });
  it('does not replay the observation or reopening history on the same run identity', async () => {
    await persistDiscoveredCreator(incoming);
    const previousWrites = writes.length;
    await persistDiscoveredCreator(incoming);
    expect(writes).toHaveLength(previousWrites);
    expect(mockBulk).toHaveBeenCalledTimes(1);
  });
  it.each(['audience_low', 'inactive'])('archive overrides %s, replay does not duplicate it, then discovery cannot reopen', async reason => {
    decision = { ...decision, reason };
    await recordTargetStatusHistory({ ids: [22], status: 'descartado', explicitArchive: true, actorId: 'synthetic-human' });
    expect(decision).toMatchObject({ reason: 'other', previousStatus: 'descartado', status: 'descartado' });
    const count = writes.length;
    await recordTargetStatusHistory({ ids: [22], status: 'descartado', explicitArchive: true, actorId: 'synthetic-human' });
    expect(writes).toHaveLength(count);
    // Advance time so suppression is demonstrated by the manual reason, not merely equal timestamps.
    jest.setSystemTime(new Date(now.getTime() + 60_000));
    await expect(persistDiscoveredCreator({ ...incoming, fields: fields(new Date(now.getTime() + 60_000), 2000) }))
      .resolves.toMatchObject({ suppressed: true, reopened: false });
    expect(target.status).toBe('descartado');
    expect(writes.filter(row => row.table === creatorFeedback)).toHaveLength(1);
    expect(target.notes).toBe('Synthetic manual notes');
  });
  it.each(['no feedback', 'no baseline', 'manual unknown', 'commercial objection', 'represented identity', 'same audience'])
    ('preserves suppression and history for %s', async scenario => {
      if (scenario === 'no feedback') decision = null;
      if (scenario === 'no baseline') baseline = null;
      if (scenario === 'manual unknown') decision = { ...decision, reason: 'other' };
      if (scenario === 'commercial objection') objection = true;
      if (scenario === 'represented identity') represented = true;
      if (scenario === 'same audience') baseline = { ...baseline, fields: fields(new Date('2026-09-02T10:00:00Z'), 1500) };
      await expect(persistDiscoveredCreator(incoming)).resolves.toMatchObject({ suppressed: true, reopened: false });
      expect(target.status).toBe('descartado');
      expect(writes.some(row => row.table === creatorFeedback || (row.table === targets && 'status' in row.values))).toBe(false);
      for (const write of writes.filter(row => row.table === targets)) {
        expect(write.values).not.toHaveProperty('notes'); expect(write.values).not.toHaveProperty('contactedAt');
      }
    });
  it('does not reopen when a concurrent manual status is observed after the target lock', async () => {
    target.status = 'contactado';
    await persistDiscoveredCreator(incoming);
    expect(target.status).toBe('contactado');
    expect(writes.some(row => row.table === creatorFeedback || (row.table === targets && 'status' in row.values))).toBe(false);
  });
  it('uses insertion order under the lock when legacy transaction timestamps invert manual decisions', async () => {
    conflictingDecisions = [
      { id: 67, createdAt: new Date('2026-09-03T10:00:00Z'), actorId: 'synthetic-human', status: 'descartado', reason: 'other' },
      { id: 66, createdAt: new Date('2026-09-04T10:00:00Z'), actorId: 'synthetic-human', status: 'descartado', reason: 'audience_low' },
    ];
    await expect(persistDiscoveredCreator(incoming)).resolves.toMatchObject({ suppressed: true, reopened: false });
    expect(target.status).toBe('descartado');
    expect(writes.some(row => row.table === creatorFeedback)).toBe(false);
  });
  it('fails before changing status if reopening history cannot be persisted', async () => {
    feedbackFails = true;
    await expect(persistDiscoveredCreator(incoming)).rejects.toThrow('synthetic_history_unavailable');
    expect(target.status).toBe('descartado');
  });
  it('queries only baseline observations before the discard and still inside permitted retention', async () => {
    await persistDiscoveredCreator(incoming);
    const query = conditions.filter(row => row.table === creatorAccountObservations).at(-1);
    if (!query) throw new Error('Expected baseline query');
    const compiled = new PgDialect().sqlToQuery(query.where);
    expect(compiled.sql).toContain('"observed_at" <=');
    expect(compiled.sql).toContain('"expires_at" >');
    expect(compiled.params).toContain(discardedAt.toISOString());
    expect(compiled.params).toContain(now.toISOString());
  });
});
