import type { syncCampaignSheet } from '@/lib/queries/campaign-sheet-sync';

jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: {} }));
jest.mock('@/db/schema/campaigns', () => ({ campaigns: { id: 'id' } }));
jest.mock('@/db/schema/dealDeliverableTrackers', () => ({ dealDeliverableTrackers: {} }));
jest.mock('@/db/schema/crmBrands', () => ({ crmBrands: {} }));
jest.mock('@/db/schema/talents', () => ({ talents: {}, talentSocials: {} }));
jest.mock('drizzle-orm', () => ({
  eq: (_column: unknown, value: number) => ({ value }),
  ne: () => ({}), and: () => ({}), isNotNull: () => ({}), isNull: () => ({}), inArray: () => ({}),
  sql: () => ({}),
}));

const mockLimit = jest.fn((count: number) => Promise.resolve(
  Array.from({ length: Math.min(count, 20) }, (_, index) => ({ id: index + 1 })),
));
const mockSync: jest.MockedFunction<typeof syncCampaignSheet> = jest.fn();
jest.mock('@/lib/queries/campaign-sheet-sync', () => ({
  syncCampaignSheet: (...args: Parameters<typeof syncCampaignSheet>) => mockSync(...args),
}));
jest.mock('@/lib/db', () => ({
  db: {
    select: (fields: Record<string, unknown>) => ({
      from: () => ({
        where: (condition: { value?: number }) => ({
          orderBy: () => ({ limit: mockLimit }),
          limit: async () => [{
            id: condition.value, name: 'Fixture', status: 'activa', brandId: 1, talentId: 2,
            trackingSheetUrl: 'fixture', syncError: null, lastSyncedAt: null,
            lastEvidenceAddedAt: null, alertLevel: 0,
          }],
          // Only the tracker selection is awaited directly; no live DB exists.
          then: (resolve: (rows: unknown[]) => void) => resolve(
            'targetCount' in fields ? [{ type: 'video_youtube', targetCount: 10, currentCount: 8 }] : [],
          ),
        }),
      }),
    }),
  },
}));

describe('automated Sheets batch — isolated rows and per-campaign sync', () => {
  const base = Date.UTC(2026, 8, 6);
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(base);
    jest.clearAllMocks();
  });
  afterEach(() => { jest.useRealTimers(); });

  it('limits to 12 with concurrency 3, one shared deadline and no alerts for failed reads', async () => {
    let active = 0;
    let peak = 0;
    mockSync.mockImplementation(async (id) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      active--;
      if (id === 2 || id === 5) return { ok: false, error: 'fixture deferred' };
      return { ok: true, updated: 0, ignoredBlocks: 0, notFoundTypes: 0, syncedAt: new Date().toISOString(), summary: 'Fixture' };
    });
    const { syncAllAutomatedDeals } = await import('@/lib/queries/automationDeals');
    const result = syncAllAutomatedDeals();
    await jest.runAllTimersAsync();
    const settled = await result;
    expect(mockLimit).toHaveBeenCalledWith(12);
    expect(peak).toBe(3);
    expect(mockSync).toHaveBeenCalledTimes(12);
    for (const [, options] of mockSync.mock.calls) {
      expect(options).toEqual({ deadlineAt: base + 105_000 });
    }
    expect(settled).toMatchObject({ total: 12, synced: 10, failed: 2 });
    expect(settled.alerts.map((alert) => alert.campaignId)).toEqual([1, 3, 4, 6, 7, 8, 9, 10, 11, 12]);
  });
});
