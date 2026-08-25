jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));

import {
  classifyNextAction,
  formatAutomationDealDetailForDiscord,
  formatAutomationDealDigestForDiscord,
  shouldIncludeInDigest,
  type AutomationDealDigest,
  type AutomationDealDigestRow,
  type DealDigestAction,
} from '@/lib/queries/automationDealDigest';

describe('classifyNextAction', () => {
  it('prioriza errores y ausencia de Sheet', () => {
    expect(classifyNextAction({
      trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/1/edit',
      syncError: 'Sin permiso',
      targetCount: 20,
      currentCount: 20,
      progressPct: 100,
      inactiveDays: 30,
    })).toBe('sync_error');
    expect(classifyNextAction({
      trackingSheetUrl: null,
      syncError: null,
      targetCount: 20,
      currentCount: 20,
      progressPct: 100,
      inactiveDays: 30,
    })).toBe('missing_sheet');
  });

  it('separa terminado, preparación de factura e inactividad', () => {
    const base = {
      trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/1/edit',
      syncError: null,
      targetCount: 20,
      currentCount: 10,
    };
    expect(classifyNextAction({ ...base, progressPct: 100, inactiveDays: 0 })).toBe('completed');
    expect(classifyNextAction({ ...base, progressPct: 80, inactiveDays: 0 })).toBe('prepare_invoice');
    expect(classifyNextAction({ ...base, progressPct: 79, inactiveDays: 0 })).toBe('on_track');
    expect(classifyNextAction({ ...base, progressPct: 50, inactiveDays: 10 })).toBe('stale');
    expect(classifyNextAction({ ...base, progressPct: 50, inactiveDays: 9 })).toBe('on_track');
  });

  it('no presenta 0% como progreso real cuando faltan objetivos', () => {
    expect(classifyNextAction({
      trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/1/edit',
      syncError: null,
      targetCount: 0,
      currentCount: 0,
      progressPct: 0,
      inactiveDays: 30,
    })).toBe('missing_targets');
  });

  it('separa las hojas en blanco de los tratos parados o en progreso', () => {
    expect(classifyNextAction({
      trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/1/edit',
      syncError: null,
      targetCount: 20,
      currentCount: 0,
      progressPct: 0,
      inactiveDays: 30,
    })).toBe('empty_sheet');
  });

  it('no oculta un error aunque el progreso calculado sea del 100%', () => {
    expect(classifyNextAction({
      trackingSheetUrl: null,
      syncError: 'Google devolvió 403',
      targetCount: 20,
      currentCount: 20,
      progressPct: 100,
      inactiveDays: 30,
    })).toBe('sync_error');
  });

  it('oculta los tratos antiguos al 100% pero conserva los recién completados', () => {
    expect(shouldIncludeInDigest({ nextAction: 'completed', inactiveDays: 10 })).toBe(false);
    expect(shouldIncludeInDigest({ nextAction: 'completed', inactiveDays: 9 })).toBe(true);
    expect(shouldIncludeInDigest({ nextAction: 'sync_error', inactiveDays: 30 })).toBe(true);
  });
});

function row(
  campaignId: number,
  nextAction: DealDigestAction,
  overrides: Partial<AutomationDealDigestRow> = {},
): AutomationDealDigestRow {
  return {
    campaignId,
    name: `Trato ${campaignId}`,
    brandName: `Marca ${campaignId}`,
    talentName: `Creador ${campaignId}`,
    status: 'activa',
    currency: 'EUR',
    amountBrand: '0',
    amountTalent: '0',
    amountInKindTalent: null,
    amountInKindCommunity: null,
    crmPath: `/admin/campanas/${campaignId}`,
    trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/example/edit',
    syncError: null,
    lastSyncedAt: '2026-08-25T08:00:00.000Z',
    lastEvidenceAddedAt: '2026-08-25T08:00:00.000Z',
    invoiceId: null,
    invoiceNumber: null,
    invoiceStatus: null,
    targetCount: 10,
    currentCount: 5,
    progressPct: 50,
    inactiveDays: 1,
    nextAction,
    ...overrides,
  };
}

