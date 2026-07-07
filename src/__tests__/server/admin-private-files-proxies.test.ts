/**
 * Tests funcionales de los 3 proxies admin nuevos:
 *   - /api/admin/files/[id]
 *   - /api/admin/campanas/[id]/contract/pdf
 *   - /api/admin/facturacion/import/[id]/pdf
 *
 * Verifica para cada uno:
 *  - id inválido → 404 (sin tocar DB)
 *  - fila inexistente / sin fileUrl → 404
 *  - BLOB_READ_WRITE_TOKEN ausente → 503
 *  - fetch al blob falla → 404
 *  - camino feliz → 200 con Content-Type, Content-Disposition, Cache-Control y X-Content-Type-Options correctos
 *  - Bearer token nunca se filtra en headers de respuesta
 *  - URL del blob privado nunca aparece en body de error
 *
 * Para el proxy de /files/[id] verifica además el mapping relatedType → módulo:
 *  - talent → talentos:read
 *  - campaign → campanas:read
 *  - brand → campanas:read
 *  - invoice → facturacion:read
 *  - followup → tareas:read
 *  - task → tareas:read
 *  - otro / desconocido → 404 fail-closed (sin llamar a requirePermission)
 */

// ── Mocks compartidos ─────────────────────────────────────────────────

jest.mock('@/lib/auth', () => ({ auth: {} }));

const mockRequirePermission = jest.fn();
jest.mock('@/lib/permissions', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
  PERMISSIONS: {},
}));

// Mock cadena Drizzle sin importar tablas reales.
let mockFilesRow: Record<string, unknown> | null = null;
const mockDb = {
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => (mockFilesRow ? [mockFilesRow] : [])),
      })),
    })),
  })),
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('@/db/schema/files', () => ({
  files: {
    id: 'id',
    url: 'url',
    name: 'name',
    mime: 'mime',
    relatedType: 'relatedType',
  },
}));

const mockGetContractByCampaign = jest.fn();
jest.mock('@/lib/queries/contracts', () => ({
  getContractByCampaign: (...args: unknown[]) => mockGetContractByCampaign(...args),
}));

const mockGetImport = jest.fn();
jest.mock('@/lib/queries/invoiceImports', () => ({
  getImport: (...args: unknown[]) => mockGetImport(...args),
}));

jest.mock('@/lib/env', () => ({
  env: {
    get BLOB_READ_WRITE_TOKEN() {
      return process.env.BLOB_READ_WRITE_TOKEN ?? '';
    },
  },
}));

import { NextRequest } from 'next/server';
import { GET as filesGET } from '@/app/api/admin/files/[id]/route';
import { GET as contractGET } from '@/app/api/admin/campanas/[id]/contract/pdf/route';
import { GET as importGET } from '@/app/api/admin/facturacion/import/[id]/pdf/route';

const BLOB_SECRET = 'test-blob-token-priv-xyz';
const PRIVATE_BLOB_URL = 'https://private-store.vercel-storage.com/some/secret-path.pdf';

const makeReq = (url: string) => new NextRequest(url);
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const mockBlobOk = (contentType = 'application/pdf') => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k === 'content-type' ? contentType : null) },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
  });
};

const mockBlobFail = () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 401,
    headers: { get: () => null },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFilesRow = null;
  global.fetch = jest.fn();
  process.env.BLOB_READ_WRITE_TOKEN = BLOB_SECRET;
  mockRequirePermission.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
});

afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

// ═════════════════════════════════════════════════════════════════════
//  /api/admin/files/[id]
// ═════════════════════════════════════════════════════════════════════

