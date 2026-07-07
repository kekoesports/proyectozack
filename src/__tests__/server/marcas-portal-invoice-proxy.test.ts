/**
 * Tests del proxy portal marca para PDFs de facturas.
 * Ruta: /api/marcas/facturas/[id]/pdf
 *
 * Boundary auth DIFERENTE del admin:
 *   - Usa `requireRole('brand', '/marcas/login')` (Better Auth, rol de portal).
 *   - Verifica ownership por `crmBrands.portalUserId === session.user.id`.
 *   - Cualquier mismatch de propietario → 404 fail-closed.
 *
 * Verifica:
 *   - id inválido → 404 sin tocar DB.
 *   - Sesión sin rol brand → propaga error del guard.
 *   - Factura de otra marca (portalUserId distinto) → 404.
 *   - Factura kind='expense' → 404 (no visible en portal).
 *   - Factura anulada → 404.
 *   - Sin fileUrl → 404.
 *   - Sin BLOB_READ_WRITE_TOKEN → 503.
 *   - Camino feliz → 200 con Content-Type, Content-Disposition, Cache-Control,
 *     X-Content-Type-Options correctos.
 *   - Bearer token nunca en headers de respuesta.
 *   - URL privada del Blob nunca en body de error.
 *   - Página del portal usa el proxy, no el fileUrl directo.
 */

// ── Mocks ──────────────────────────────────────────────────────────────

jest.mock('@/lib/auth', () => ({ auth: {} }));

const mockRequireRole = jest.fn();
jest.mock('@/lib/auth-guard', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

// Mock cadena Drizzle: select().from().innerJoin().leftJoin().where().limit()
let mockRow: Record<string, unknown> | null = null;
const mockDb = {
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      innerJoin: jest.fn(() => ({
        leftJoin: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => (mockRow ? [mockRow] : [])),
          })),
        })),
      })),
    })),
  })),
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('@/db/schema/invoices', () => ({
  invoices: {
    id: 'id', brandId: 'brandId', fileUrl: 'fileUrl',
    invoiceFileId: 'invoiceFileId', number: 'number',
    kind: 'kind', status: 'status',
  },
}));
jest.mock('@/db/schema/crmBrands', () => ({
  crmBrands: { id: 'id', portalUserId: 'portalUserId' },
}));
jest.mock('@/db/schema/files', () => ({
  files: { id: 'id', url: 'url', name: 'name' },
}));

jest.mock('@/lib/env', () => ({
  env: {
    get BLOB_READ_WRITE_TOKEN() {
      return process.env.BLOB_READ_WRITE_TOKEN ?? '';
    },
  },
}));

// ── Imports tras mocks ─────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';
import { GET as brandInvoiceGET } from '@/app/api/marcas/facturas/[id]/pdf/route';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');

const BLOB_SECRET = 'test-blob-token-marca-xyz';
const PRIVATE_BLOB_URL = 'https://private-store.vercel-storage.com/invoices/marca-secret.pdf';
const BRAND_USER_ID = 'user-brand-1';
const OTHER_USER_ID = 'user-brand-2';

const makeReq = (id: string) =>
  new NextRequest(`http://localhost:3000/api/marcas/facturas/${id}/pdf`);
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const validRow = {
  invoiceFileUrl:  PRIVATE_BLOB_URL,
  invoiceFileName: 'Factura F-2026-0012.pdf',
  legacyFileUrl:   null,
  invoiceNumber:   'F-2026-0012',
  kind:            'income',
  status:          'emitida',
  portalUserId:    BRAND_USER_ID,
};

const mockBlobOk = () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k === 'content-type' ? 'application/pdf' : null) },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRow = null;
  global.fetch = jest.fn();
  process.env.BLOB_READ_WRITE_TOKEN = BLOB_SECRET;
  mockRequireRole.mockResolvedValue({
    user: { id: BRAND_USER_ID, email: 'brand@example.com', name: 'Brand', role: 'brand' },
  });
});

afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

// ═════════════════════════════════════════════════════════════════════

