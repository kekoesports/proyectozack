jest.mock('server-only', () => ({}));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));
jest.mock('@/lib/env', () => ({ env: { AGENT_PROCESSING_AFTER: '2026-09-11T06:00:00.000Z' } }));

import { PgDialect } from 'drizzle-orm/pg-core';
import { buildClaimSql } from '@/lib/agents/worker/claim';
import { windowsToMaterialize } from '@/lib/agents/worker/scheduler';

it('binds the activation cutoff to queue claims instead of claiming historical runs', () => {
  const query = new PgDialect().sqlToQuery(buildClaimSql({ workerId: 'fixture', leaseSeconds: 30 }));
  expect(query.sql).toMatch(/"agent_runs"\."created_at" >= \$\d+::timestamptz/);
  expect(query.params).toContain('2026-09-11T06:00:00.000Z');
});

it('bounds catch-up to windows after activation while retaining the run limit', () => {
  const windows = windowsToMaterialize({
    cronExpression: '30 8 * * *', timezone: 'Europe/Madrid',
    catchUpPolicy: 'all_limited', maxCatchUpRuns: 3,
    lastScheduledFor: new Date('2026-08-01T06:30:00Z'),
    nextRunAt: new Date('2026-08-02T06:30:00Z'),
  }, new Date('2026-09-14T08:00:00Z'));
  expect(windows.map(value => value.toISOString())).toEqual([
    '2026-09-11T06:30:00.000Z', '2026-09-12T06:30:00.000Z', '2026-09-13T06:30:00.000Z',
  ]);
});