function digest(deals: readonly AutomationDealDigestRow[]): AutomationDealDigest {
  const count = (action: DealDigestAction): number => (
    deals.filter((deal) => deal.nextAction === action).length
  );
  return {
    generatedAt: '2026-08-25T08:00:00.000Z',
    staleAfterDays: 10,
    summary: {
      total: deals.length,
      syncErrors: count('sync_error'),
      missingSheets: count('missing_sheet'),
      missingTargets: count('missing_targets'),
      emptySheets: count('empty_sheet'),
      completed: count('completed'),
      excludedOldCompleted: 2,
      prepareInvoice: count('prepare_invoice'),
      stale: count('stale'),
      inProgress: count('on_track'),
    },
    deals,
  };
}

describe('formato Discord del KPI diario', () => {
  const value = digest([
    row(1, 'sync_error', { syncError: 'Google Sheets devolvió 403: sin permiso.' }),
    row(2, 'missing_sheet', { trackingSheetUrl: null, currentCount: 0, progressPct: 0 }),
    row(3, 'missing_targets', { targetCount: 0, currentCount: 0, progressPct: 0 }),
    row(4, 'empty_sheet', { currentCount: 0, progressPct: 0 }),
    row(5, 'completed', { currentCount: 10, progressPct: 100 }),
    row(6, 'prepare_invoice', { currentCount: 8, progressPct: 80 }),
    row(7, 'stale', { inactiveDays: 14 }),
    row(8, 'on_track'),
  ]);

  it('lista todos los tratos con avance y explica los errores', () => {
    const messages = formatAutomationDealDigestForDiscord(value);
    const text = messages.join('\n');

    expect(text).toContain('Creador 1');
    expect(text).toContain('Google Sheets devolvió 403: sin permiso.');
    expect(text).toContain('Creador 5');
    expect(text).toContain('Creador 6');
    expect(text).toContain('Creador 7');
    expect(text).toContain('Creador 8');
    expect(text).toContain('COMPLETADOS');
    expect(text).toContain('LISTOS PARA FACTURAR');
    expect(text).toContain('PARADOS');
    expect(text).toContain('EN PROGRESO');
  });

  it('distingue un borrador creado de uno todavía pendiente', () => {
    const text = formatAutomationDealDigestForDiscord(digest([
      row(1, 'prepare_invoice', { progressPct: 80, invoiceId: 12, invoiceNumber: 'ES-2026-0012', invoiceStatus: 'borrador' }),
      row(2, 'prepare_invoice', { progressPct: 80 }),
    ])).join('\n');

    expect(text).toContain('borrador ES-2026-0012 creado');
    expect(text).toContain('borrador pendiente');
  });

  it('resume las hojas vacías o incompletas sin listar cada trato', () => {
    const text = formatAutomationDealDigestForDiscord(value).join('\n');

    expect(text).toContain('1 sin hoja enlazada');
    expect(text).toContain('1 hojas en blanco');
    expect(text).toContain('1 sin objetivos');
    expect(text).not.toContain('Creador 2');
    expect(text).not.toContain('Creador 3');
    expect(text).not.toContain('Creador 4');
  });

  it('respeta el límite seguro de Discord sin recortar tratos', () => {
    const many = digest(Array.from({ length: 120 }, (_, index) => row(
      index + 1,
      'on_track',
      { name: `Trato muy detallado número ${index + 1}` },
    )));
    const messages = formatAutomationDealDigestForDiscord(many);

    expect(messages.every((message) => message.length <= 1_900)).toBe(true);
    for (let index = 1; index <= 120; index += 1) {
      expect(messages.join('\n')).toContain(`Creador ${index}`);
    }
  });

  it('responde con el detalle del trato buscado y neutraliza menciones', () => {
    const messages = formatAutomationDealDetailForDiscord(value, 'marca 7');
    expect(messages.join('\n')).toContain('Creador 7');
    expect(messages.join('\n')).toContain('14 días desde el último avance');
    expect(formatAutomationDealDetailForDiscord(value, '@everyone').join('\n'))
      .toContain('@\u200beveryone');
  });
});
