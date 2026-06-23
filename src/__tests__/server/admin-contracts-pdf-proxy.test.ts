/**
 * Tests para el proxy admin de PDFs de contratos generados.
 * Ruta: /api/admin/contratos/[id]/pdf
 *
 * Verifica:
 * - Acceso denegado sin permiso → error propagado (auth guard activo)
 * - ID inválido o no entero → 404
 * - Contrato inexistente → 404
 * - Contrato sin fileUrl → 404
 * - Sin BLOB_READ_WRITE_TOKEN → 503
 * - Contrato válido → 200 PDF inline con cabeceras correctas
 * - BLOB_READ_WRITE_TOKEN no se expone en cabeceras de respuesta
 * - Links admin ya no usan fileUrl directo
 */

// ── mocks ──────────────────────────────────────────────────────────────

jest.mock('@/lib/db',   () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

const mockRequirePermission = jest.fn();
jest.mock('@/lib/permissions', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
  PERMISSIONS: {},
}));

const mockGetGeneratedContract = jest.fn();
jest.mock('@/lib/queries/generatedContracts', () => ({
  getGeneratedContract: (...args: unknown[]) => mockGetGeneratedContract(...args),
  listGeneratedContracts: jest.fn(),
  CONTRACT_STATUSES: [],
}));

jest.mock('@/lib/env', () => ({
  env: {
    get BLOB_READ_WRITE_TOKEN() {
      return process.env.BLOB_READ_WRITE_TOKEN ?? '';
    },
  },
}));

// ── imports tras mocks ─────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';
import { GET as adminPdfGET } from '@/app/api/admin/contratos/[id]/pdf/route';

// ── helpers ────────────────────────────────────────────────────────────

const makeReq = (id = '1') =>
  new NextRequest(`http://localhost:3000/api/admin/contratos/${id}/pdf`);

const makeParams = (id = '1') =>
  ({ params: Promise.resolve({ id }) });

const BLOB_SECRET = 'test-blob-token-secret-abc123';

const mockBlobOk = () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    headers: { get: (k: string) => (k === 'content-type' ? 'application/pdf' : null) },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });
};

const validContract = (override: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Contrato Test',
  status: 'draft',
  fileName: 'contrato.pdf',
  fileUrl: 'https://blob.example.com/contracts/1/contrato.pdf',
  filePath: 'contracts/1/contrato.pdf',
  createdAt: new Date(),
  sentAt: null,
  signedAt: null,
  templateName: null,
  talentName: null,
  brandName: null,
  content: '',
  varsJson: null,
  notes: null,
  campaignId: null,
  ...override,
});

// ── setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockRequirePermission.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
  global.fetch = jest.fn();
  process.env.BLOB_READ_WRITE_TOKEN = BLOB_SECRET;
});

afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

// ── tests ──────────────────────────────────────────────────────────────