describe('/api/admin/files/[id]', () => {
  const call = (id = '1') =>
    filesGET(makeReq(`http://localhost/api/admin/files/${id}`), makeParams(id));

  it('id no numérico → 404 sin tocar DB ni permisos', async () => {
    const res = await call('abc');
    expect(res.status).toBe(404);
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockRequirePermission).not.toHaveBeenCalled();
  });

  it('id 0 o negativo → 404', async () => {
    expect((await call('0')).status).toBe(404);
    expect((await call('-3')).status).toBe(404);
  });

  it('fila inexistente → 404 sin llamar a requirePermission', async () => {
    mockFilesRow = null;
    const res = await call('42');
    expect(res.status).toBe(404);
    expect(mockRequirePermission).not.toHaveBeenCalled();
  });

  it('relatedType desconocido → 404 fail-closed (no requirePermission)', async () => {
    mockFilesRow = {
      url: PRIVATE_BLOB_URL,
      name: 'x.pdf',
      mime: 'application/pdf',
      relatedType: 'ufo',
    };
    const res = await call('7');
    expect(res.status).toBe(404);
    expect(mockRequirePermission).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  describe('mapping relatedType → módulo', () => {
    const CASES: Array<[string, string]> = [
      ['talent',   'talentos'],
      ['campaign', 'campanas'],
      ['brand',    'campanas'],
      ['invoice',  'facturacion'],
      ['followup', 'tareas'],
      ['task',     'tareas'],
    ];

    it.each(CASES)('relatedType=%s → requirePermission(%s, read)', async (relatedType, module) => {
      mockFilesRow = {
        url: PRIVATE_BLOB_URL,
        name: 'doc.pdf',
        mime: 'application/pdf',
        relatedType,
      };
      mockBlobOk();
      const res = await call('9');
      expect(res.status).toBe(200);
      expect(mockRequirePermission).toHaveBeenCalledWith(module, 'read');
    });
  });

  it('permiso denegado → error propagado, no llega a fetch', async () => {
    mockFilesRow = {
      url: PRIVATE_BLOB_URL,
      name: 'x.pdf',
      mime: 'application/pdf',
      relatedType: 'talent',
    };
    mockRequirePermission.mockRejectedValue(new Error('forbidden:talentos:read'));
    await expect(call('1')).rejects.toThrow(/forbidden/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sin BLOB_READ_WRITE_TOKEN → 503', async () => {
    mockFilesRow = { url: PRIVATE_BLOB_URL, name: 'x.pdf', mime: 'application/pdf', relatedType: 'talent' };
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = await call('1');
    expect(res.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetch al blob falla (401 upstream) → 404 hacia el cliente', async () => {
    mockFilesRow = { url: PRIVATE_BLOB_URL, name: 'x.pdf', mime: 'application/pdf', relatedType: 'talent' };
    mockBlobFail();
    const res = await call('1');
    expect(res.status).toBe(404);
    // El body de error nunca contiene la URL privada del blob
    const body = await res.text();
    expect(body).not.toContain(PRIVATE_BLOB_URL);
  });

  it('camino feliz → 200 con headers de seguridad y Bearer no filtrado', async () => {
    mockFilesRow = { url: PRIVATE_BLOB_URL, name: 'GEO-Stats octubre.pdf', mime: 'application/pdf', relatedType: 'talent' };
    mockBlobOk();
    const res = await call('1');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-disposition')).toMatch(/inline; filename="GEO-Stats_octubre.pdf"/);

    // Bearer nunca sale al cliente
    for (const [name, value] of res.headers.entries()) {
      expect(`${name}: ${value}`).not.toContain(BLOB_SECRET);
    }

    // fetch al blob se hace con Bearer server-side
    const call0 = (global.fetch as jest.Mock).mock.calls[0];
    expect(call0[0]).toBe(PRIVATE_BLOB_URL);
    expect(call0[1].headers.Authorization).toBe(`Bearer ${BLOB_SECRET}`);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  /api/admin/campanas/[id]/contract/pdf
// ═════════════════════════════════════════════════════════════════════

describe('/api/admin/campanas/[id]/contract/pdf', () => {
  const call = (id = '10') =>
    contractGET(makeReq(`http://localhost/api/admin/campanas/${id}/contract/pdf`), makeParams(id));

  it('requiere campanas:read (permiso denegado → propaga error)', async () => {
    mockRequirePermission.mockRejectedValue(new Error('forbidden:campanas:read'));
    await expect(call('10')).rejects.toThrow(/forbidden:campanas/);
    expect(mockGetContractByCampaign).not.toHaveBeenCalled();
  });

  it('id inválido → 404', async () => {
    const res = await call('nope');
    expect(res.status).toBe(404);
    expect(mockGetContractByCampaign).not.toHaveBeenCalled();
  });

  it('sin contrato → 404', async () => {
    mockGetContractByCampaign.mockResolvedValue(null);
    const res = await call('10');
    expect(res.status).toBe(404);
  });

  it('contrato sin fileUrl → 404', async () => {
    mockGetContractByCampaign.mockResolvedValue({ id: 5, fileUrl: null, fileName: null });
    const res = await call('10');
    expect(res.status).toBe(404);
  });

  it('camino feliz → 200 con Content-Disposition y headers de seguridad', async () => {
    mockGetContractByCampaign.mockResolvedValue({
      id: 5,
      fileUrl: PRIVATE_BLOB_URL,
      fileName: 'Contrato Marca X.pdf',
    });
    mockBlobOk();

    const res = await call('10');

    expect(mockRequirePermission).toHaveBeenCalledWith('campanas', 'read');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-disposition')).toMatch(/Contrato_Marca_X\.pdf/);
    // Bearer no filtrado
    for (const [name, value] of res.headers.entries()) {
      expect(`${name}: ${value}`).not.toContain(BLOB_SECRET);
    }
  });

  it('camino feliz sin fileName → usa "contrato.pdf" como fallback', async () => {
    mockGetContractByCampaign.mockResolvedValue({
      id: 5,
      fileUrl: PRIVATE_BLOB_URL,
      fileName: null,
    });
    mockBlobOk();

    const res = await call('10');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(/contrato\.pdf/);
  });

  it('sin BLOB_READ_WRITE_TOKEN → 503', async () => {
    mockGetContractByCampaign.mockResolvedValue({ id: 5, fileUrl: PRIVATE_BLOB_URL, fileName: 'c.pdf' });
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = await call('10');
    expect(res.status).toBe(503);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  /api/admin/facturacion/import/[id]/pdf
// ═════════════════════════════════════════════════════════════════════

describe('/api/admin/facturacion/import/[id]/pdf', () => {
  const call = (id = '3') =>
    importGET(makeReq(`http://localhost/api/admin/facturacion/import/${id}/pdf`), makeParams(id));

  it('requiere facturacion:read (permiso denegado → propaga error)', async () => {
    mockRequirePermission.mockRejectedValue(new Error('forbidden:facturacion:read'));
    await expect(call('3')).rejects.toThrow(/forbidden:facturacion/);
    expect(mockGetImport).not.toHaveBeenCalled();
  });

  it('id inválido → 404', async () => {
    const res = await call('xyz');
    expect(res.status).toBe(404);
    expect(mockGetImport).not.toHaveBeenCalled();
  });

  it('import inexistente → 404', async () => {
    mockGetImport.mockResolvedValue(null);
    const res = await call('3');
    expect(res.status).toBe(404);
  });

  it('import sin fileUrl → 404', async () => {
    mockGetImport.mockResolvedValue({ id: 3, fileUrl: null, sourceFilename: 'factura.pdf' });
    const res = await call('3');
    expect(res.status).toBe(404);
  });

  it('camino feliz → 200 con headers y filename saneado', async () => {
    mockGetImport.mockResolvedValue({
      id: 3,
      fileUrl: PRIVATE_BLOB_URL,
      sourceFilename: 'Factura Enero 2026 (v2).pdf',
    });
    mockBlobOk();

    const res = await call('3');
    expect(mockRequirePermission).toHaveBeenCalledWith('facturacion', 'read');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    // El (v2) contiene paréntesis → deben quedar saneados
    expect(res.headers.get('content-disposition')).toMatch(/Factura_Enero_2026__v2_\.pdf/);
    // Bearer no filtrado
    for (const [name, value] of res.headers.entries()) {
      expect(`${name}: ${value}`).not.toContain(BLOB_SECRET);
    }
  });

  it('sin BLOB_READ_WRITE_TOKEN → 503', async () => {
    mockGetImport.mockResolvedValue({ id: 3, fileUrl: PRIVATE_BLOB_URL, sourceFilename: 'x.pdf' });
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = await call('3');
    expect(res.status).toBe(503);
  });
});
