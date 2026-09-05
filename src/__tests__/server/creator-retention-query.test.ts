import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { creatorAccounts, creatorAccountObservations, creatorProviderPermissions, targets } from '@/db/schema';
import { BEFORE, NOW, observed, targetFixture } from './creator-retention-fixtures';

const mockSelect = jest.fn(), mockTransaction = jest.fn();
jest.mock('@/lib/db', () => ({ db: { select: (...args: unknown[]) => mockSelect(...args),
  transaction: (...args: unknown[]) => mockTransaction(...args) } }));
import { expireCreatorMetricPayloads } from '@/lib/queries/creatorRetention';
import { applyCreatorRetention } from '@/lib/queries/creatorTargetViews';
import { getAllTargets, getBrandTargets } from '@/lib/queries/targets';
import { getActiveTargetsPage } from '@/lib/queries/creatorTargetsApi';

type Write = { table: unknown; values: Record<string, unknown> };
type Account = { id: number; targetId: number; platform: 'youtube'; externalId: string;
  fields: Record<string, unknown>; expiresAt: Date | null; retentionDays: number };
const makeAccount = (): Account => ({ id: 3, targetId: 1, platform: 'youtube', externalId: 'UC-synthetic',
  fields: { followers: observed(1234) }, expiresAt: NOW, retentionDays: 1 });
let current: Account, candidates: Account[], snapshots: Array<{ id: number; accountId: number; runId: number;
  fields: Record<string, unknown>; expiresAt: Date }>;
let writes: Write[], order: string[], readConditions: SQL[], limits: number[];
let onLocked: (() => void) | null, failLock: boolean;

function chain(rows: unknown[], onWhere?: (condition: SQL) => void) {
  const promise = Promise.resolve(rows);
  const built = Object.assign(promise, {
    getSQL: () => sql`select 1`, where: (condition: SQL) => { onWhere?.(condition); return built; },
    orderBy: () => built, limit: (limit: number) => { limits.push(limit); return built; },
    for: async () => { order.push('target-row-lock'); return rows; }, leftJoin: () => built,
  });
  return built;
}
const tx = {
  execute: async (condition: SQL) => {
    const compiled = new PgDialect().sqlToQuery(condition);
    if (compiled.sql.includes('pg_advisory_xact_lock')) {
      order.push('advisory-lock');
      expect(compiled.params).toContain('youtube:uc-synthetic');
      if (failLock) throw new Error('synthetic-private-error');
      onLocked?.();
    }
  },
  select: () => ({ from: (table: unknown) => {
    order.push(table === creatorAccounts ? 'account-read' : 'other-read');
    return chain(table === creatorAccounts ? [current] : table === creatorProviderPermissions
      ? [{ retentionDays: current.retentionDays }] : table === targets ? [targetFixture()] : snapshots);
  } }),
  update: (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => {
    writes.push({ table, values });
  } }) }),
};

beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(NOW);
  current = makeAccount(); candidates = [current];
  snapshots = [{ id: 9, accountId: 3, runId: 7, fields: { followers: observed(1234) }, expiresAt: NOW }];
  writes = []; order = []; readConditions = []; limits = []; onLocked = null; failLock = false;
  mockSelect.mockImplementation(() => ({ from: (table: unknown) => chain(table === creatorAccounts ? candidates
    : table === targets ? [targetFixture()] : [], condition => readConditions.push(condition)) }));
  mockTransaction.mockImplementation((run: (connection: typeof tx) => Promise<unknown>) => run(tx));
});
afterEach(() => jest.useRealTimers());

