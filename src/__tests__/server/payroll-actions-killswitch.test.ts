/**
 * Kill switch + blindaje de las server actions de importación de nóminas.
 *
 * Garantiza que /admin/finanzas/nominas/importar nunca tire la página:
 *  - OCR deshabilitado (default prod): nunca invoca tesseract
 *  - OCR habilitado: invoca tesseract por el camino normal
 *  - Cualquier excepción en parse/OCR/apply → { ok: false, error } controlado
 *  - Mensajes al usuario son genéricos (sin DOMMatrix/tesseract/pdf.worker)
 */

// ── Mocks (hoisted) ─────────────────────────────────────────────────────────

jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('@/lib/db', () => ({ db: {} }));

const mockRequirePermission = jest.fn();
jest.mock('@/lib/permissions', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
  PERMISSIONS: {},
}));

const mockParsePayrollPdfBuffer = jest.fn();
const mockDetectMonthFromFilename = jest.fn();
jest.mock('@/lib/parsers/payrollPdf', () => ({
  parsePayrollPdfBuffer: (...args: unknown[]) => mockParsePayrollPdfBuffer(...args),
  detectMonthFromFilename: (...args: unknown[]) => mockDetectMonthFromFilename(...args),
}));

const mockOcrPayrollPdf = jest.fn();
jest.mock('@/lib/parsers/payrollOcr', () => ({
  ocrPayrollPdf: (...args: unknown[]) => mockOcrPayrollPdf(...args),
}));

const mockGetExistingPayrollTxIds = jest.fn();
const mockApplyPayrollImport = jest.fn();
jest.mock('@/lib/queries/payrollImport', () => ({
  getExistingPayrollTxIds: (...args: unknown[]) => mockGetExistingPayrollTxIds(...args),
  applyPayrollImport: (...args: unknown[]) => mockApplyPayrollImport(...args),
}));

let MOCK_OCR_ENABLED = false;
jest.mock('@/lib/env', () => ({
  env: {
    get PAYROLL_OCR_ENABLED() { return MOCK_OCR_ENABLED; },
  },
}));

// Silenciar logs en consola durante tests
jest.mock('@/lib/log', () => ({
  logRedacted: jest.fn(),
}));

// ── Imports tras mocks ──────────────────────────────────────────────────────

import {
  parsePayrollPdfAction,
  ocrPayrollPdfAction,
  applyPayrollImportAction,
} from '@/app/admin/(dashboard)/finanzas/nominas/importar/actions';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makePdfFormData(filename = 'nomina.pdf', size = 1024): FormData {
  const fd = new FormData();
  const file = new File(['%PDF-1.4 fake'], filename, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  fd.append('pdf', file);
  return fd;
}

const TECH_KEYWORDS = ['DOMMatrix', 'tesseract', 'pdf.worker', 'Cannot find module', 'timeout', 'fake worker', 'GlobalWorkerOptions'];

function expectNoTechnicalLeak(error: string | undefined): void {
  for (const kw of TECH_KEYWORDS) {
    expect(error?.toLowerCase() ?? '').not.toContain(kw.toLowerCase());
  }
}

// ── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  MOCK_OCR_ENABLED = false;
  mockRequirePermission.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ocrPayrollPdfAction — kill switch PAYROLL_OCR_ENABLED', () => {
  it('[1] flag off → devuelve error controlado y NO invoca tesseract', async () => {
    MOCK_OCR_ENABLED = false;
    const res = await ocrPayrollPdfAction(makePdfFormData());
    expect(res.ok).toBe(false);
    expect(mockOcrPayrollPdf).not.toHaveBeenCalled();
    if (!res.ok) {
      expect(res.error).toContain('deshabilitado');
      expectNoTechnicalLeak(res.error);
    }
  });

  it('[2] flag on → invoca ocrPayrollPdf por el camino normal', async () => {
    MOCK_OCR_ENABLED = true;
    mockOcrPayrollPdf.mockResolvedValue({
      rows: [{ counterpartyName: 'Test', yearMonth: '2026-06', netAmount: 1000 }],
      pageCount: 1,
    });

    const res = await ocrPayrollPdfAction(makePdfFormData());
    expect(mockOcrPayrollPdf).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
  });

  it('[6] flag default es false cuando env var no se define (verificado al nivel de env.ts)', async () => {
    // Garantizado por el schema en env.ts: PAYROLL_OCR_ENABLED.default('false').
    // Aquí solo verificamos que la action respeta MOCK_OCR_ENABLED=false sin tirar.
    MOCK_OCR_ENABLED = false;
    const res = await ocrPayrollPdfAction(makePdfFormData());
    expect(res.ok).toBe(false);
    expect(mockOcrPayrollPdf).not.toHaveBeenCalled();
  });
});

