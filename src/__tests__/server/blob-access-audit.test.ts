/**
 * Auditoría estática + funcional de uso de Vercel Blob.
 *
 * Garantiza:
 * 1. Documentos financieros (facturas, nóminas, contratos, campañas, finanzas)
 *    NUNCA usan `access: 'public'`.
 * 2. El único path con `access: 'public'` legítimo en src/ es news/images.ts
 *    (usa un store público dedicado vía BLOB_READ_WRITE_TOKEN_NEWS).
 * 3. Los nuevos proxies de imágenes (/api/brand-logo, /api/team-photo) sirven
 *    blobs privados con Bearer token y caché.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── 1) Tests estáticos sobre source ─────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC_ROOT = path.join(PROJECT_ROOT, 'src');

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, files);
    } else if (/\.(ts|tsx|mts)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const PUBLIC_ACCESS_PATTERN = /access\s*:\s*['"]public['"]/;

describe('Blob access audit — static source scan', () => {
  it('documentos financieros NUNCA usan access: "public"', () => {
    const FINANCIAL_PATHS = [
      path.join(SRC_ROOT, 'app', 'admin', '(dashboard)', 'facturacion'),
      path.join(SRC_ROOT, 'app', 'admin', '(dashboard)', 'contratos'),
      path.join(SRC_ROOT, 'app', 'admin', '(dashboard)', 'campanas'),
      path.join(SRC_ROOT, 'app', 'admin', '(dashboard)', 'finanzas'),
      path.join(SRC_ROOT, 'lib', 'storage.ts'),
    ];

    const offenders: string[] = [];
    for (const target of FINANCIAL_PATHS) {
      const stat = fs.existsSync(target) ? fs.statSync(target) : null;
      if (!stat) continue;
      const files = stat.isDirectory() ? walk(target) : [target];
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (PUBLIC_ACCESS_PATTERN.test(content)) {
          offenders.push(path.relative(PROJECT_ROOT, file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('el único path con access: "public" en src/ es news/images.ts', () => {
    // Lista blanca: archivos donde access:'public' está justificado
    // (store público dedicado vía BLOB_READ_WRITE_TOKEN_NEWS)
    const ALLOWED = new Set([
      path.join('src', 'lib', 'news', 'images.ts'),
    ].map((p) => p.replace(/\\/g, '/')));

    const offenders: string[] = [];
    const allFiles = walk(SRC_ROOT);
    for (const file of allFiles) {
      // Excluir tests
      if (file.includes('__tests__')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      if (!PUBLIC_ACCESS_PATTERN.test(content)) continue;
      const rel = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
      if (!ALLOWED.has(rel)) {
        offenders.push(rel);
      }
    }

    expect(offenders).toEqual([]);
  });
});

// ── 2) Tests funcionales de los proxies nuevos ───────────────────────────

const mockList = jest.fn();

jest.mock('@vercel/blob', () => ({
  list: (...args: unknown[]) => mockList(...args),
}));

jest.mock('@/lib/env', () => ({
  env: {
    get BLOB_READ_WRITE_TOKEN() {
      return process.env.BLOB_READ_WRITE_TOKEN ?? '';
    },
  },
}));

import { NextRequest } from 'next/server';
import { GET as brandLogoGET } from '@/app/api/brand-logo/[id]/route';
import { GET as teamPhotoGET } from '@/app/api/team-photo/[id]/route';

const BLOB_TOKEN = 'test-blob-token-xyz';

const makeReq = (url: string) => new NextRequest(url);
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const mockBlobFetchOk = (contentType = 'image/png') => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k === 'content-type' ? contentType : null) },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  process.env.BLOB_READ_WRITE_TOKEN = BLOB_TOKEN;
});

afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe('/api/brand-logo/[id]', () => {
  it('devuelve 200 con el blob más reciente', async () => {
    mockList.mockResolvedValue({
      blobs: [
        { url: 'https://store/brands/5-100.png', uploadedAt: '2026-06-29T00:00:00Z' },
        { url: 'https://store/brands/5-200.png', uploadedAt: '2026-06-30T00:00:00Z' },
      ],
    });
    mockBlobFetchOk('image/png');

    const res = await brandLogoGET(makeReq('http://localhost/api/brand-logo/5'), makeParams('5'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    // Fetched the most recent blob
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe('https://store/brands/5-200.png');
    // Bearer token used server-side
    const headers = (global.fetch as jest.Mock).mock.calls[0]?.[1]?.headers;
    expect(headers.Authorization).toBe(`Bearer ${BLOB_TOKEN}`);
  });

  it('devuelve 404 cuando no existen blobs para ese id', async () => {
    mockList.mockResolvedValue({ blobs: [] });

    const res = await brandLogoGET(makeReq('http://localhost/api/brand-logo/99'), makeParams('99'));

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('devuelve 404 con id no numérico', async () => {
    const res = await brandLogoGET(makeReq('http://localhost/api/brand-logo/abc'), makeParams('abc'));

    expect(res.status).toBe(404);
    expect(mockList).not.toHaveBeenCalled();
  });

  it('aplica Cache-Control público con SWR', async () => {
    mockList.mockResolvedValue({
      blobs: [{ url: 'https://store/brands/1-1.png', uploadedAt: '2026-06-30T00:00:00Z' }],
    });
    mockBlobFetchOk();

    const res = await brandLogoGET(makeReq('http://localhost/api/brand-logo/1'), makeParams('1'));

    expect(res.headers.get('cache-control')).toMatch(/public/);
    expect(res.headers.get('cache-control')).toMatch(/stale-while-revalidate/);
  });

  it('lista por el prefijo correcto brands/{id}-', async () => {
    mockList.mockResolvedValue({
      blobs: [{ url: 'https://store/brands/42-x.png', uploadedAt: '2026-06-30T00:00:00Z' }],
    });
    mockBlobFetchOk();

    await brandLogoGET(makeReq('http://localhost/api/brand-logo/42'), makeParams('42'));

    expect(mockList).toHaveBeenCalledWith({ prefix: 'brands/42-' });
  });
});

describe('/api/team-photo/[id]', () => {
  it('devuelve 200 con el blob más reciente', async () => {
    mockList.mockResolvedValue({
      blobs: [
        { url: 'https://store/team/3-100.jpg', uploadedAt: '2026-06-30T00:00:00Z' },
        { url: 'https://store/team/3-50.jpg', uploadedAt: '2026-06-29T00:00:00Z' },
      ],
    });
    mockBlobFetchOk('image/jpeg');

    const res = await teamPhotoGET(makeReq('http://localhost/api/team-photo/3'), makeParams('3'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe('https://store/team/3-100.jpg');
  });

  it('devuelve 404 cuando no existen blobs para ese id', async () => {
    mockList.mockResolvedValue({ blobs: [] });

    const res = await teamPhotoGET(makeReq('http://localhost/api/team-photo/99'), makeParams('99'));

    expect(res.status).toBe(404);
  });

  it('lista por el prefijo correcto team/{id}-', async () => {
    mockList.mockResolvedValue({
      blobs: [{ url: 'https://store/team/7-x.jpg', uploadedAt: '2026-06-30T00:00:00Z' }],
    });
    mockBlobFetchOk();

    await teamPhotoGET(makeReq('http://localhost/api/team-photo/7'), makeParams('7'));

    expect(mockList).toHaveBeenCalledWith({ prefix: 'team/7-' });
  });
});
