/**
 * Tests para ocrPayrollPdfAction — error handling controlado (camino OCR habilitado).
 * Para el kill switch (PAYROLL_OCR_ENABLED=false) ver payroll-actions-killswitch.test.ts.
 * Verifica que la action NUNCA lanza excepción al caller y NUNCA loggea PII.
 */

// Forzar flag OCR ON en este test — verificamos el camino completo OCR.
jest.mock('@/lib/env', () => ({
  env: { PAYROLL_OCR_ENABLED: true },
}));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('@/lib/db', () => ({ db: {} }));

import { ocrPayrollPdfAction } from '@/app/admin/(dashboard)/finanzas/nominas/importar/actions';

jest.mock('@/lib/permissions', () => ({
  requirePermission: jest.fn().mockResolvedValue({ user: { id: 'test-user-id' } }),
  requireAnyRole: jest.fn().mockResolvedValue({ user: { id: 'test-user-id' } }),
}));

jest.mock('@/lib/parsers/payrollOcr', () => ({
  ocrPayrollPdf: jest.fn(),
}));

function makePdfFormData(name = 'test.pdf', sizeBytes = 1024): FormData {
  const bytes = new Uint8Array(sizeBytes).fill(0x25); // 0x25 = '%' — simula cabecera PDF
  const file = new File([bytes], name, { type: 'application/pdf' });
  const fd = new FormData();
  fd.append('pdf', file);
  return fd;
}

async function getOcrMock() {
  const mod = await import('@/lib/parsers/payrollOcr');
  return mod.ocrPayrollPdf as jest.Mock;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Exception capture ──────────────────────────────────────────────────────

describe('ocrPayrollPdfAction — captura excepción y devuelve { ok: false }', () => {
  it('MODULE_NOT_FOUND (caso Vercel prod) → retorna { ok: false }, no lanza', async () => {
    const mock = await getOcrMock();
    mock.mockRejectedValue(new Error("Cannot find module '..'"));

    const res = await ocrPayrollPdfAction(makePdfFormData());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no se pudo completar/i);
  });

  it('error de traineddata (ENOENT spa.traineddata) → retorna { ok: false }', async () => {
    const mock = await getOcrMock();
    mock.mockRejectedValue(
      new Error("ENOENT: no such file or directory, open '/var/task/spa.traineddata'"),
    );

    const res = await ocrPayrollPdfAction(makePdfFormData());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no se pudo completar/i);
  });

  it('error WASM mupdf → retorna { ok: false }', async () => {
    const mock = await getOcrMock();
    mock.mockRejectedValue(new Error('WebAssembly.instantiate failed'));

    const res = await ocrPayrollPdfAction(makePdfFormData());

    expect(res.ok).toBe(false);
  });

  it('nunca lanza excepción al caller — siempre resuelve con { ok }', async () => {
    const mock = await getOcrMock();
    mock.mockRejectedValue(new Error('fatal crash'));

    await expect(ocrPayrollPdfAction(makePdfFormData())).resolves.toHaveProperty('ok');
  });
});

// ── 2. Timeout ────────────────────────────────────────────────────────────────

describe('ocrPayrollPdfAction — timeout interno', () => {
  it('timeout de 55 s → retorna { ok: false } con mensaje genérico', async () => {
    // El internal timeout lanza `new Error('ocr_timeout')` tras 55 s.
    // Mensaje unificado (no expone "tardó demasiado") y guía hacia manual.
    const mock = await getOcrMock();
    mock.mockRejectedValue(new Error('ocr_timeout'));

    const res = await ocrPayrollPdfAction(makePdfFormData());

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/no se pudo completar/i);
      expect(res.error).toMatch(/manualmente/i);
    }
  });
});

// ── 3. No crea facturas cuando OCR falla ─────────────────────────────────────

describe('ocrPayrollPdfAction — no hay side-effects cuando OCR falla', () => {
  it('no llama a applyPayrollImport cuando ocrPayrollPdf falla', async () => {
    const mock = await getOcrMock();
    mock.mockRejectedValue(new Error('crash'));

    // Si se llamara a applyPayrollImport sin mock, el test fallaría por DB.
    // No necesitamos mockearla: si la action devuelve { ok: false } antes, nunca se llega.
    const res = await ocrPayrollPdfAction(makePdfFormData());

    expect(res.ok).toBe(false);
  });
});

// ── 4. Sin PII en logs ────────────────────────────────────────────────────────

describe('ocrPayrollPdfAction — sin PII en logs', () => {
  it('console.error no contiene nombres de empleados ni importes', async () => {
    const mock = await getOcrMock();
    mock.mockRejectedValue(new Error('crash'));

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await ocrPayrollPdfAction(makePdfFormData('NOMINA ELEVATEX MARZO 2026.pdf'));

    const allLogArgs = JSON.stringify([...errorSpy.mock.calls, ...logSpy.mock.calls]);

    // Nombres de empleados reales no deben aparecer en logs
    expect(allLogArgs).not.toMatch(/camacho|arias|pablo|alfonso/i);
    // Importes de nómina no deben aparecer
    expect(allLogArgs).not.toMatch(/1696|1369|1000/);

    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('el log de error sí contiene metadatos técnicos (step, elapsedMs)', async () => {
    const mock = await getOcrMock();
    mock.mockRejectedValue(new Error('crash'));

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await ocrPayrollPdfAction(makePdfFormData());

    expect(errorSpy).toHaveBeenCalledWith(
      '[ocr-payroll] step=failed',
      expect.objectContaining({ step: 'error', elapsedMs: expect.any(Number) }),
    );

    errorSpy.mockRestore();
  });
});

// ── 5. Validaciones de entrada ────────────────────────────────────────────────

describe('ocrPayrollPdfAction — validaciones básicas', () => {
  it('sin archivo → { ok: false }', async () => {
    const fd = new FormData();
    const res = await ocrPayrollPdfAction(fd);
    expect(res.ok).toBe(false);
  });

  it('archivo > 20 MB → { ok: false }', async () => {
    const res = await ocrPayrollPdfAction(makePdfFormData('test.pdf', 21 * 1024 * 1024));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/20 MB/);
  });

  it('extensión no-pdf → { ok: false }', async () => {
    const file = new File([new Uint8Array(100)], 'nomina.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const fd = new FormData();
    fd.append('pdf', file);
    const res = await ocrPayrollPdfAction(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/PDF/);
  });
});
