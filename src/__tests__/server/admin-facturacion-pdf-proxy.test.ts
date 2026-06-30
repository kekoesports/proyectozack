/**
 * Tests para el proxy admin de PDFs de facturas.
 * Ruta: /api/admin/facturacion/[id]/pdf
 *
 * Verifica:
 *  - Acceso denegado sin permiso `facturacion:read` → propaga error del guard
 *  - ID inválido (no numérico, 0, negativo, flotante) → 404
 *  - Invoice inexistente → 404
 *  - Invoice sin invoiceFile NI fileUrl legacy → 404
 *  - Sin BLOB_READ_WRITE_TOKEN → 503
 *  - Invoice con `invoiceFileId` (canonical path) → 200 PDF inline
 *  - Invoice con solo `fileUrl` legacy → 200 PDF inline (fallback)
 *  - BLOB_READ_WRITE_TOKEN nunca se expone en cabeceras de respuesta
 *  - URL del Blob privado nunca aparece en el body de error
 *
 * Patrón copiado de admin-contracts-pdf-proxy.test.ts (proxy contratos).
 */

// ── Mocks ──────────────────────────────────────────────────────────────

jest.mock('@/lib/auth', () => ({ auth: {} }));

const mockRequirePermission = jest.fn();
jest.mock('@/lib/permissions', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
  PERMISSIONS: {},
}));

// El handler hace db.select().from(invoices).leftJoin(files).where().limit(1).
// Mock the entire chain to return the rows we control per test.
let mockDbRows: Array<Record<string, unknown>> = [];
const mockDb = {
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      leftJoin: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => mockDbRows),
        })),
      })),
    })),
  })),
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('@/db/schema/invoices', () => ({
  invoices: { id: 'id', invoiceFileId: 'invoiceFileId', fileUrl: 'fileUrl', number: 'number' },
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

import { NextRequest } from 'next/server';
import { GET as adminPdfGET } from '@/app/api/admin/facturacion/[id]/pdf/route';

// ── Helpers ────────────────────────────────────────────────────────────

const makeReq = (id = '1') =>
  new NextRequest(`http://localhost:3000/api/admin/facturacion/${id}/pdf`);

const makeParams = (id = '1') =>
  ({ params: Promise.resolve({ id }) });

const BLOB_SECRET = 'test-blob-token-fact-xyz';
const PRIVATE_BLOB_URL = 'https://private-store.vercel-storage.com/invoices/secret-123.pdf';

const mockBlobOk = () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    headers: { get: (k: string) => (k === 'content-type' ? 'application/pdf' : null) },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
  });
};

// ── Setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockRequirePermission.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
  global.fetch = jest.fn();
  process.env.BLOB_READ_WRITE_TOKEN = BLOB_SECRET;
  mockDbRows = [];
});

afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

// ── Tests ──────────────────────────────────────────────────────────────

