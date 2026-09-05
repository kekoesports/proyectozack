import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { creatorFeedback, creatorSearchProfiles, targets } from '@/db/schema';
import { DEFAULT_CREATOR_SEARCH_PROFILE } from '@/lib/schemas/creator-search-profile';

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockTransaction = jest.fn();
jest.mock('@/lib/db', () => ({ db: {
  select: (...args: unknown[]) => mockSelect(...args), insert: (...args: unknown[]) => mockInsert(...args),
  update: (...args: unknown[]) => mockUpdate(...args), transaction: (...args: unknown[]) => mockTransaction(...args),
} }));
import { listDueCreatorSearchProfiles, recordCreatorFeedback, saveCreatorSearchProfile, seedCreatorSearchProfile } from '@/lib/queries/creatorSearchProfiles';

type Operation = { kind: 'insert' | 'update'; table: unknown; values: Record<string, unknown>; condition?: SQL; conflict?: unknown };
const now = new Date('2026-09-05T10:00:00Z');
const dialect = new PgDialect();
const savedProfile = { id: 7, version: 4 };
let operations: Operation[];
let eventOrder: string[];
let readConditions: SQL[];
let selectRows: unknown[][];
let returningRows: unknown[];
let afterLockTime: Date | null;

describe('profile and feedback transaction query boundaries (isolated mocks)', () => {
  beforeEach(() => {
    jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(now);
    operations = []; eventOrder = []; readConditions = []; selectRows = []; returningRows = [savedProfile];
    afterLockTime = null;
    mockSelect.mockImplementation(() => ({ from: () => ({ where: (condition: SQL) => {
      readConditions.push(condition);
      const rows = selectRows.shift() ?? [];
      return {
        for: async (lock: string) => {
          eventOrder.push(`lock:${lock}`);
          if (afterLockTime) jest.setSystemTime(afterLockTime);
          return rows;
        },
        limit: async () => rows,
        orderBy: () => ({ limit: async () => rows }),
      };
    } }) }));
    mockInsert.mockImplementation((table: unknown) => ({ values: (values: Record<string, unknown>) => {
      const op: Operation = { kind: 'insert', table, values }; operations.push(op); eventOrder.push('insert');
      return { returning: async () => returningRows, onConflictDoNothing: async (conflict: unknown) => { op.conflict = conflict; } };
    } }));
    mockUpdate.mockImplementation((table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: (condition: SQL) => {
      operations.push({ kind: 'update', table, values, condition }); eventOrder.push('update');
      return { returning: async () => returningRows };
    } }) }));
    const transaction = { select: mockSelect, insert: mockInsert, update: mockUpdate };
    mockTransaction.mockImplementation((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction));
  });
  afterEach(() => jest.useRealTimers());

  it('uses ID and version CAS for edits and never overwrites the active lease', async () => {
    await expect(saveCreatorSearchProfile(DEFAULT_CREATOR_SEARCH_PROFILE, 'synthetic-user', { id: 7, version: 3 })).resolves.toEqual(savedProfile);
    const op = operations[0];
    if (!op?.condition) throw new Error('Expected update condition');
    const query = dialect.sqlToQuery(op.condition);
    expect(query.sql).toContain('"id" ='); expect(query.sql).toContain('"version" =');
    expect(query.params).toEqual([7, 3]);
    expect(op.values).not.toHaveProperty('leaseToken'); expect(op.values).not.toHaveProperty('leaseUntil');
    expect(op.values.nextRunAt).toBeNull();
  });
  it('reports an optimistic edit collision instead of retrying unconditionally', async () => {
    returningRows = [];
    await expect(saveCreatorSearchProfile(DEFAULT_CREATOR_SEARCH_PROFILE, 'synthetic-user', { id: 7, version: 3 })).rejects.toThrow('creator_profile_changed_reload');
    expect(operations).toHaveLength(1);
  });
  it('rejects invalid authority fields before writing a profile', async () => {
    await expect(saveCreatorSearchProfile({ ...DEFAULT_CREATOR_SEARCH_PROFILE, sendEmails: true }, 'synthetic-user')).rejects.toThrow();
    expect(operations).toHaveLength(0);
  });
  it('seeds a paused profile without overwriting existing operator edits', async () => {
    await seedCreatorSearchProfile('synthetic-user');
    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({ kind: 'insert', table: creatorSearchProfiles, values: { enabled: false } });
    expect(operations[0]?.conflict).toEqual({ target: creatorSearchProfiles.name });
  });
  it('filters due profiles by enabled and timestamp rather than loading every configured profile', async () => {
    await listDueCreatorSearchProfiles(now);
    const where = readConditions[0];
    if (!where) throw new Error('Missing due condition');
    const query = dialect.sqlToQuery(where);
    expect(query.sql).toContain('"enabled" ='); expect(query.sql).toContain('"next_run_at" <=');
    expect(query.params).toContain(true);
  });
  it('records previous status and actor after taking a row lock, before changing the target', async () => {
    selectRows = [[{ id: 22, status: 'contactado' }], [{ creatorId: 44 }]];
    await recordCreatorFeedback({ targetId: 22, status: 'descartado', reason: 'wrong_content', note: 'Synthetic decision' }, 'synthetic-user');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(eventOrder).toEqual(['lock:update', 'insert', 'update']);
    expect(operations[0]).toMatchObject({ kind: 'insert', table: creatorFeedback, values: {
      targetId: 22, creatorId: 44, actorId: 'synthetic-user', previousStatus: 'contactado', status: 'descartado', reason: 'wrong_content',
    } });
    expect(operations[1]).toMatchObject({ kind: 'update', table: targets, values: { status: 'descartado' } });
    expect(operations[1]?.values).not.toHaveProperty('notes');
    expect(operations[1]?.values.contactedAt).toBeUndefined();
  });
  it('does not change a target if writing its feedback history fails', async () => {
    selectRows = [[{ id: 22, status: 'pendiente' }], []];
    mockInsert.mockImplementationOnce(() => ({ values: () => { throw new Error('Synthetic history storage failure'); } }));
    await expect(recordCreatorFeedback({ targetId: 22, status: 'descartado', reason: 'wrong_content' }, 'synthetic-user')).rejects.toThrow('history');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it('timestamps a manual decision after waiting for the row lock, not at transaction start', async () => {
    afterLockTime = new Date(now.getTime() + 5_000);
    selectRows = [[{ id: 22, status: 'descartado' }], []];
    await recordCreatorFeedback({ targetId: 22, status: 'descartado', reason: 'other' }, 'synthetic-user');
    expect(operations[0]?.values.createdAt).toEqual(afterLockTime);
    expect(operations[1]?.values.updatedAt).toEqual(afterLockTime);
  });
  it('does not create orphan feedback for a missing target', async () => {
    selectRows = [[]];
    await expect(recordCreatorFeedback({ targetId: 22, status: 'descartado', reason: 'wrong_content' }, 'synthetic-user')).rejects.toThrow('creator_target_not_found');
    expect(operations).toHaveLength(0);
  });
});
