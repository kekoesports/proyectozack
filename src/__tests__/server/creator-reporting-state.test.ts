import { automationRegistry, creatorDiscoveryRuns, creatorDigestOutbox } from '@/db/schema';
import type { CreatorDiscoveryPlatformResult } from '@/db/schema/creatorDiscoveryRuns';
import type { CreatorObservation } from '@/lib/schemas/creator-search-profile';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { creatorObservation } from '@/lib/targets/creator-observations';
import { CREATOR_FIT_SCORE_VERSION } from '@/lib/targets/creator-fit-score';

const mockSelect = jest.fn(), mockInsert = jest.fn(), mockUpdate = jest.fn(), mockEnqueue = jest.fn();
jest.mock('@/lib/db', () => ({ db: {
  select: (...args: unknown[]) => mockSelect(...args), insert: (...args: unknown[]) => mockInsert(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
} }));
jest.mock('@/lib/env', () => ({ env: {} }));
jest.mock('@/lib/queries/creatorDigest', () => ({ enqueueCreatorDigest: (...args: unknown[]) => mockEnqueue(...args) }));
import { recordCreatorRunReporting } from '@/lib/queries/creatorDiscoveryReporting';
import { finishCreatorDiscoveryRun } from '@/lib/queries/creatorDiscoveryRuns';
import { recordCreatorPreflight } from '@/lib/queries/creatorProviderReadiness';

const now = new Date('2026-09-05T12:00:00.000Z'), startedAt = new Date('2026-09-05T11:59:00.000Z');
const previous = new Date('2026-09-04T12:00:00.000Z');
const registry = new Map<string, Record<string, unknown>>();
const updates: { table: unknown; values: Record<string, unknown> }[] = [];
let observationRows: { fields: Record<string, CreatorObservation> }[];
let deliveryRows: { status: string; messageId: string | null; sentAt: Date | null }[];
const observationConditions: SQL[] = [];
const conflictConditions: SQL[] = [];
let topReads = 0;
let failRegistryKey: string | null = null;
function processing(enrichment = 'public_bio_extracted_for_review') {
  return { fields: {
    'processing:scoring': creatorObservation(CREATOR_FIT_SCORE_VERSION, 'crm:scoreCreatorFit', now),
    'processing:enrichment': creatorObservation(enrichment, 'crm:enrichPublicCreator', now),
  } };
}
function result(overrides: Partial<CreatorDiscoveryPlatformResult> = {}): CreatorDiscoveryPlatformResult {
  return { platform: 'youtube', status: 'success', found: 2, qualified: 1, inserted: 1, updated: 0,
    error: null, warnings: [], usage: { searchPages: 1, candidateChecks: 2 }, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(now); registry.clear(); updates.length = 0;
  observationRows = [processing()]; observationConditions.length = 0;
  deliveryRows = [{ status: 'pending', messageId: null, sentAt: null }]; conflictConditions.length = 0; topReads = 0;
  failRegistryKey = null;
  mockEnqueue.mockResolvedValue(true);
  mockSelect.mockImplementation(() => ({ from: (table: unknown) => table === creatorDiscoveryRuns
    ? { where: async () => [{ startedAt }] }
    : table === creatorDigestOutbox ? { where: async () => deliveryRows }
    : { where: async (condition: SQL) => { observationConditions.push(condition); return observationRows; },
      innerJoin: () => ({ innerJoin: () => ({ where: () => ({ orderBy: () => ({ limit: async () => { topReads++; return []; } }) }) }) }) },
  }));
  mockInsert.mockImplementation((table: unknown) => ({ values: (values: Record<string, unknown>) => {
    if (table !== automationRegistry || typeof values.key !== 'string') throw new Error('Unexpected synthetic registry operation');
    const key = values.key;
    if (key === failRegistryKey) throw new Error('Synthetic processing registry unavailable');
    return {
      onConflictDoNothing: async () => { if (!registry.has(key)) registry.set(key, values); },
      onConflictDoUpdate: async (options: { set: Record<string, unknown>; setWhere?: SQL }) => {
        if (options.setWhere) {
          conflictConditions.push(options.setWhere);
          const existingAt = registry.get(key)?.observedAt, incomingAt = options.set.observedAt;
          if (existingAt instanceof Date && incomingAt instanceof Date && existingAt > incomingAt) return;
        }
        registry.set(key, registry.has(key) ? { ...registry.get(key), ...options.set } : values);
      },
    };
  } }));
  mockUpdate.mockImplementation((table: unknown) => ({ set: (values: Record<string, unknown>) => ({
    where: async () => { updates.push({ table, values }); },
  }) }));
});
afterEach(() => jest.useRealTimers());

it('preflight and completed reporting share a single platform registry key', async () => {
  await recordCreatorPreflight([{ platform: 'youtube', ready: true, code: 'READY', message: 'Synthetic verified configuration' }]);
  expect(registry.get('creator:youtube')?.status).toBe('NEVER_RUN');
  await recordCreatorRunReporting(7, startedAt, [result()]);
  expect(registry.get('creator:youtube')).toMatchObject({ status: 'HEALTHY', lastSuccessAt: now });
  expect([...registry.keys()].filter(key => key.includes('youtube'))).toEqual(['creator:youtube']);
});

it.each(['failed', 'partial'] as const)('records %s platform status without inventing a fresh success or zero provider cost', async status => {
  registry.set('creator:youtube', { status: 'HEALTHY', lastSuccessAt: previous });
  await recordCreatorRunReporting(7, startedAt, [result({ status, qualified: 0, inserted: 0, error: 'Synthetic provider unavailable' })]);
  expect(registry.get('creator:youtube')).toMatchObject({ status: status === 'failed' ? 'ERROR' : 'DEGRADED',
    lastSuccessAt: previous, lastErrorAt: now, usage: { requests: null, costEur: null } });
});

it('queued digest is not reported as delivered or healthy before an ACK', async () => {
  await recordCreatorRunReporting(7, startedAt, [result()]);
  expect(mockEnqueue).toHaveBeenCalledWith('creator-run:7', expect.any(String), 7);
  expect(registry.get('creator:digest')?.status).not.toBe('HEALTHY');
  expect(registry.get('creator:digest')).not.toHaveProperty('lastSuccessAt');
  expect(registry.get('creator:digest')?.evidence).toContain('cola');
});

it('a new pending digest preserves the previous ACK timestamp but does not claim current delivery', async () => {
  registry.set('creator:digest', { status: 'HEALTHY', lastSuccessAt: previous, evidence: 'Previous synthetic ACK', observedAt: previous });
  await recordCreatorRunReporting(8, startedAt, [result()]);
  expect(registry.get('creator:digest')?.lastSuccessAt).toEqual(previous);
  expect(registry.get('creator:digest')?.status).not.toBe('HEALTHY');
  expect(registry.get('creator:digest')?.evidence).toContain('cola');
  expect(registry.get('creator:digest')?.observedAt).toEqual(now);
});

it.each(['enrichment', 'scoring'])('does not retain stale HEALTHY for %s after a failed run', async key => {
  registry.set(`creator:${key}`, { status: 'HEALTHY', observedAt: previous, lastSuccessAt: previous });
  await recordCreatorRunReporting(9, startedAt, [result({ status: 'failed', qualified: 0, inserted: 0, error: 'Synthetic failure' })]);
  expect(registry.get(`creator:${key}`)?.status).not.toBe('HEALTHY');
  expect(registry.get(`creator:${key}`)?.observedAt).toEqual(now);
});

it.each(['enrichment', 'scoring'])('updates an existing paused %s stage when this run actually processes a candidate', async key => {
  registry.set(`creator:${key}`, { status: 'PAUSED', observedAt: previous });
  await recordCreatorRunReporting(10, startedAt, [result()]);
  expect(registry.get(`creator:${key}`)).toMatchObject({ status: 'HEALTHY', observedAt: now });
});

it('does not silently turn a failed outbox write into a successful finish call', async () => {
  mockEnqueue.mockRejectedValue(new Error('Synthetic outbox unavailable'));
  await expect(finishCreatorDiscoveryRun(11, [result()])).rejects.toThrow('creator_discovery_reporting_pending');
  expect(updates).toEqual([expect.objectContaining({ table: creatorDiscoveryRuns,
    values: expect.objectContaining({ status: 'success', completedAt: now }) })]);
  expect(registry.has('creator:digest')).toBe(false);
});

it('propagates registry storage failure before attempting a digest', async () => {
  mockInsert.mockImplementationOnce(() => ({ values: () => ({ onConflictDoUpdate: async () => { throw new Error('Synthetic registry unavailable'); } }) }));
  await expect(recordCreatorRunReporting(12, startedAt, [result()])).rejects.toThrow('Synthetic registry unavailable');
  expect(mockEnqueue).not.toHaveBeenCalled();
});

it('does not infer processing from qualified counts when no current marker exists', async () => {
  observationRows = [];
  await recordCreatorRunReporting(13, startedAt, [result({ qualified: 999 })]);
  for (const key of ['enrichment', 'scoring']) expect(registry.get(`creator:${key}`)).toMatchObject({ status: 'PAUSED', itemsProcessed: 0 });
});

it('counts actual persisted processing even when represented accounts produce zero qualified leads', async () => {
  await recordCreatorRunReporting(14, startedAt, [result({ qualified: 0, inserted: 0 })]);
  for (const key of ['enrichment', 'scoring']) expect(registry.get(`creator:${key}`)).toMatchObject({ status: 'HEALTHY', itemsProcessed: 1 });
});

it('uses all current run observations, not the top-four candidate selection', async () => {
  observationRows = Array.from({ length: 7 }, () => processing());
  await recordCreatorRunReporting(15, startedAt, [result()]);
  expect(registry.get('creator:enrichment')?.itemsProcessed).toBe(7);
  expect(registry.get('creator:scoring')?.itemsProcessed).toBe(7);
  const condition = observationConditions[0];
  if (!condition) throw new Error('Missing processing evidence condition');
  const query = new PgDialect().sqlToQuery(condition);
  expect(query.sql).toContain('"run_id" ='); expect(query.sql).toContain('"expires_at" >');
  expect(query.params).toContain(15);
});

it('no public biography means scoring can run but enrichment stays paused with a reason', async () => {
  observationRows = [processing('no_public_bio_available')];
  await recordCreatorRunReporting(16, startedAt, [result()]);
  expect(registry.get('creator:scoring')).toMatchObject({ status: 'HEALTHY', itemsProcessed: 1 });
  expect(registry.get('creator:enrichment')).toMatchObject({ status: 'PAUSED', itemsProcessed: 0 });
  expect(registry.get('creator:enrichment')?.evidence).toContain('sin biografía pública');
});

it('an invalid public input marker is a processing error, not a successful extraction', async () => {
  observationRows = [processing('invalid_public_input')];
  await recordCreatorRunReporting(17, startedAt, [result()]);
  expect(registry.get('creator:enrichment')).toMatchObject({ status: 'ERROR', itemsProcessed: 0, lastErrorAt: now });
});

it('does not accept markers from another source, score version, time or availability state', async () => {
  observationRows = [{ fields: {
    'processing:scoring': creatorObservation('old-version', 'crm:scoreCreatorFit', now),
    'processing:enrichment': creatorObservation('public_bio_extracted_for_review', 'external:profile', now),
  } }, { fields: {
    'processing:scoring': creatorObservation(CREATOR_FIT_SCORE_VERSION, 'crm:scoreCreatorFit', previous),
    'processing:enrichment': { ...processing().fields['processing:enrichment'], status: 'stale' },
  } }];
  await recordCreatorRunReporting(18, startedAt, [result()]);
  for (const key of ['enrichment', 'scoring']) expect(registry.get(`creator:${key}`)).toMatchObject({ status: 'PAUSED', itemsProcessed: 0 });
});

it('recovered reporting uses the stored completion time rather than pretending work ran today', async () => {
  const oldStart = new Date(previous.getTime() - 60_000);
  observationRows = [{ fields: {
    'processing:scoring': creatorObservation(CREATOR_FIT_SCORE_VERSION, 'crm:scoreCreatorFit', previous),
    'processing:enrichment': creatorObservation('public_bio_extracted_for_review', 'crm:enrichPublicCreator', previous),
  } }];
  await recordCreatorRunReporting(19, oldStart, [result()], { completedAt: previous, recovered: true });
  for (const key of ['youtube', 'scoring', 'enrichment']) expect(registry.get(`creator:${key}`)).toMatchObject({
    lastSuccessAt: previous, observedAt: previous, updatedAt: now, durationMs: 60_000,
  });
  expect(mockEnqueue).toHaveBeenCalledWith('creator-run:19', expect.stringContaining('Informe recuperado, sin nueva búsqueda'), 19);
  expect(topReads).toBe(0);
});

it('recovery cannot overwrite a newer run, preflight state or confirmed ACK', async () => {
  const latest = { status: 'PAUSED', observedAt: now, evidence: 'Later permission preflight' };
  const ack = { status: 'HEALTHY', observedAt: now, lastSuccessAt: now, evidence: 'Later confirmed receipt' };
  registry.set('creator:youtube', latest); registry.set('creator:enrichment', latest); registry.set('creator:digest', ack);
  await recordCreatorRunReporting(20, new Date(previous.getTime() - 60_000), [result()], { completedAt: previous, recovered: true });
  expect(registry.get('creator:youtube')).toEqual(latest); expect(registry.get('creator:enrichment')).toEqual(latest);
  expect(registry.get('creator:digest')).toEqual(ack);
  expect(conflictConditions).toHaveLength(4);
  for (const condition of conflictConditions) {
    const query = new PgDialect().sqlToQuery(condition);
    expect(query.sql).toContain('"observed_at" is null'); expect(query.sql).toContain('"observed_at" <=');
    expect(query.params).toContain(previous.toISOString());
  }
});

it('a report replay does not demote a digest already sent with a retained receipt', async () => {
  const ack = { status: 'HEALTHY', observedAt: previous, lastSuccessAt: previous, evidence: 'Confirmed receipt' };
  registry.set('creator:digest', ack);
  deliveryRows = [{ status: 'sent', messageId: '555555555555555555', sentAt: previous }];
  await recordCreatorRunReporting(21, startedAt, [result()]);
  expect(registry.get('creator:digest')).toEqual(ack);
});

it.each(['uncertain', 'sending', 'failed', 'unexpected'])('does not claim a pending or sent outcome from an existing %s outbox item', status => {
  deliveryRows = [{ status, messageId: null, sentAt: null }];
  return expect(recordCreatorRunReporting(22, startedAt, [result()])).rejects.toThrow('creator_digest_outcome_unconfirmed');
});

it('a successful enqueue boolean without a persisted row is not accepted as evidence', async () => {
  deliveryRows = [];
  await expect(recordCreatorRunReporting(23, startedAt, [result()])).rejects.toThrow('creator_digest_outcome_unconfirmed');
  expect(registry.has('creator:digest')).toBe(false);
});

it('a sent flag without a valid receipt is not accepted as confirmed delivery', async () => {
  deliveryRows = [{ status: 'sent', messageId: null, sentAt: previous }];
  await expect(recordCreatorRunReporting(24, startedAt, [result()])).rejects.toThrow('creator_digest_receipt_unconfirmed');
  expect(registry.has('creator:digest')).toBe(false);
});

it('missing destination configuration remains paused without inventing an outbox item', async () => {
  mockEnqueue.mockResolvedValue(false); deliveryRows = [];
  await recordCreatorRunReporting(25, startedAt, [result()]);
  expect(registry.get('creator:digest')).toMatchObject({ status: 'PAUSED', enabled: false });
});

it('rejects invalid or future completion evidence before any writes', async () => {
  await expect(recordCreatorRunReporting(26, startedAt, [result()], {
    completedAt: new Date(now.getTime() + 1), recovered: true,
  })).rejects.toThrow('creator_reporting_invalid_evidence_time');
  expect(mockInsert).not.toHaveBeenCalled(); expect(mockEnqueue).not.toHaveBeenCalled();
});

it.each(['enrichment', 'scoring'])('a %s projection failure leaves the outbox absent and eligible for reporting-only recovery', async stage => {
  failRegistryKey = `creator:${stage}`;
  await expect(recordCreatorRunReporting(27, startedAt, [result()])).rejects.toThrow('Synthetic processing registry unavailable');
  expect(mockEnqueue).not.toHaveBeenCalled();
});