describe('Admin PDF proxy — /api/admin/contratos/[id]/pdf', () => {

  describe('autenticación y permisos', () => {
    it('sin permiso → el handler propaga el error del guard', async () => {
      mockRequirePermission.mockRejectedValue(new Error('forbidden:contratos:read'));
      await expect(adminPdfGET(makeReq(), makeParams())).rejects.toThrow('forbidden');
    });

    it('requirePermission se llama con módulo "contratos" y acción "read"', async () => {
      mockGetGeneratedContract.mockResolvedValue(null);
      await adminPdfGET(makeReq('99'), makeParams('99'));
      expect(mockRequirePermission).toHaveBeenCalledWith('contratos', 'read');
    });
  });

  describe('validación del ID', () => {
    it('ID no numérico → 404', async () => {
      const res = await adminPdfGET(makeReq('abc'), makeParams('abc'));
      expect(res.status).toBe(404);
      expect(mockGetGeneratedContract).not.toHaveBeenCalled();
    });

    it('ID cero → 404', async () => {
      const res = await adminPdfGET(makeReq('0'), makeParams('0'));
      expect(res.status).toBe(404);
      expect(mockGetGeneratedContract).not.toHaveBeenCalled();
    });

    it('ID negativo → 404', async () => {
      const res = await adminPdfGET(makeReq('-5'), makeParams('-5'));
      expect(res.status).toBe(404);
      expect(mockGetGeneratedContract).not.toHaveBeenCalled();
    });

    it('ID flotante (1.5) → 404', async () => {
      const res = await adminPdfGET(makeReq('1.5'), makeParams('1.5'));
      expect(res.status).toBe(404);
      expect(mockGetGeneratedContract).not.toHaveBeenCalled();
    });
  });

  describe('contrato no encontrado o sin PDF', () => {
    it('contrato inexistente → 404', async () => {
      mockGetGeneratedContract.mockResolvedValue(null);
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.status).toBe(404);
    });

    it('contrato sin fileUrl → 404', async () => {
      mockGetGeneratedContract.mockResolvedValue(validContract({ fileUrl: null }));
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.status).toBe(404);
    });
  });

  describe('BLOB_READ_WRITE_TOKEN', () => {
    it('sin token configurado → 503', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      mockGetGeneratedContract.mockResolvedValue(validContract());
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.status).toBe(503);
    });

    it('blob fetch falla → 404', async () => {
      mockGetGeneratedContract.mockResolvedValue(validContract());
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.status).toBe(404);
    });
  });

  describe('respuesta exitosa', () => {
    it('contrato válido → 200 con Content-Type application/pdf', async () => {
      mockGetGeneratedContract.mockResolvedValue(validContract());
      mockBlobOk();
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('Content-Disposition es inline con el nombre del archivo', async () => {
      mockGetGeneratedContract.mockResolvedValue(validContract({ fileName: 'mi_contrato.pdf' }));
      mockBlobOk();
      const res = await adminPdfGET(makeReq(), makeParams());
      const cd = res.headers.get('Content-Disposition') ?? '';
      expect(cd).toMatch(/^inline/);
      expect(cd).toContain('mi_contrato.pdf');
    });

    it('Cache-Control es private, no-store', async () => {
      mockGetGeneratedContract.mockResolvedValue(validContract());
      mockBlobOk();
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    });

    it('X-Content-Type-Options es nosniff', async () => {
      mockGetGeneratedContract.mockResolvedValue(validContract());
      mockBlobOk();
      const res = await adminPdfGET(makeReq(), makeParams());
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('el blob se descarga con Authorization Bearer (token no expuesto al cliente)', async () => {
      const BLOB_URL = 'https://blob.example.com/private/test.pdf';
      mockGetGeneratedContract.mockResolvedValue(validContract({ fileUrl: BLOB_URL }));
      mockBlobOk();
      await adminPdfGET(makeReq(), makeParams());
      expect(global.fetch).toHaveBeenCalledWith(
        BLOB_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer'),
          }),
        }),
      );
    });

    it('BLOB_READ_WRITE_TOKEN no aparece en ninguna cabecera de respuesta', async () => {
      mockGetGeneratedContract.mockResolvedValue(validContract());
      mockBlobOk();
      const res = await adminPdfGET(makeReq(), makeParams());
      for (const [, value] of res.headers.entries()) {
        expect(value).not.toContain(BLOB_SECRET);
      }
    });

    it('fileName con path traversal queda saneado en Content-Disposition', async () => {
      mockGetGeneratedContract.mockResolvedValue(
        validContract({ fileName: '../../../etc/passwd' }),
      );
      mockBlobOk();
      const res = await adminPdfGET(makeReq(), makeParams());
      const cd = res.headers.get('Content-Disposition') ?? '';
      expect(cd).not.toContain('..');
      expect(cd).not.toContain('/');
    });

    it('fileName null usa fallback "contrato.pdf"', async () => {
      mockGetGeneratedContract.mockResolvedValue(validContract({ fileName: null }));
      mockBlobOk();
      const res = await adminPdfGET(makeReq(), makeParams());
      const cd = res.headers.get('Content-Disposition') ?? '';
      expect(cd).toContain('contrato.pdf');
    });
  });

  describe('links admin — verificación estática', () => {
    it('ContratosTable.tsx no usa href={c.fileUrl} directamente', () => {
      const filePath = path.join(
        process.cwd(),
        'src/features/admin/contratos/components/ContratosTable.tsx',
      );
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toContain('href={c.fileUrl}');
      expect(content).toContain('/api/admin/contratos/');
    });

    it('ContratoDetailPanel.tsx no usa href={contract.fileUrl} directamente', () => {
      const filePath = path.join(
        process.cwd(),
        'src/features/admin/contratos/components/ContratoDetailPanel.tsx',
      );
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).not.toContain('href={contract.fileUrl');
      expect(content).toContain('/api/admin/contratos/');
    });

    it('ContratosTable.tsx mantiene target="_blank" en el link de PDF', () => {
      const filePath = path.join(
        process.cwd(),
        'src/features/admin/contratos/components/ContratosTable.tsx',
      );
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('target="_blank"');
    });

    it('ContratoDetailPanel.tsx mantiene target="_blank" en el link de PDF', () => {
      const filePath = path.join(
        process.cwd(),
        'src/features/admin/contratos/components/ContratoDetailPanel.tsx',
      );
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('target="_blank"');
    });

    it('la ruta del proxy admin usa la convención en español (contratos, no contracts)', () => {
      const filePath = path.join(
        process.cwd(),
        'src/features/admin/contratos/components/ContratosTable.tsx',
      );
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('/api/admin/contratos/');
      expect(content).not.toMatch(/\/api\/admin\/contracts\//);
    });
  });
});
