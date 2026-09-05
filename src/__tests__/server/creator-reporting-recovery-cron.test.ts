import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { runDueCreatorSearchProfiles } from '@/lib/services/creatorSearchProfiles';
import { repairCreatorDiscoveryReporting } from '@/lib/services/creator-reporting-recovery';
import { expireCreatorMetricPayloads } from '@/lib/queries/creatorRetention';
import { GET } from '@/app/api/cron/discover-creator-targets/route';

jest.mock('@/lib/security/assertCronAuth', () => ({ assertCronAuth: jest.fn() }));
jest.mock('@/lib/services/creatorSearchProfiles', () => ({ runDueCreatorSearchProfiles: jest.fn() }));
jest.mock('@/lib/services/creator-reporting-recovery', () => ({ repairCreatorDiscoveryReporting: jest.fn() }));
jest.mock('@/lib/queries/creatorRetention', () => ({ expireCreatorMetricPayloads: jest.fn() }));
const request = () => new NextRequest('https://example.invalid/api/cron/discover-creator-targets');

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(assertCronAuth).mockReturnValue(null);
  jest.mocked(expireCreatorMetricPayloads).mockResolvedValue({ status: 'success', processedAccounts: 0, clearedSnapshots: 0, errors: 0 });
  jest.mocked(repairCreatorDiscoveryReporting).mockResolvedValue({ status: 'success', scanned: 0, repaired: 0, code: null });
  jest.mocked(runDueCreatorSearchProfiles).mockResolvedValue([]);
});
it('authenticates before recovery or scheduled work', async () => {
  jest.mocked(assertCronAuth).mockReturnValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  expect((await GET(request())).status).toBe(401);
  expect(repairCreatorDiscoveryReporting).not.toHaveBeenCalled();
  expect(runDueCreatorSearchProfiles).not.toHaveBeenCalled();
  expect(expireCreatorMetricPayloads).not.toHaveBeenCalled();
});
it('awaits recovery before evaluating due profiles', async () => {
  let complete: (() => void) | undefined;
  jest.mocked(repairCreatorDiscoveryReporting).mockImplementation(() => new Promise(resolve => {
    complete = () => resolve({ status: 'success', scanned: 1, repaired: 1, code: null });
  }));
  const pending = GET(request());
  await Promise.resolve();
  await Promise.resolve();
  expect(runDueCreatorSearchProfiles).not.toHaveBeenCalled();
  complete?.();
  const response = await pending;
  expect(response.status).toBe(200);
  expect(runDueCreatorSearchProfiles).toHaveBeenCalledTimes(1);
  expect(await response.json()).toMatchObject({ reportingRecovery: { repaired: 1 }, processedProfiles: 0 });
});
it('runs retention even when no profiles are due and exposes an incomplete cleanup', async () => {
  jest.mocked(expireCreatorMetricPayloads).mockResolvedValue({ status: 'partial', processedAccounts: 10, clearedSnapshots: 100, errors: 0 });
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ success: false, retention: { status: 'partial' } });
  expect(jest.mocked(expireCreatorMetricPayloads).mock.invocationCallOrder[0])
    .toBeLessThan(jest.mocked(repairCreatorDiscoveryReporting).mock.invocationCallOrder[0] ?? Infinity);
});
it('keeps a pending report visible without blindly reexecuting a discovery run', async () => {
  jest.mocked(repairCreatorDiscoveryReporting).mockResolvedValue({ status: 'partial', scanned: 1, repaired: 0, code: 'reporting_pending' });
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(runDueCreatorSearchProfiles).toHaveBeenCalledTimes(1);
  expect(await response.json()).toMatchObject({ success: false, reportingRecovery: { code: 'reporting_pending' } });
});
it('allows normal due scheduling when report recovery is explicitly not configured', async () => {
  jest.mocked(repairCreatorDiscoveryReporting).mockResolvedValue({ status: 'skipped', scanned: 0, repaired: 0, code: 'rollout_cutoff_required' });
  expect((await GET(request())).status).toBe(200);
  expect(runDueCreatorSearchProfiles).toHaveBeenCalledTimes(1);
});
