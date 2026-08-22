/**
 * Generación de la hoja de seguimiento al crear un trato.
 *
 * Lo que se protege aquí es sobre todo lo que NO debe pasar: que un fallo de
 * Drive tumbe la creación del trato, o que un reintento deje hojas huérfanas.
 */

jest.mock('server-only', () => ({}));

const mockSelect = jest.fn();
jest.mock('@/lib/db', () => ({ db: { select: (...a: unknown[]) => mockSelect(...a) } }));

const mockCreateDealTrackingSheet = jest.fn();
jest.mock('@/lib/drive/deal-tracking-sheet', () => ({
  createDealTrackingSheet: (...a: unknown[]) => mockCreateDealTrackingSheet(...a),
}));

const mockAttach = jest.fn();
jest.mock('@/lib/queries/automationDeals', () => ({
  attachAutomatedDealSheet: (...a: unknown[]) => mockAttach(...a),
}));

jest.mock('@/db/schema/campaigns', () => ({ campaigns: {} }));
jest.mock('@/db/schema/crmBrands', () => ({ crmBrands: {} }));
jest.mock('@/db/schema/talentBusiness', () => ({ talentBusiness: {} }));
jest.mock('@/db/schema/talents', () => ({ talents: {} }));

import { ensureDealTrackingSheet } from '@/lib/queries/ensureDealTrackingSheet';
import { buildDealSheetName } from '@/lib/drive/deal-sheet-name';

/** Simula la cadena select().from().innerJoin().innerJoin().leftJoin().where().limit(). */
function dbDevuelve(row: Record<string, unknown> | null): void {
  const limit = jest.fn().mockResolvedValue(row ? [row] : []);
  const where = jest.fn(() => ({ limit }));
  const leftJoin = jest.fn(() => ({ where }));
  const innerJoin2 = jest.fn(() => ({ leftJoin }));
  const innerJoin1 = jest.fn(() => ({ innerJoin: innerJoin2 }));
  const from = jest.fn(() => ({ innerJoin: innerJoin1 }));
  mockSelect.mockReturnValue({ from });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAttach.mockResolvedValue({});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('buildDealSheetName', () => {
  it('usa la forma canónica MARCA - CREADOR', () => {
    expect(buildDealSheetName('KeyDrop', 'HUASOPEEK')).toBe('KeyDrop - HUASOPEEK');
  });

  it('normaliza espacios sobrantes', () => {
    expect(buildDealSheetName('  Empire  Drop ', ' TODO CS2  ')).toBe('Empire Drop - TODO CS2');
  });
});

describe('ensureDealTrackingSheet', () => {
  it('crea la hoja y la vincula al trato', async () => {
    dbDevuelve({
      trackingSheetUrl: null,
      brandName: 'KeyDrop',
      talentName: 'NAOW',
      googleDriveFolderId: 'folder-naow-123',
      contactEmail: 'naow@example.com',
    });
    mockCreateDealTrackingSheet.mockResolvedValue({
      ok: true, spreadsheetId: 'abc', url: 'https://docs.google.com/spreadsheets/d/abc/edit', name: 'KeyDrop - NAOW',
      destination: 'creator', shareStatus: 'shared', warnings: [],
    });

    const out = await ensureDealTrackingSheet(10);

    expect(out).toEqual({
      status: 'created',
      url: 'https://docs.google.com/spreadsheets/d/abc/edit',
      name: 'KeyDrop - NAOW',
      destination: 'creator',
      shareStatus: 'shared',
      warnings: [],
    });
    expect(mockCreateDealTrackingSheet).toHaveBeenCalledWith('KeyDrop', 'NAOW', {
      folderId: 'folder-naow-123',
      shareWithEmail: 'naow@example.com',
    });
    expect(mockAttach).toHaveBeenCalledWith(10, 'https://docs.google.com/spreadsheets/d/abc/edit');
  });

  it('no crea una segunda hoja si el trato ya tiene una', async () => {
    dbDevuelve({
      trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/ya/edit',
      brandName: 'KeyDrop', talentName: 'NAOW',
    });

    const out = await ensureDealTrackingSheet(10);

    expect(out).toEqual({ status: 'already_had_sheet' });
    // Lo importante: no se toca Drive. Sin esta guarda, reintentar dejaría
    // hojas huérfanas que nadie asocia a ningún trato.
    expect(mockCreateDealTrackingSheet).not.toHaveBeenCalled();
    expect(mockAttach).not.toHaveBeenCalled();
  });

  it('sin configuración no hace nada y no lo trata como error', async () => {
    dbDevuelve({ trackingSheetUrl: null, brandName: 'A', talentName: 'B' });
    mockCreateDealTrackingSheet.mockResolvedValue({
      ok: false, reason: 'missing-config', detail: 'faltan: GOOGLE_DRIVE_DEAL_TEMPLATE_ID',
    });

    const out = await ensureDealTrackingSheet(10);

    expect(out.status).toBe('skipped');
    expect(mockAttach).not.toHaveBeenCalled();
  });

  it('si Drive niega el acceso, informa pero NO lanza', async () => {
    dbDevuelve({ trackingSheetUrl: null, brandName: 'A', talentName: 'B' });
    mockCreateDealTrackingSheet.mockResolvedValue({
      ok: false, reason: 'no-access', detail: '404: la cuenta de servicio no puede leer la plantilla',
    });

    const out = await ensureDealTrackingSheet(10);

    expect(out.status).toBe('failed');
    expect(mockAttach).not.toHaveBeenCalled();
  });

  it('un error inesperado tampoco escapa', async () => {
    dbDevuelve({ trackingSheetUrl: null, brandName: 'A', talentName: 'B' });
    mockCreateDealTrackingSheet.mockRejectedValue(new Error('boom'));

    // Si esto lanzara, tumbaría la creación del trato: el dato importante ya
    // está guardado y no puede perderse por un fallo de Drive.
    await expect(ensureDealTrackingSheet(10)).resolves.toEqual({ status: 'failed', reason: 'boom' });
  });

  it('si el trato no existe, no toca Drive', async () => {
    dbDevuelve(null);

    const out = await ensureDealTrackingSheet(999);

    expect(out.status).toBe('skipped');
    expect(mockCreateDealTrackingSheet).not.toHaveBeenCalled();
  });
});
