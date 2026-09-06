import type { applyCampaignSheetEvidence } from '@/lib/queries/campaign-sheet-evidence';
import type { listSheetTabs, readSheetGrid } from '@/lib/integrations/google-sheets';

jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: {} }));

const priorSuccess = new Date('2026-09-05T20:00:00Z');
const base = Date.UTC(2026, 8, 6);
const mockState: {
  lastTrackingSyncAt: Date;
  trackingSyncError: string | null;
  currentCount: number;
  trackingAlertLevel: number;
  trackerStatus: string;
  evidence: string[];
  updatedAt?: Date;
} = {
  lastTrackingSyncAt: priorSuccess,
  trackingSyncError: 'previous fixture error',
  currentCount: 9,
  trackingAlertLevel: 70,
  trackerStatus: 'review_pending',
  evidence: ['fixture-evidence'],
};

const mockSet = jest.fn((patch: Partial<typeof mockState>) => ({
  where: async () => { Object.assign(mockState, patch); },
}));
const mockInsertedRows = jest.fn<Promise<Array<{ id: number; deliverableType: string; currentCount: number }>>, []>();
const mockInsert = jest.fn(() => ({ values: () => ({ returning: mockInsertedRows }) }));
const mockDb = {
  select: () => ({
    from: () => ({
      innerJoin: () => ({
        where: () => ({
          limit: async () => [{
            id: 1, name: 'Fixture', talentId: 2, brandName: 'Fixture',
            trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/fixture/edit',
            trackingSheetSpreadsheetId: 'fixture', trackingSheetGid: null,
          }],
        }),
      }),
      where: async () => [{ id: 3, deliverableType: 'video_youtube', currentCount: mockState.currentCount }],
    }),
  }),
  update: () => ({ set: mockSet }),
  insert: mockInsert,
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

const mockTabs: jest.MockedFunction<typeof listSheetTabs> = jest.fn();
const mockGrid: jest.MockedFunction<typeof readSheetGrid> = jest.fn();
jest.mock('@/lib/integrations/google-sheets', () => ({
  ...jest.requireActual<typeof import('@/lib/integrations/google-sheets-policy')>('@/lib/integrations/google-sheets-policy'),
  listSheetTabs: (...args: Parameters<typeof listSheetTabs>) => mockTabs(...args),
  readSheetGrid: (...args: Parameters<typeof readSheetGrid>) => mockGrid(...args),
}));
const mockApply: jest.MockedFunction<typeof applyCampaignSheetEvidence> = jest.fn();
jest.mock('@/lib/queries/campaign-sheet-evidence', () => ({
  applyCampaignSheetEvidence: (...args: Parameters<typeof applyCampaignSheetEvidence>) => mockApply(...args),
}));

describe('campaign Sheets deadline — database and evidence writer are isolated fixtures', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(base);
    jest.clearAllMocks();
    mockState.lastTrackingSyncAt = priorSuccess;
    mockState.trackingSyncError = 'previous fixture error';
    mockTabs.mockResolvedValue([{ sheetId: '0', title: 'Fixture', index: 0 }]);
    mockGrid.mockResolvedValue([]);
    mockInsertedRows.mockRejectedValue(new Error('unexpected fixture insert'));
    mockApply.mockImplementation(async (input) => {
      mockState.lastTrackingSyncAt = input.syncedAt;
      mockState.trackingSyncError = null;
      return { updated: 0, usedTypes: new Set<string>(), newEvidence: 0 };
    });
  });
  afterEach(() => { jest.useRealTimers(); });

  function expectPriorEvidencePreserved(): void {
    expect(mockApply).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockState.lastTrackingSyncAt).toBe(priorSuccess);
    expect(mockState.currentCount).toBe(9);
    expect(mockState.trackingAlertLevel).toBe(70);
    expect(mockState.trackerStatus).toBe('review_pending');
    expect(mockState.evidence).toEqual(['fixture-evidence']);
    expect(mockSet.mock.calls[0]?.[0]).toEqual({ trackingSyncError: expect.any(String), updatedAt: expect.any(Date) });
  }

  it('does no Sheets read or evidence write after the batch deadline', async () => {
    const { syncCampaignSheet } = await import('@/lib/queries/campaign-sheet-sync');
    const result = await syncCampaignSheet(1, { deadlineAt: base });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('diferida') });
    expect(mockTabs).not.toHaveBeenCalled();
    expect(mockGrid).not.toHaveBeenCalled();
    expectPriorEvidencePreserved();
  });

  it('keeps counts, status, prior success and alert watermark when grid admission is deferred', async () => {
    const { SheetsDeadlineError } = await import('@/lib/integrations/google-sheets-policy');
    mockGrid.mockRejectedValueOnce(new SheetsDeadlineError());
    const { syncCampaignSheet } = await import('@/lib/queries/campaign-sheet-sync');
    const result = await syncCampaignSheet(1, { deadlineAt: base + 105_000 });
    expect(result.ok).toBe(false);
    expect(mockTabs).toHaveBeenCalledWith('fixture', { deadlineAt: base + 105_000 });
    expect(mockGrid).toHaveBeenCalledWith('fixture', 'Fixture', { deadlineAt: base + 105_000 });
    expectPriorEvidencePreserved();
  });

  it('does not apply an otherwise valid grid that arrives after the deadline', async () => {
    mockGrid.mockImplementationOnce(async () => {
      jest.setSystemTime(base + 105_001);
      return [];
    });
    const { syncCampaignSheet } = await import('@/lib/queries/campaign-sheet-sync');
    expect((await syncCampaignSheet(1, { deadlineAt: base + 105_000 })).ok).toBe(false);
    expectPriorEvidencePreserved();
  });

  it.each([403, 429])('preserves prior progress on HTTP %s and records only a safe error', async (status) => {
    const { SheetsApiError } = await import('@/lib/integrations/google-sheets-policy');
    mockGrid.mockRejectedValueOnce(new SheetsApiError('PRIVATE_FIXTURE', status));
    const { syncCampaignSheet } = await import('@/lib/queries/campaign-sheet-sync');
    expect((await syncCampaignSheet(1, { deadlineAt: base + 105_000 })).ok).toBe(false);
    expectPriorEvidencePreserved();
    expect(mockState.trackingSyncError).not.toContain('PRIVATE_FIXTURE');
    expect(mockState.trackingSyncError).not.toContain('cualquiera con el enlace');
  });

  it('only hands successful reads to the existing evidence writer', async () => {
    const { syncCampaignSheet } = await import('@/lib/queries/campaign-sheet-sync');
    const result = await syncCampaignSheet(1, { deadlineAt: base + 105_000 });
    expect(result.ok).toBe(true);
    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockState.lastTrackingSyncAt).toEqual(new Date(base));
    expect(mockState.trackingSyncError).toBeNull();
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockState.trackingAlertLevel).toBe(70);
  });

  it('finishes an admitted persistence phase if its insert crosses the read budget', async () => {
    mockGrid.mockImplementationOnce(async () => {
      jest.setSystemTime(base + 104_999);
      return [
        ['ID', 'TIPO DE CONTENIDO', 'ESTADO', 'ENLACE / EVIDENCIA'],
        ['FIXTURE-1', 'Stream', 'Entregado', 'https://twitch.tv/videos/123'],
      ];
    });
    mockInsertedRows.mockImplementationOnce(async () => {
      jest.setSystemTime(base + 106_000);
      return [{ id: 4, deliverableType: 'stream_integration', currentCount: 0 }];
    });
    const { syncCampaignSheet } = await import('@/lib/queries/campaign-sheet-sync');
    const result = await syncCampaignSheet(1, { deadlineAt: base + 105_000 });
    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith(expect.objectContaining({
      trackers: expect.arrayContaining([{ id: 4, deliverableType: 'stream_integration', currentCount: 0 }]),
      syncedAt: new Date(base + 106_000),
    }));
    expect(mockState.trackingSyncError).toBeNull();
    expect(mockSet).not.toHaveBeenCalled();
  });
});