describe('/api/marcas/facturas/[id]/pdf — boundary de sesión brand', () => {
  it('llama a requireRole con el rol "brand" y ruta de login del portal', async () => {
    mockRow = validRow;
    mockBlobOk();
    await brandInvoiceGET(makeReq('12'), makeParams('12'));
    expect(mockRequireRole).toHaveBeenCalledWith('brand', '/marcas/login');
  });

  it('sesión no autorizada → propaga error del guard (no llega a DB)', async () => {
    mockRequireRole.mockRejectedValue(new Error('NEXT_REDIRECT: /marcas/login'));
    await expect(brandInvoiceGET(makeReq('12'), makeParams('12'))).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});

describe('/api/marcas/facturas/[id]/pdf — validación y fail-closed', () => {
  it('id no numérico → 404 sin tocar DB', async () => {
    const res = await brandInvoiceGET(makeReq('abc'), makeParams('abc'));
    expect(res.status).toBe(404);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('id 0 o negativo → 404', async () => {
    expect((await brandInvoiceGET(makeReq('0'),  makeParams('0'))).status).toBe(404);
    expect((await brandInvoiceGET(makeReq('-5'), makeParams('-5'))).status).toBe(404);
  });

  it('factura inexistente → 404', async () => {
    mockRow = null;
    const res = await brandInvoiceGET(makeReq('99'), makeParams('99'));
    expect(res.status).toBe(404);
  });

  it('factura de OTRA marca (portalUserId distinto) → 404 fail-closed', async () => {
    mockRow = { ...validRow, portalUserId: OTHER_USER_ID };
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));
    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
    // El body de error no debe filtrar la URL privada
    const body = await res.text();
    expect(body).not.toContain(PRIVATE_BLOB_URL);
  });

  it('factura kind="expense" (no visible en portal) → 404', async () => {
    mockRow = { ...validRow, kind: 'expense' };
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));
    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('factura anulada → 404', async () => {
    mockRow = { ...validRow, status: 'anulada' };
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));
    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sin fileUrl ni legacy → 404 "PDF no disponible"', async () => {
    mockRow = { ...validRow, invoiceFileUrl: null, legacyFileUrl: null };
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));
    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sólo legacy fileUrl (invoiceFileId=null) → sirve el legacy', async () => {
    mockRow = {
      ...validRow,
      invoiceFileUrl: null,
      invoiceFileName: null,
      legacyFileUrl:   PRIVATE_BLOB_URL,
    };
    mockBlobOk();
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));
    expect(res.status).toBe(200);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(PRIVATE_BLOB_URL);
  });
});

describe('/api/marcas/facturas/[id]/pdf — headers de seguridad y camino feliz', () => {
  it('sin BLOB_READ_WRITE_TOKEN → 503', async () => {
    mockRow = validRow;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));
    expect(res.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetch al blob falla (401 upstream) → 404, sin filtrar URL privada', async () => {
    mockRow = validRow;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => null },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));
    expect(res.status).toBe(404);
    const body = await res.text();
    expect(body).not.toContain(PRIVATE_BLOB_URL);
  });

  it('camino feliz → 200 con Content-Type, Content-Disposition, Cache-Control y X-Content-Type-Options', async () => {
    mockRow = validRow;
    mockBlobOk();
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-disposition')).toMatch(/inline; filename="Factura_F-2026-0012\.pdf"/);
  });

  it('Bearer token nunca aparece en headers de respuesta', async () => {
    mockRow = validRow;
    mockBlobOk();
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));

    for (const [name, value] of res.headers.entries()) {
      expect(`${name}: ${value}`).not.toContain(BLOB_SECRET);
    }
  });

  it('fetch al blob se hace con Bearer server-side', async () => {
    mockRow = validRow;
    mockBlobOk();
    await brandInvoiceGET(makeReq('12'), makeParams('12'));
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(PRIVATE_BLOB_URL);
    expect(init.headers.Authorization).toBe(`Bearer ${BLOB_SECRET}`);
  });

  it('sin invoiceFileName ni número → filename fallback "factura.pdf"', async () => {
    mockRow = {
      ...validRow,
      invoiceFileName: null,
      invoiceNumber:   null,
    };
    mockBlobOk();
    const res = await brandInvoiceGET(makeReq('12'), makeParams('12'));
    expect(res.headers.get('content-disposition')).toMatch(/factura\.pdf/);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  Test estático — la página del portal usa el proxy
// ═════════════════════════════════════════════════════════════════════

describe('src/app/marcas/(portal)/facturas/page.tsx — usa el proxy', () => {
  it('enlaza al proxy /api/marcas/facturas/[id]/pdf', () => {
    const src = read('src/app/marcas/(portal)/facturas/page.tsx');
    expect(src).toMatch(/\/api\/marcas\/facturas\/\$\{inv\.id\}\/pdf/);
  });

  it('NO renderiza `<a href={inv.fileUrl}>` directo al Blob privado', () => {
    const src = read('src/app/marcas/(portal)/facturas/page.tsx');
    expect(src).not.toMatch(/href=\{inv\.fileUrl\}/);
  });
});
