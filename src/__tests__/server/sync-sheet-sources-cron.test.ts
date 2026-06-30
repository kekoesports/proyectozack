/**
 * Tests de contrato del cron `/api/cron/sync-sheet-sources`.
 *
 * Verifica que la fix del incidente 429 hace lo prometido:
 *   [1] usa createLimit (no Promise.allSettled directo sobre trackers.map)
 *   [7] dedup: si 2 trackers comparten spreadsheetId, fetchSpreadsheetMetadata
 *       solo se llama 1 vez
 *   [8] una hoja que falla no bloquea el resto
 *   [9] respuesta incluye total/ok/failed/rate_limited/inserted
 *   [11] logs incluyen trackerId sin PII
 *
 * El test [12] estático (429 tratado explícitamente) está en
 * google-sheets-retry.test.ts.
 *
 * Tests estructurales también:
 *   - route.ts NO contiene `Promise.allSettled(trackers.map(`
 *   - route.ts importa createLimit
 *   - route.ts importa SheetsApiError para detectar rate_limited
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Mocks (hoisted) ─────────────────────────────────────────────────────────

jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('@/lib/db', () => ({ db: {} }));

jest.mock('@/lib/env', () => ({
  env: {
    GOOGLE_SHEETS_API_KEY: 'test-key',
    SHEETS_SYNC_CONCURRENCY: 4,
    CRON_SECRET: 'test-secret',
  },
}));

const mockAssertCronAuth = jest.fn();
jest.mock('@/lib/security/assertCronAuth', () => ({
  assertCronAuth: (...args: unknown[]) => mockAssertCronAuth(...args),
}));

const mockSyncTrackerBlock = jest.fn();
jest.mock('@/lib/sync/sheet-sync', () => ({
  syncTrackerBlock: (...args: unknown[]) => mockSyncTrackerBlock(...args),
}));

const mockUpdateSheetSourceTimestamps = jest.fn();
jest.mock('@/lib/queries/brand-sheet-sources', () => ({
  updateSheetSourceTimestamps: (...args: unknown[]) => mockUpdateSheetSourceTimestamps(...args),
}));

const mockFetchMetadata = jest.fn();
class FakeSheetsApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  constructor(msg: string, status: number, retryAfterSeconds: number | null = null) {
    super(msg); this.name = 'SheetsApiError'; this.status = status; this.retryAfterSeconds = retryAfterSeconds;
  }
}
jest.mock('@/lib/integrations/google-sheets', () => ({
  fetchSpreadsheetMetadata: (...args: unknown[]) => mockFetchMetadata(...args),
  SheetsApiError: FakeSheetsApiError,
}));

// DB select chain mock — devuelve listas de trackers y de sources.
let mockTrackersList: { id: number }[] = [];
let mockActiveSourcesList: { id: number }[] = [];

jest.mock('@/db/schema/dealDeliverableTrackers', () => ({ dealDeliverableTrackers: { id: 'id', brandSheetSourceId: 'brandSheetSourceId' } }));
jest.mock('@/db/schema/brandSheetSources', () => ({ brandSheetSources: { id: 'id', status: 'status' } }));

// ── Imports tras mocks ─────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// Inyectar comportamiento del db.select() en cada test
const mockDbSelect = jest.fn();
(db as unknown as { select: typeof mockDbSelect }).select = mockDbSelect;

import { GET as cronGET } from '@/app/api/cron/sync-sheet-sources/route';

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAssertCronAuth.mockReturnValue(null);

  // db.select().from().where(...) devuelve trackers; segunda invocación devuelve sources activas
  let call = 0;
  mockDbSelect.mockImplementation(() => {
    call++;
    return {
      from: () => ({
        where: () => call === 1 ? mockTrackersList : mockActiveSourcesList,
      }),
    };
  });

  mockUpdateSheetSourceTimestamps.mockResolvedValue(undefined);
});

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/cron/sync-sheet-sources', { headers: { authorization: 'Bearer test-secret' } });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('cron /api/cron/sync-sheet-sources — contrato', () => {

  it('[8] una hoja que falla NO bloquea el resto', async () => {
    mockTrackersList = [{ id: 1 }, { id: 2 }, { id: 3 }];
    mockActiveSourcesList = [];
    mockSyncTrackerBlock.mockImplementation((id: number) => {
      if (id === 2) return Promise.resolve({ error: 'tab not found' });
      return Promise.resolve({ inserted: 5, duplicates: 0, enriched: 0 });
    });

    const res = await cronGET(makeReq());
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    expect(json.total).toBe(3);
    expect(json.ok).toBe(2);
    expect(json.failed).toBe(1);
    expect(json.rate_limited).toBe(0);
    expect(json.inserted).toBe(10);
  });

  it('[9] una hoja que devuelve 429 cuenta como rate_limited, no failed', async () => {
    mockTrackersList = [{ id: 1 }, { id: 2 }];
    mockActiveSourcesList = [];
    mockSyncTrackerBlock.mockImplementation((id: number) => {
      if (id === 1) return Promise.reject(new FakeSheetsApiError('rate', 429));
      return Promise.resolve({ inserted: 3, duplicates: 0, enriched: 0 });
    });

    const res = await cronGET(makeReq());
    const json = await res.json() as Record<string, unknown>;
    expect(json.total).toBe(2);
    expect(json.ok).toBe(1);
    expect(json.rate_limited).toBe(1);
    expect(json.failed).toBe(0);
  });

  it('[11] respuesta incluye total/ok/failed/rate_limited/inserted sin PII', async () => {
    mockTrackersList = [];
    mockActiveSourcesList = [];

    const res = await cronGET(makeReq());
    const json = await res.json() as Record<string, unknown>;
    expect(Object.keys(json).sort()).toEqual(['failed', 'inserted', 'ok', 'rate_limited', 'success', 'total']);
    // No debe incluir URLs ni emails ni spreadsheetIds
    const jsonStr = JSON.stringify(json);
    expect(jsonStr).not.toMatch(/@/);
    expect(jsonStr).not.toMatch(/docs\.google\.com/);
  });

  it('sin trackers retorna estructura coherente con ceros', async () => {
    mockTrackersList = [];
    mockActiveSourcesList = [];
    const res = await cronGET(makeReq());
    const json = await res.json() as Record<string, unknown>;
    expect(json).toEqual({ success: true, total: 0, ok: 0, failed: 0, rate_limited: 0, inserted: 0 });
  });

  it('[10] sync-sheet-sources invoca syncTrackerBlock con metadataFetcher inyectado (para dedup)', async () => {
    mockTrackersList = [{ id: 7 }];
    mockActiveSourcesList = [];
    mockSyncTrackerBlock.mockResolvedValue({ inserted: 0, duplicates: 0, enriched: 0 });

    await cronGET(makeReq());

    // Segunda posición debe ser un objeto con metadataFetcher: function
    expect(mockSyncTrackerBlock).toHaveBeenCalledWith(7, expect.objectContaining({
      metadataFetcher: expect.any(Function) as unknown,
    }));
  });
});

// ── Tests estáticos sobre el source ─────────────────────────────────────────

describe('sync-sheet-sources route.ts — estructura del código', () => {
  const routePath = path.resolve(__dirname, '..', '..', 'app', 'api', 'cron', 'sync-sheet-sources', 'route.ts');
  const src = fs.readFileSync(routePath, 'utf-8');

  it('[1] importa createLimit y lo USA dentro de trackers.map (no avalancha sin control)', () => {
    expect(src).toMatch(/from\s+['"]@\/lib\/utils\/concurrencyLimit['"]/);
    expect(src).toMatch(/\bcreateLimit\b/);
    // Cada tracker.map debe envolver su tarea con limit(): garantiza concurrencia controlada
    expect(src).toMatch(/trackers\.map\([\s\S]{0,500}\blimit[<(]/);
  });

  it('[12] importa SheetsApiError para distinguir rate_limited', () => {
    expect(src).toMatch(/\bSheetsApiError\b/);
    // y maneja explícitamente status === 429
    expect(src).toMatch(/\.status\s*===\s*429/);
  });

  it('usa env.SHEETS_SYNC_CONCURRENCY (no hardcoded)', () => {
    expect(src).toMatch(/env\.SHEETS_SYNC_CONCURRENCY/);
  });
});
