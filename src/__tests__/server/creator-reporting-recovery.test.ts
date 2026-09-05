const mockEnv: { CREATOR_DISCOVERY_ROLLOUT_AT?: string; DISCORD_CREATOR_DISCOVERY_CHANNEL_ID?: string; DISCORD_CREATOR_DISCOVERY_GUILD_ID?: string } = {};
jest.mock('@/lib/env', () => ({ env: mockEnv }));
jest.mock('@/lib/queries/creatorDiscoveryRecovery', () => ({ listCreatorRunsPendingReporting: jest.fn() }));
jest.mock('@/lib/queries/creatorDiscoveryReporting', () => ({ recordCreatorRunReporting: jest.fn() }));
jest.mock('@/lib/services/creatorTargetDiscovery', () => ({ runCreatorTargetDiscovery: jest.fn() }));
import { repairCreatorDiscoveryReporting } from '@/lib/services/creator-reporting-recovery';
import { listCreatorRunsPendingReporting } from '@/lib/queries/creatorDiscoveryRecovery';
import { recordCreatorRunReporting } from '@/lib/queries/creatorDiscoveryReporting';
import { runCreatorTargetDiscovery } from '@/lib/services/creatorTargetDiscovery';

const now = new Date('2026-09-05T16:00:00.000Z');
const cutoff = '2026-09-05T12:00:00.000Z';
function run(id: number, overrides: Partial<Awaited<ReturnType<typeof listCreatorRunsPendingReporting>>[number]> = {}) {
  return { id, status: 'success', startedAt: new Date(`2026-09-05T12:0${id}:00.000Z`),
    completedAt: new Date(`2026-09-05T12:0${id}:30.000Z`), platformResults: [], ...overrides };
}
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers().setSystemTime(now);
  mockEnv.CREATOR_DISCOVERY_ROLLOUT_AT = cutoff;
  mockEnv.DISCORD_CREATOR_DISCOVERY_CHANNEL_ID = '100000000000000001';
  mockEnv.DISCORD_CREATOR_DISCOVERY_GUILD_ID = '100000000000000002';
  jest.mocked(listCreatorRunsPendingReporting).mockResolvedValue([]);
  jest.mocked(recordCreatorRunReporting).mockResolvedValue();
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No HTTP permitted'));
});
afterEach(() => {
  expect(runCreatorTargetDiscovery).not.toHaveBeenCalled();
  expect(globalThis.fetch).not.toHaveBeenCalled();
  jest.restoreAllMocks(); jest.useRealTimers();
});

it.each([undefined, ''])('does not even read historical runs without an explicit cutoff: %s', async value => {
  if (value === undefined) delete mockEnv.CREATOR_DISCOVERY_ROLLOUT_AT;
  else mockEnv.CREATOR_DISCOVERY_ROLLOUT_AT = value;
  expect(await repairCreatorDiscoveryReporting()).toMatchObject({ status: 'skipped', code: 'rollout_cutoff_required' });
  expect(listCreatorRunsPendingReporting).not.toHaveBeenCalled();
  expect(recordCreatorRunReporting).not.toHaveBeenCalled();
});
it.each(['not-an-iso-date', '2026-09-05', '2026-02-30T00:00:00Z'])('rejects invalid cutoff %s without querying', async value => {
  mockEnv.CREATOR_DISCOVERY_ROLLOUT_AT = value;
  expect(await repairCreatorDiscoveryReporting()).toMatchObject({ status: 'skipped', code: 'invalid_rollout_cutoff' });
  expect(listCreatorRunsPendingReporting).not.toHaveBeenCalled();
});
it('does nothing before the explicitly configured rollout time', async () => {
  mockEnv.CREATOR_DISCOVERY_ROLLOUT_AT = '2026-09-06T12:00:00Z';
  expect(await repairCreatorDiscoveryReporting()).toMatchObject({ status: 'skipped', code: 'rollout_not_started' });
  expect(listCreatorRunsPendingReporting).not.toHaveBeenCalled();
});
it.each(['DISCORD_CREATOR_DISCOVERY_CHANNEL_ID', 'DISCORD_CREATOR_DISCOVERY_GUILD_ID'] as const)('does nothing without %s', async key => {
  delete mockEnv[key];
  expect(await repairCreatorDiscoveryReporting()).toMatchObject({ status: 'skipped', code: 'digest_not_configured' });
  expect(listCreatorRunsPendingReporting).not.toHaveBeenCalled();
});
it('uses only persisted IDs/results, chronological order and original completion timestamps', async () => {
  const results = [{ platform: 'youtube', status: 'partial', found: 3, qualified: 1, inserted: 1, updated: 0, error: null }] as const;
  const earlier = run(1, { platformResults: [...results], status: 'partial' }), later = run(2);
  jest.mocked(listCreatorRunsPendingReporting).mockResolvedValue([later, earlier]);
  expect(await repairCreatorDiscoveryReporting()).toEqual({ status: 'success', scanned: 2, repaired: 2, code: null });
  expect(listCreatorRunsPendingReporting).toHaveBeenCalledWith(new Date(cutoff), now);
  expect(recordCreatorRunReporting).toHaveBeenNthCalledWith(1, 1, earlier.startedAt, results, { completedAt: earlier.completedAt, recovered: true });
  expect(recordCreatorRunReporting).toHaveBeenNthCalledWith(2, 2, later.startedAt, [], { completedAt: later.completedAt, recovered: true });
});
it('never repairs more than five even if an isolated adapter returns too many rows', async () => {
  jest.mocked(listCreatorRunsPendingReporting).mockResolvedValue(Array.from({ length: 7 }, (_, index) => run(index + 1)));
  expect((await repairCreatorDiscoveryReporting()).repaired).toBe(5);
  expect(recordCreatorRunReporting).toHaveBeenCalledTimes(5);
});
it.each([
  { startedAt: new Date('2026-09-04T10:00:00Z') }, { completedAt: null },
  { completedAt: new Date('2026-09-06T10:00:00Z') }, { status: 'running' },
  { completedAt: new Date('2026-09-05T12:00:01Z') },
])('does not repair an ineligible stored run: %j', async overrides => {
  jest.mocked(listCreatorRunsPendingReporting).mockResolvedValue([run(1, overrides)]);
  expect(await repairCreatorDiscoveryReporting()).toMatchObject({ status: 'partial', repaired: 0, code: 'invalid_stored_run' });
  expect(recordCreatorRunReporting).not.toHaveBeenCalled();
});
it('sanitizes read failure instead of exposing raw DB metadata', async () => {
  jest.mocked(listCreatorRunsPendingReporting).mockRejectedValue(new Error('private-marker'));
  const result = await repairCreatorDiscoveryReporting();
  expect(result.code).toBe('recovery_read_failed'); expect(JSON.stringify(result)).not.toContain('private-marker');
});
it('stops on the first reporting failure and never retries providers', async () => {
  jest.mocked(listCreatorRunsPendingReporting).mockResolvedValue([run(1), run(2)]);
  jest.mocked(recordCreatorRunReporting).mockRejectedValueOnce(new Error('private-marker'));
  expect(await repairCreatorDiscoveryReporting()).toEqual({ status: 'partial', scanned: 1, repaired: 0, code: 'reporting_pending' });
  expect(recordCreatorRunReporting).toHaveBeenCalledTimes(1);
});
