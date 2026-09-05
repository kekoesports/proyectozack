import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { DEFAULT_CREATOR_SEARCH_PROFILE } from '@/lib/schemas/creator-search-profile';

const mockUpdate = jest.fn();
const mockReadiness = jest.fn();
const mockPreflight = jest.fn();
const mockDiscovery = jest.fn();
const mockDue = jest.fn();
jest.mock('@/lib/db', () => ({ db: { update: (...args: unknown[]) => mockUpdate(...args) } }));
jest.mock('@/lib/queries/creatorProviderReadiness', () => ({
  getCreatorProviderReadiness: () => mockReadiness(), recordCreatorPreflight: (...args: unknown[]) => mockPreflight(...args),
}));
jest.mock('@/lib/queries/creatorSearchProfiles', () => ({ listDueCreatorSearchProfiles: () => mockDue() }));
jest.mock('@/lib/services/creatorTargetDiscovery', () => ({ runCreatorTargetDiscovery: (...args: unknown[]) => mockDiscovery(...args) }));

import { runCreatorSearchProfile, runDueCreatorSearchProfiles } from '@/lib/services/creatorSearchProfiles';
import { CreatorDiscoveryReportingPendingError } from '@/lib/services/creator-reporting-status';

type Update = { values: Record<string, unknown>; condition?: SQL };
const dialect = new PgDialect();
const now = new Date('2026-09-05T10:00:00Z');
const config = { ...DEFAULT_CREATOR_SEARCH_PROFILE, enabled: true };
const fixture = { id: 7, config, enabled: true, version: 3, lastRunAt: null };
let writes: Update[];

function installRows(rows: readonly unknown[]): void {
  mockUpdate.mockImplementation(() => ({ set: (values: Record<string, unknown>) => {
    const write: Update = { values };
    writes.push(write);
    return { where: (condition: SQL) => {
      write.condition = condition;
      return { returning: async () => rows };
    } };
  } }));
}
function queryFor(index: number) {
  const condition = writes[index]?.condition;
  if (!condition) throw new Error('Missing SQL condition in isolated mock');
  return dialect.sqlToQuery(condition);
}

describe('creator profile claim and finalization boundaries (no DB or provider access)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    writes = [];
    installRows([fixture]);
    mockReadiness.mockResolvedValue([{ platform: 'youtube', ready: true, code: 'READY', message: 'Synthetic approval' }]);
    mockPreflight.mockResolvedValue(undefined);
    mockDiscovery.mockResolvedValue({ status: 'success' });
    mockDue.mockResolvedValue([]);
  });
  afterEach(() => jest.useRealTimers());

  it('does not invoke providers when a lease cannot be claimed', async () => {
    installRows([]);
    await expect(runCreatorSearchProfile(7, 'scheduled')).resolves.toMatchObject({ ok: false });
    expect(mockDiscovery).not.toHaveBeenCalled();
    expect(writes).toHaveLength(1);
  });

  it('checks enabled plus lease state inside the atomic scheduled claim', async () => {
    await runCreatorSearchProfile(7, 'scheduled');
    const query = queryFor(0);
    expect(query.sql).toContain('"enabled" =');
    expect(query.sql).toContain('"lease_until"');
    expect(query.params).toContain(true);
  });

  it('rechecks due time in the claim, so a stale scheduler list cannot run a just-completed profile twice', async () => {
    await runCreatorSearchProfile(7, 'scheduled');
    expect(queryFor(0).sql).toMatch(/"next_run_at"\s*<=/);
  });

  it('polling five minutes later does not turn a completed daily profile into another search', async () => {
    mockDue.mockResolvedValueOnce([fixture]).mockResolvedValueOnce([]);
    await expect(runDueCreatorSearchProfiles()).resolves.toEqual([{ profileId: 7, ok: true, error: null }]);
    const nextRun = writes.find(write => Object.hasOwn(write.values, 'nextRunAt'))?.values.nextRunAt;
    expect(nextRun).toEqual(new Date('2026-09-06T06:30:00Z'));
    expect(queryFor(0).sql).toMatch(/"next_run_at"\s*<=/);
    expect(queryFor(0).sql).toContain('"lease_until"');
    jest.setSystemTime(new Date(now.getTime() + 5 * 60_000));
    await expect(runDueCreatorSearchProfiles()).resolves.toEqual([]);
    expect(mockDiscovery).toHaveBeenCalledTimes(1);
    expect(mockDue).toHaveBeenCalledTimes(2);
  });

  it('allows deliberate manual searches independent of the next scheduled date', async () => {
    await runCreatorSearchProfile(7, 'manual');
    expect(queryFor(0).sql).not.toContain('"next_run_at"');
  });

  it('protects a concurrent editor schedule when finalization writes nextRunAt', async () => {
    mockDiscovery.mockImplementation(async () => {
      // The editor changes the schedule/version while the claimed snapshot remains version 3.
      // Finalization must either leave nextRunAt untouched or CAS against that version.
      return { status: 'success' };
    });
    await runCreatorSearchProfile(7, 'manual');
    const scheduleWrites = writes.map((write, index) => ({ write, index }))
      .filter(({ write }) => Object.hasOwn(write.values, 'nextRunAt'));
    expect(scheduleWrites).toHaveLength(1);
    for (const { index } of scheduleWrites) {
      const query = queryFor(index);
      expect(query.sql).toContain('"version" =');
      expect(query.params).toContain(fixture.version);
    }
  });

  it('fences lease release with the unique claimed token', async () => {
    await runCreatorSearchProfile(7, 'manual');
    const token = writes[0]?.values.leaseToken;
    expect(typeof token).toBe('string');
    expect(queryFor(writes.length - 1).params).toContain(token);
    expect(writes.at(-1)?.values.leaseToken).toBeNull();
  });

  it('does not invoke discovery when every selected provider is blocked', async () => {
    mockReadiness.mockResolvedValue([{ platform: 'youtube', ready: false, message: 'No permission' }]);
    await expect(runCreatorSearchProfile(7, 'manual')).resolves.toEqual({ ok: false, error: 'No permission' });
    expect(mockDiscovery).not.toHaveBeenCalled();
    expect(writes.at(-1)?.values.lastRunAt).toBeNull();
  });

  it('releases an invalid legacy config cleanly instead of throwing from finally', async () => {
    installRows([{ ...fixture, config: { ...config, scheduleTime: null } }]);
    await expect(runCreatorSearchProfile(7, 'manual')).resolves.toMatchObject({ ok: false, error: expect.stringContaining('configuración') });
    expect(mockDiscovery).not.toHaveBeenCalled();
    expect(writes.at(-1)?.values.leaseToken).toBeNull();
  });

  it('distinguishes a stored search with pending reporting and never repeats discovery', async () => {
    mockDiscovery.mockRejectedValueOnce(new CreatorDiscoveryReportingPendingError());
    const result = await runCreatorSearchProfile(7, 'manual');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Búsqueda registrada, informe pendiente');
    expect(result.error).toContain('no repitas la búsqueda');
    expect(mockDiscovery).toHaveBeenCalledTimes(1);
    expect(writes.at(-1)?.values.leaseToken).toBeNull();
    expect(writes.at(-1)?.values.lastRunAt).toEqual(now);
  });
});
