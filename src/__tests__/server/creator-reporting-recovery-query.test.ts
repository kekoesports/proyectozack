import { creatorDigestOutbox, creatorDiscoveryRuns } from '@/db/schema';
import { PgDialect, QueryBuilder } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

const mockSelect = jest.fn();
jest.mock('@/lib/db', () => ({ db: { select: (...args: unknown[]) => mockSelect(...args) } }));
import { listCreatorRunsPendingReporting } from '@/lib/queries/creatorDiscoveryRecovery';

it('uses exact outbox identity, terminal states, fixed rollout, ascending order and SQL limit five', async () => {
  let predicate: SQL | undefined;
  let ordering: SQL[] = [];
  let limit: number | undefined;
  mockSelect.mockImplementation(() => ({ from: (table: unknown) => {
    if (table === creatorDigestOutbox) return new QueryBuilder().select({ id: creatorDigestOutbox.id }).from(creatorDigestOutbox);
    expect(table).toBe(creatorDiscoveryRuns);
    return { where: (condition: SQL) => { predicate = condition; return { orderBy: (...terms: SQL[]) => {
      ordering = terms; return { limit: async (value: number) => { limit = value; return []; } };
    } }; } };
  } }));
  const since = new Date('2026-09-05T12:00:00Z'), until = new Date('2026-09-05T16:00:00Z');
  await listCreatorRunsPendingReporting(since, until);
  expect(limit).toBe(5);
  if (!predicate) throw new Error('Missing query condition');
  const dialect = new PgDialect();
  const query = dialect.sqlToQuery(predicate);
  expect(query.sql).toContain('not exists');
  expect(query.sql).toContain('creator-run:');
  expect(query.sql).toContain('"event_key" =');
  expect(query.sql).toContain('"creator_discovery_runs"."id"::text');
  expect(query.sql).toContain('"started_at" >=');
  expect(query.sql).toContain('"completed_at" <=');
  expect(query.sql).toContain('"completed_at" is not null');
  expect(query.params).toEqual(expect.arrayContaining(['success', 'partial', 'failed', since.toISOString(), until.toISOString()]));
  expect(ordering.map(term => dialect.sqlToQuery(term).sql)).toEqual([
    '"creator_discovery_runs"."started_at" asc', '"creator_discovery_runs"."id" asc',
  ]);
});

it('rejects invalid windows before constructing any query', async () => {
  mockSelect.mockClear();
  await expect(listCreatorRunsPendingReporting(new Date('invalid'), new Date())).rejects.toThrow('creator_reporting_recovery_invalid_window');
  await expect(listCreatorRunsPendingReporting(new Date('2026-09-06'), new Date('2026-09-05'))).rejects.toThrow('creator_reporting_recovery_invalid_window');
  expect(mockSelect).not.toHaveBeenCalled();
});