describe('parsePayrollPdfAction — blindaje de excepciones', () => {
  it('[3] excepción inesperada en parsePayrollPdfBuffer → ok:false controlado', async () => {
    mockParsePayrollPdfBuffer.mockRejectedValue(
      new Error('DOMMatrix is not defined — fake worker failed setting up tesseract'),
    );

    const res = await parsePayrollPdfAction(makePdfFormData());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBeTruthy();
      expectNoTechnicalLeak(res.error);
    }
  });

  it('[8] mensaje al usuario es genérico y guía hacia manual', async () => {
    mockParsePayrollPdfBuffer.mockRejectedValue(new Error('Cannot find module ..'));

    const res = await parsePayrollPdfAction(makePdfFormData());
    if (!res.ok) {
      expect(res.error).toMatch(/manualmente/i);
      expectNoTechnicalLeak(res.error);
    }
  });
});

describe('ocrPayrollPdfAction — blindaje de excepciones (flag on)', () => {
  beforeEach(() => { MOCK_OCR_ENABLED = true; });

  it('[4a] excepción dentro de ocrPayrollPdf → ok:false controlado', async () => {
    mockOcrPayrollPdf.mockRejectedValue(new Error('Cannot find module ..'));

    const res = await ocrPayrollPdfAction(makePdfFormData());
    expect(res.ok).toBe(false);
    if (!res.ok) expectNoTechnicalLeak(res.error);
  });

  it('[4b] excepción fuera del race (p.ej. requirePermission) → ok:false controlado', async () => {
    mockRequirePermission.mockRejectedValue(new Error('boom'));

    const res = await ocrPayrollPdfAction(makePdfFormData());
    expect(res.ok).toBe(false);
    if (!res.ok) expectNoTechnicalLeak(res.error);
  });

  it('[4c] timeout interno → ok:false controlado', async () => {
    mockOcrPayrollPdf.mockRejectedValue(new Error('ocr_timeout'));

    const res = await ocrPayrollPdfAction(makePdfFormData());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/manualmente/i);
      expectNoTechnicalLeak(res.error);
    }
  });
});

describe('applyPayrollImportAction — no inserta nada si OCR falla', () => {
  it('[7a] no llama applyPayrollImport si las rows están vacías o inválidas', async () => {
    const fd = new FormData();
    const file = new File(['fake'], 'n.pdf', { type: 'application/pdf' });
    fd.append('pdf', file);
    fd.append('rows', 'not-json');

    const res = await applyPayrollImportAction(fd);
    expect(res.ok).toBe(false);
    expect(mockApplyPayrollImport).not.toHaveBeenCalled();
  });

  it('[7b] excepción en applyPayrollImport → ok:false controlado, no propaga', async () => {
    mockGetExistingPayrollTxIds.mockResolvedValue([]);
    mockApplyPayrollImport.mockRejectedValue(new Error('DB connection lost'));

    const fd = new FormData();
    const file = new File(['fake'], 'n.pdf', { type: 'application/pdf' });
    fd.append('pdf', file);
    fd.append('rows', JSON.stringify([{
      counterpartyName: 'Test Worker',
      yearMonth: '2026-06',
      grossAmount: '1500',
      netAmount: '1000',
      employerCost: '2000',
      deductions: '500',
      irpfPct: '15',
      txId: 'test-tx-1',
    }]));

    const res = await applyPayrollImportAction(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) expectNoTechnicalLeak(res.error);
  });
});
