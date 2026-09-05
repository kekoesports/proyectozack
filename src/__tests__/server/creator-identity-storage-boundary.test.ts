import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { creatorAccounts, creatorIdentities } from '@/db/schema';
import type { CreatorProviderPermission } from '@/lib/targets/provider-readiness';
import type { DiscoveredCreatorInput } from '@/lib/queries/creatorIdentity';

const mockTransaction = jest.fn();
const mockBulk = jest.fn();
jest.mock('@/lib/db', () => ({ db: { transaction: (...args: unknown[]) => mockTransaction(...args) } }));
jest.mock('@/lib/queries/targets', () => ({ bulkUpsertTargets: (...args: unknown[]) => mockBulk(...args) }));
import { persistDiscoveredCreator } from '@/lib/queries/creatorIdentity';

const now = new Date('2026-09-05T10:00:00Z');
const permission: CreatorProviderPermission = { commercialApproved: true, derivedMetricsApproved: true,
  evidenceRef: 'synthetic-review', reviewedBy: 'synthetic-actor', reviewedAt: new Date('2026-09-04T00:00:00Z'),
  retentionDays: 30, validUntil: null };
const input: DiscoveredCreatorInput = { externalId: '1234', target: {
  platform: 'twitch', username: 'SyntheticNewName', profileUrl: 'https://twitch.tv/syntheticnewname',
}, fields: {} };
const target = { id: 22, username: 'syntheticoldname', status: 'contactado', notes: 'synthetic manual history', createdAt: new Date('2026-01-01T00:00:00Z') };
const account = { id: 33, creatorId: 44, targetId: 22, fields: {}, externalId: '1234' };
type Write = { table: unknown; values: Record<string, unknown>; condition?: SQL };
let selects: unknown[][];
let writes: Write[];
let locks: SQL[];
let eventOrder: string[];

const tx = {
  execute: async (condition: SQL) => {
    locks.push(condition);
    eventOrder.push(new PgDialect().sqlToQuery(condition).sql.includes('pg_advisory_xact_lock') ? 'advisory-lock' : 'execute');
  },
  select: () => {
    eventOrder.push('select');
    return { from: () => ({ where: () => {
    const rows = selects.shift();
    if (!rows) throw new Error('Unexpected read beyond synthetic fixture');
    return Object.assign(Promise.resolve(rows), { limit: async () => rows });
    } }) };
  },
  insert: (table: unknown) => ({ values: (values: Record<string, unknown>) => {
    writes.push({ table, values });
    return Object.assign(Promise.resolve(), { returning: async () => [{ id: 88 }] });
  } }),
  update: (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async (condition: SQL) => {
    writes.push({ table, values, condition });
  } }) }),
};

describe('immutable creator identity storage boundary (mock transaction only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    selects = [[permission], [account], [target], []];
    writes = []; locks = []; eventOrder = [];
    mockTransaction.mockImplementation((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
    mockBulk.mockResolvedValue({ inserted: 0, updated: 1, ids: [22] });
  });
  afterEach(() => jest.useRealTimers());

  it.each([
    { commercialApproved: false }, { derivedMetricsApproved: false },
    { evidenceRef: ' ' }, { reviewedAt: new Date('2026-09-06T00:00:00Z') },
    { validUntil: now }, { retentionDays: 0 },
  ])('rechecks complete current authority inside the persistence transaction %p', async (invalid) => {
    selects[0] = [{ ...permission, ...invalid }];
    await expect(persistDiscoveredCreator(input)).rejects.toThrow('creator_provider_storage_permission_required');
    expect(writes).toHaveLength(0);
    expect(mockBulk).not.toHaveBeenCalled();
  });

  it('locks the immutable provider ID before reading or changing an account', async () => {
    await persistDiscoveredCreator(input);
    const lock = locks.find((condition) => new PgDialect().sqlToQuery(condition).sql.includes('pg_advisory_xact_lock'));
    if (!lock) throw new Error('Missing expected synthetic advisory lock');
    const query = new PgDialect().sqlToQuery(lock);
    expect(query.sql).toContain('pg_advisory_xact_lock');
    expect(query.params).toContain('twitch:1234');
    expect(eventOrder.indexOf('advisory-lock')).toBeLessThan(eventOrder.indexOf('select'));
  });

  it('keeps a renamed provider account attached to its existing target and does not reset manual status', async () => {
    await expect(persistDiscoveredCreator(input)).resolves.toMatchObject({ updated: 1, identityReview: false });
    expect(mockBulk).toHaveBeenCalledWith([expect.objectContaining({ username: target.username })], tx);
    const [rows]: [Array<Record<string, unknown>>] = mockBulk.mock.calls[0];
    expect(rows[0]).not.toHaveProperty('status');
    expect(rows[0]).not.toHaveProperty('notes');
    expect(writes.find((write) => write.table === creatorAccounts)?.values).toMatchObject({ targetId: 22, creatorId: 44, username: 'syntheticnewname' });
  });

  it('does not merge a recycled username with a different immutable provider identity', async () => {
    selects = [[permission], [], [target], [{ externalId: 'another-provider-id' }]];
    await expect(persistDiscoveredCreator(input)).resolves.toEqual({ inserted: 0, updated: 0, represented: false, identityReview: true });
    expect(writes).toHaveLength(0);
    expect(mockBulk).not.toHaveBeenCalled();
  });

  it('does not create a prospect row for an already represented creator without an existing target', async () => {
    selects = [[permission], [], [], [{ talentId: 99 }], [{ id: 77 }]];
    await expect(persistDiscoveredCreator(input)).resolves.toMatchObject({ inserted: 0, represented: true });
    expect(mockBulk).not.toHaveBeenCalled();
    expect(writes.find((write) => write.table === creatorAccounts)?.values).toMatchObject({ targetId: null, creatorId: 77 });
  });

  it('increments observation counters without rewriting first-seen history on an existing account', async () => {
    await persistDiscoveredCreator(input);
    for (const table of [creatorIdentities, creatorAccounts]) {
      const values = writes.find((write) => write.table === table)?.values;
      expect(values).toHaveProperty('timesObserved');
      expect(values).not.toHaveProperty('firstSeenAt');
      expect(values).not.toHaveProperty('sourceFirstSeen');
    }
  });
});