it('clears only expired payloads, retaining account/snapshot rows and their replay identity', async () => {
  expect(await expireCreatorMetricPayloads()).toEqual({ status: 'success', processedAccounts: 1, clearedSnapshots: 1, errors: 0 });
  expect(order.indexOf('advisory-lock')).toBeLessThan(order.indexOf('account-read'));
  expect(writes.find(write => write.table === creatorAccounts)?.values).toEqual({ fields: {}, expiresAt: null });
  expect(writes.find(write => write.table === creatorAccountObservations)?.values).toEqual({ fields: {}, expiresAt: NOW });
  expect(snapshots[0]).toMatchObject({ id: 9, accountId: 3, runId: 7 });
  const mirror = writes.find(write => write.table === targets)?.values;
  expect(mirror).toMatchObject({ followers: null, fitScore: 0, fitReasons: [], qualificationStatus: 'unavailable' });
  for (const forbidden of ['status', 'notes', 'contactEmail', 'contactUrl', 'contactedAt', 'brandUserId', 'username', 'fullName']) {
    expect(mirror).not.toHaveProperty(forbidden);
  }
});
it('a refresh winning the lock after candidate selection is re-read and not erased', async () => {
  onLocked = () => { current = { ...current, fields: { followers: observed(4321, NOW) }, expiresAt: new Date(NOW.getTime() + 86_400_000) }; };
  await expireCreatorMetricPayloads();
  expect(writes.find(write => write.table === targets)?.values.followers).toBe(4321);
  expect(writes.find(write => write.table === creatorAccounts)?.values.fields).toMatchObject({ followers: { value: 4321 } });
});
it('a reduced recorded TTL expires old data despite a previously extended account marker', async () => {
  current.fields = { followers: observed(1234, BEFORE, { retention_days: 30, expires_at: '2026-10-04T12:00:00.000Z' }) };
  current.expiresAt = new Date('2026-10-04T12:00:00.000Z');
  await expireCreatorMetricPayloads();
  expect(writes.find(write => write.table === creatorAccounts)?.values.fields).toEqual({});
});
it('fails closed after a lock failure, does not write and never exposes the raw error', async () => {
  failLock = true;
  expect(await expireCreatorMetricPayloads()).toEqual({ status: 'partial', processedAccounts: 0, clearedSnapshots: 0, errors: 1 });
  expect(writes).toEqual([]);
});
it('does not call a provider or mutate anything when there is no candidate', async () => {
  candidates = [];
  expect(await expireCreatorMetricPayloads()).toMatchObject({ status: 'success', processedAccounts: 0 });
  expect(mockTransaction).not.toHaveBeenCalled(); expect(writes).toEqual([]);
});
it('bounds each tick and reports a backlog instead of claiming a complete cleanup', async () => {
  candidates = Array.from({ length: 11 }, () => makeAccount());
  expect(await expireCreatorMetricPayloads()).toMatchObject({ status: 'partial', processedAccounts: 10 });
  expect(mockTransaction).toHaveBeenCalledTimes(10); expect(limits).toContain(11);
});
it('keeps snapshots beyond the per-account batch for a later tick', async () => {
  snapshots = Array.from({ length: 101 }, (_, id) => ({ id, accountId: 3, runId: id, fields: { followers: observed(1) }, expiresAt: NOW }));
  expect(await expireCreatorMetricPayloads()).toMatchObject({ status: 'partial', clearedSnapshots: 100 });
  expect(writes.filter(write => write.table === creatorAccountObservations)).toHaveLength(100);
});
it.each(['all', 'brand', 'api', 'projection'])('protects the %s read without hiding identity or commercial notes', async kind => {
  const rows = kind === 'all' ? await getAllTargets() : kind === 'brand' ? await getBrandTargets('synthetic-brand')
    : kind === 'api' ? (await getActiveTargetsPage({ limit: 20 })).items : await applyCreatorRetention([targetFixture()], NOW);
  expect(rows[0]).toMatchObject({ followers: null, fitScore: null, metricAvailability: 'unavailable', notes: 'Manual history stays', status: 'contactado' });
  expect(writes).toEqual([]);
});
it('keeps the brand scope in SQL before applying retention', async () => {
  await getBrandTargets('synthetic-brand');
  const queries = readConditions.map(condition => new PgDialect().sqlToQuery(condition));
  expect(queries.some(query => query.sql.includes('brand_user_id') && query.params.includes('synthetic-brand'))).toBe(true);
});