describe('Admin PDF proxy — /api/admin/facturacion/[id]/pdf', () => {
  describe('[1] autenticación y permisos', () => {
    it('sin permiso → el handler propaga el error del guard', async () => {
      mockRequirePermission.mockRejectedValue(new Error('forbidden:facturacion:read'));
      await expect(adminPdfGET(makeReq(), makeParams())).rejects.toThrow('forbidden');
    });

    it('requirePermission se llama con módulo "facturacion" y acción "read"', async () => {
      mockDbRows = [];
      await adminPdfGET(makeReq('99'), makeParams('99'));
      expect(mockRequirePermission).toHaveBeenCalledWith('facturacion', 'read');
    });
  });

  describe('[2] validación del ID', () => {
    it('ID no numérico → 404', async () => {
      const res = await adminPdfGET(makeReq('abc'), makeParams('abc'));
      expect(res.status).toBe(404);
    });

    it('ID cero → 404', async () => {
      const res = await adminPdfGET(makeReq('0'), makeParams('0'));
      expect(res.status).toBe(404);
    });

    it('ID negativo → 404', async () => {
      const res = await adminPdfGET(makeReq('-5'), makeParams('-5'));
      expect(res.status).toBe(404);
    });

    it('ID flotante → 404', async () => {
      const res = await adminPdfGET(makeReq('1.5'), makeParams('1.5'));
      expect(res.status).toBe(404);
    });
  });

  describe('[3] factura inexistente o sin PDF', () => {
    it('factura inexistente → 404', async () => {
      mockDbRows = [];
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.status).toBe(404);
    });

    it('factura sin invoiceFile NI fileUrl legacy → 404', async () => {
      mockDbRows = [{ invoiceFileUrl: null, invoiceFileName: null, legacyFileUrl: null, invoiceNumber: 'SP-2026-001' }];
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toMatch(/PDF no disponible/i);
    });
  });

  describe('[4] BLOB_READ_WRITE_TOKEN', () => {
    it('sin token configurado → 503', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      mockDbRows = [{ invoiceFileUrl: PRIVATE_BLOB_URL, invoiceFileName: 'inv.pdf', legacyFileUrl: null, invoiceNumber: '1' }];
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.status).toBe(503);
    });
  });

  describe('[5] resolución del PDF', () => {
    it('canonical path: prefiere files.url (invoiceFileId) sobre legacy fileUrl', async () => {
      mockDbRows = [{
        invoiceFileUrl:  PRIVATE_BLOB_URL,
        invoiceFileName: 'SP-2026-007.pdf',
        legacyFileUrl:   'https://legacy.vercel-storage.com/old.pdf',
        invoiceNumber:   'SP-2026-007',
      }];
      mockBlobOk();

      const res = await adminPdfGET(makeReq(), makeParams());

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0]?.[0];
      expect(fetchUrl).toBe(PRIVATE_BLOB_URL); // canonical, no legacy
    });

    it('legacy fallback: usa invoices.fileUrl si invoiceFile.url es null', async () => {
      const LEGACY_URL = 'https://legacy.vercel-storage.com/old-invoice-42.pdf';
      mockDbRows = [{
        invoiceFileUrl:  null,
        invoiceFileName: null,
        legacyFileUrl:   LEGACY_URL,
        invoiceNumber:   'SP-2025-042',
      }];
      mockBlobOk();

      const res = await adminPdfGET(makeReq(), makeParams());

      expect(res.status).toBe(200);
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0]?.[0];
      expect(fetchUrl).toBe(LEGACY_URL);
    });

    it('Bearer token se incluye en el fetch al Blob', async () => {
      mockDbRows = [{ invoiceFileUrl: PRIVATE_BLOB_URL, invoiceFileName: 'x.pdf', legacyFileUrl: null, invoiceNumber: '1' }];
      mockBlobOk();

      await adminPdfGET(makeReq(), makeParams());

      const fetchOpts = (global.fetch as jest.Mock).mock.calls[0]?.[1];
      expect(fetchOpts.headers.Authorization).toBe(`Bearer ${BLOB_SECRET}`);
    });
  });

  describe('[6] respuesta — headers de seguridad y PII', () => {
    beforeEach(() => {
      mockDbRows = [{ invoiceFileUrl: PRIVATE_BLOB_URL, invoiceFileName: 'SP-2026-1.pdf', legacyFileUrl: null, invoiceNumber: 'SP-2026-1' }];
      mockBlobOk();
    });

    it('Cache-Control: private, no-store', async () => {
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    });

    it('Content-Disposition inline con filename sanitizado', async () => {
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.headers.get('content-disposition')).toMatch(/inline; filename="[\w.\-]+"/);
    });

    it('X-Content-Type-Options: nosniff', async () => {
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    });

    it('BLOB_READ_WRITE_TOKEN nunca aparece en cabeceras de respuesta', async () => {
      const res = await adminPdfGET(makeReq(), makeParams());
      for (const [, value] of res.headers.entries()) {
        expect(value).not.toContain(BLOB_SECRET);
      }
    });

    it('URL privada del Blob nunca aparece en respuestas (200 ni 404)', async () => {
      // 200 path
      const res200 = await adminPdfGET(makeReq(), makeParams());
      const headers200 = Object.fromEntries(res200.headers.entries());
      expect(JSON.stringify(headers200)).not.toContain('vercel-storage.com');

      // 404 path
      mockDbRows = [{ invoiceFileUrl: null, invoiceFileName: null, legacyFileUrl: null, invoiceNumber: '1' }];
      const res404 = await adminPdfGET(makeReq(), makeParams());
      const text404 = await res404.text();
      expect(text404).not.toContain('vercel-storage.com');
      expect(text404).not.toContain(PRIVATE_BLOB_URL);
    });
  });

  describe('[7] resilencia ante fallos del Blob', () => {
    it('si el fetch al Blob devuelve no-ok → 404 controlado', async () => {
      mockDbRows = [{ invoiceFileUrl: PRIVATE_BLOB_URL, invoiceFileName: 'x.pdf', legacyFileUrl: null, invoiceNumber: '1' }];
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.status).toBe(404);
    });
  });
});
