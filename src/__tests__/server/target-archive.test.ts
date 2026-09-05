import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { creatorFeedback, targets } from '@/db/schema';

const mockSelect = jest.fn(), mockInsert = jest.fn(), mockUpdate = jest.fn(), mockTransaction = jest.fn(), mockDelete = jest.fn();
jest.mock('@/lib/db', () => ({ db: {
  select: (...args: unknown[]) => mockSelect(...args), insert: (...args: unknown[]) => mockInsert(...args),
  update: (...args: unknown[]) => mockUpdate(...args), transaction: (...args: unknown[]) => mockTransaction(...args),
  delete: (...args: unknown[]) => mockDelete(...args),
} }));
import { getAllTargets, getBrandTargets, deleteTargets, deleteAllTargets, updateTargetStatus, updateBrandTargetStatus, bulkUpdateStatus } from '@/lib/queries/targets';

type Write = { kind: string; table: unknown; values: unknown; where?: SQL };
const dialect = new PgDialect();
let reads: Array<SQL | undefined>, writes: Write[], events: string[], rows: Array<{ id: number; status: string }>;
let lastDecision: { status: string; reason: string } | null;
let feedbackOrders: SQL[];

beforeEach(() => {
  jest.clearAllMocks(); reads = []; writes = []; events = [];
  rows = [{ id: 1, status: 'pendiente' }, { id: 2, status: 'contactado' }];
  lastDecision = null;
  feedbackOrders = [];
  mockSelect.mockImplementation(() => ({ from: (table: unknown) => ({ where: (condition: SQL | undefined) => {
    reads.push(condition);
    if (table === creatorFeedback) return { orderBy: (...order: SQL[]) => {
      feedbackOrders.push(...order);
      return { limit: async () => lastDecision ? [lastDecision] : [] };
    } };
    return { orderBy: () => Object.assign(Promise.resolve(rows), { for: async (mode: string) => {
      events.push(`lock:${mode}`); return rows;
    } }) };
  } }) }));
  mockInsert.mockImplementation((table: unknown) => ({ values: async (values: unknown) => {
    events.push('history'); writes.push({ kind: 'insert', table, values });
  } }));
  mockUpdate.mockImplementation((table: unknown) => ({ set: (values: unknown) => ({ where: async (where: SQL) => {
    events.push('status'); writes.push({ kind: 'update', table, values, where });
  } }) }));
  const transaction = { select: mockSelect, insert: mockInsert, update: mockUpdate };
  mockTransaction.mockImplementation((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction));
});
afterEach(() => expect(mockDelete).not.toHaveBeenCalled());

it('ordinary lists exclude discarded rows; archive access must be explicit', async () => {
  await getAllTargets();
  const condition = reads[0];
  if (!condition) throw new Error('Expected archive filter');
  const query = dialect.sqlToQuery(condition);
  expect(query.sql).toContain('"status" <>'); expect(query.params).toEqual(['descartado']);
  await getAllTargets({ includeArchived: true });
  expect(reads[1]).toBeUndefined();
});
it('brand scope remains enforced and ordinary brand lists exclude archived prospects', async () => {
  await getBrandTargets('synthetic-brand');
  const condition = reads[0];
  if (!condition) throw new Error('Expected brand filter');
  const query = dialect.sqlToQuery(condition);
  expect(query.sql).toContain('"brand_user_id" ='); expect(query.sql).toContain('"status" <>');
  expect(query.params).toEqual(['synthetic-brand', 'descartado']);
});
it('legacy delete becomes recoverable archive: row lock → history → status, preserving other fields', async () => {
  await deleteTargets([1, 2], 'synthetic-admin');
  expect(events).toEqual(['lock:update', 'history', 'status']);
  expect(writes[0]).toEqual({ kind: 'insert', table: creatorFeedback, values: [
    expect.objectContaining({ targetId: 1, previousStatus: 'pendiente', status: 'descartado', actorId: 'synthetic-admin', reason: 'other' }),
    expect.objectContaining({ targetId: 2, previousStatus: 'contactado', status: 'descartado', actorId: 'synthetic-admin', reason: 'other' }),
  ] });
  expect(writes[1]).toMatchObject({ kind: 'update', table: targets, values: { status: 'descartado' } });
  expect(writes[1]?.values).not.toHaveProperty('notes');
  expect(writes[1]?.values).not.toHaveProperty('followers');
  expect(writes[1]?.values).not.toHaveProperty('createdAt');
  const condition = reads[0];
  if (!condition) throw new Error('Missing scoped archive condition');
  const query = dialect.sqlToQuery(condition);
  expect(query.sql).toContain('"id" in'); expect(query.params).toEqual([1, 2]);
});
it('empty selection and replay of an explicit archive produce no extra writes', async () => {
  await deleteTargets([], 'synthetic-admin'); expect(mockTransaction).not.toHaveBeenCalled();
  rows = [{ id: 1, status: 'descartado' }];
  lastDecision = { status: 'descartado', reason: 'other' };
  await deleteTargets([1], 'synthetic-admin');
  expect(writes).toHaveLength(0);
  expect(feedbackOrders.map(order => dialect.sqlToQuery(order).sql)).toEqual(['"creator_feedback"."id" desc']);
  const condition = reads[0];
  if (!condition) throw new Error('Missing target filter');
  expect(dialect.sqlToQuery(condition).params).toEqual([1]);
});
it('archive-all preserves history and considers every row including earlier performance discards', async () => {
  await deleteAllTargets('synthetic-admin');
  expect(reads[0]).toBeUndefined();
  expect(events).toEqual(['lock:update', 'history', 'status']);
});
it.each(['audience_low', 'inactive'])('explicit archive supersedes existing performance reason %s without losing the row', async reason => {
  rows = [{ id: 1, status: 'descartado' }];
  lastDecision = { status: 'descartado', reason };
  await deleteTargets([1], 'synthetic-admin');
  expect(writes[0]?.values).toEqual([expect.objectContaining({ targetId: 1, previousStatus: 'descartado', status: 'descartado', reason: 'other' })]);
  expect(events).toEqual(['lock:update', 'history', 'status']);
});
it('does not update status when history persistence fails', async () => {
  mockInsert.mockImplementationOnce(() => ({ values: async () => { throw new Error('synthetic_history_failure'); } }));
  await expect(deleteTargets([1], 'synthetic-admin')).rejects.toThrow('synthetic_history_failure');
  expect(mockUpdate).not.toHaveBeenCalled();
});
it('manual restoration is explicit and recorded rather than deletion/recreation of the identity', async () => {
  rows = [{ id: 1, status: 'descartado' }];
  await updateTargetStatus(1, 'pendiente', 'synthetic-admin');
  expect(writes[0]?.values).toEqual([expect.objectContaining({ previousStatus: 'descartado', status: 'pendiente', reason: 'reopened' })]);
});
it('legacy bulk discard without a performance reason cannot inherit an earlier audience decision', async () => {
  await bulkUpdateStatus([1, 2], 'descartado', 'synthetic-admin');
  expect(writes[0]?.values).toEqual([
    expect.objectContaining({ reason: 'other' }), expect.objectContaining({ reason: 'other' }),
  ]);
});
it('brand status writes lock and constrain the same target and brand before recording history', async () => {
  await updateBrandTargetStatus('synthetic-brand', 1, 'descartado');
  const condition = reads[0];
  if (!condition) throw new Error('Expected scoped write condition');
  const query = dialect.sqlToQuery(condition);
  expect(query.sql).toContain('"brand_user_id" ='); expect(query.params).toEqual(['descartado', 1, 'synthetic-brand']);
  expect(events[0]).toBe('lock:update');
});
