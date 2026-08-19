jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));

import { classifyNextAction } from '@/lib/queries/automationDealDigest';

describe('classifyNextAction', () => {
  it('prioriza errores y ausencia de Sheet', () => {
    expect(classifyNextAction({
      trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/1/edit',
      syncError: 'Sin permiso',
      progressPct: 100,
      inactiveDays: 30,
    })).toBe('sync_error');
    expect(classifyNextAction({
      trackingSheetUrl: null,
      syncError: null,
      progressPct: 100,
      inactiveDays: 30,
    })).toBe('missing_sheet');
  });

  it('separa terminado, preparación de factura e inactividad', () => {
    const base = {
      trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/1/edit',
      syncError: null,
    };
    expect(classifyNextAction({ ...base, progressPct: 100, inactiveDays: 0 })).toBe('completed');
    expect(classifyNextAction({ ...base, progressPct: 70, inactiveDays: 0 })).toBe('prepare_invoice');
    expect(classifyNextAction({ ...base, progressPct: 50, inactiveDays: 10 })).toBe('stale');
    expect(classifyNextAction({ ...base, progressPct: 50, inactiveDays: 9 })).toBe('on_track');
  });
});
