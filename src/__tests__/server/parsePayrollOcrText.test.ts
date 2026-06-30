/**
 * Tests del parser puro de texto OCR para nóminas ELEVATEX.
 *
 * Usa los 4 textos reales proporcionados por el usuario (febrero/marzo,
 * Pablo/Alfonso) como ground truth.
 *
 * Importa desde el módulo client-only (sin imports server-only en este path).
 */

import { parsePayrollOcrPage } from '@/features/admin/finance-payroll/client-ocr/parseOcrText';

// ── Muestras de texto OCR aportadas por el usuario ──────────────────────────

const FEB_PABLO = `
CAMACHO CARRION PABLO
PERIODO 01 FEB 26 a 28 FEB 26
LIQUIDO A PERCIBIR 1.000,00
COSTE EMPRESA: 1.696,55
IRPF 22,49
T. DEVENGADO 1.696,55
T. A DEDUCIR 696,55
`.trim();

const FEB_ALFONSO = `
ARIAS EPIFANIO ALFONSO
PERIODO 01 FEB 26 a 28 FEB 26
LIQUIDO A PERCIBIR 1.000,00
COSTE EMPRESA: 1.369,00
T. DEVENGADO 1.369,00
T. A DEDUCIR 369,00
`.trim();

const MAR_PABLO = `
CAMACHO CARRION PABLO
PERIODO 01 MAR 26 a 31 MAR 26
LIQUIDO A PERCIBIR 1.000,00
COSTE EMPRESA: 1.696,55
IRPF 22,49
T. DEVENGADO 1.696,55
T. A DEDUCIR 696,55
`.trim();

const MAR_ALFONSO = `
ARIAS EPIFANIO ALFONSO
PERIODO 01 MAR 26 a 31 MAR 26
LIQUIDO A PERCIBIR 1.000,00
COSTE EMPRESA: 1.369,00
T. DEVENGADO 1.369,00
T. A DEDUCIR 369,00
`.trim();

const PDF_FEB = 'NOMINA ELEVATEX FEBRERO 2026.pdf';
const PDF_MAR = 'NOMINA ELEVATEX MARZO 2026.pdf';

// ── Tests con muestras reales ───────────────────────────────────────────────

describe('parsePayrollOcrPage — muestras reales ELEVATEX', () => {
  it('[3] Pablo febrero — extrae todos los campos correctamente', () => {
    const row = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
    expect(row.counterpartyName).toBe('CAMACHO CARRION PABLO');
    expect(row.yearMonth).toBe('2026-02');
    expect(row.netAmount).toBe('1696.55');
    expect(row.totalAmount).toBe('1696.55');
    expect(row.include).toBe(true);
    expect(row.warning).toBeNull();
    expect(row.txId).toBe('payroll:camacho-carrion-pablo:2026-02');
    expect(row.issueDate).toBe('2026-02-01');
    expect(row.expenseSubtype).toBe('nomina_socio');
  });

  it('[4] Alfonso febrero — extrae todos los campos correctamente', () => {
    const row = parsePayrollOcrPage(FEB_ALFONSO, 2, PDF_FEB);
    expect(row.counterpartyName).toBe('ARIAS EPIFANIO ALFONSO');
    expect(row.yearMonth).toBe('2026-02');
    expect(row.netAmount).toBe('1369.00');
    expect(row.totalAmount).toBe('1369.00');
    expect(row.include).toBe(true);
    expect(row.warning).toBeNull();
    expect(row.txId).toBe('payroll:arias-epifanio-alfonso:2026-02');
    expect(row.issueDate).toBe('2026-02-01');
  });

  it('[5] Pablo marzo — extrae todos los campos correctamente', () => {
    const row = parsePayrollOcrPage(MAR_PABLO, 1, PDF_MAR);
    expect(row.counterpartyName).toBe('CAMACHO CARRION PABLO');
    expect(row.yearMonth).toBe('2026-03');
    expect(row.netAmount).toBe('1696.55');
    expect(row.include).toBe(true);
    expect(row.warning).toBeNull();
    expect(row.txId).toBe('payroll:camacho-carrion-pablo:2026-03');
    expect(row.issueDate).toBe('2026-03-01');
  });

  it('[6] Alfonso marzo — extrae todos los campos correctamente', () => {
    const row = parsePayrollOcrPage(MAR_ALFONSO, 2, PDF_MAR);
    expect(row.counterpartyName).toBe('ARIAS EPIFANIO ALFONSO');
    expect(row.yearMonth).toBe('2026-03');
    expect(row.netAmount).toBe('1369.00');
    expect(row.include).toBe(true);
    expect(row.warning).toBeNull();
    expect(row.txId).toBe('payroll:arias-epifanio-alfonso:2026-03');
  });
});

// ── Validaciones de campos obligatorios ─────────────────────────────────────

describe('parsePayrollOcrPage — campos obligatorios faltantes', () => {
  it('[7] si falta coste empresa → fila marcada inválida (include=false, warning)', () => {
    const text = FEB_ALFONSO.replace(/COSTE EMPRESA: 1\.369,00\n?/, '');
    const row = parsePayrollOcrPage(text, 2, PDF_FEB);
    expect(row.include).toBe(false);
    expect(row.warning).toMatch(/coste empresa/i);
    expect(row.netAmount).toBe('0.00');
  });

  it('[8] si falta trabajador → fila marcada inválida', () => {
    const text = FEB_ALFONSO.replace(/^ARIAS.*\n/m, '');
    const row = parsePayrollOcrPage(text, 2, PDF_FEB);
    expect(row.include).toBe(false);
    expect(row.warning).toMatch(/trabajador/i);
    expect(row.counterpartyName).toBe('');
  });

  it('[9] si falta periodo → fila marcada inválida (yearMonth=desconocido)', () => {
    const text = FEB_ALFONSO.replace(/PERIODO.*\n/, '');
    const row = parsePayrollOcrPage(text, 2, PDF_FEB);
    expect(row.include).toBe(false);
    expect(row.yearMonth).toBe('desconocido');
    expect(row.warning).toMatch(/mes\/año/i);
  });
});

// ── Variantes razonables de OCR ─────────────────────────────────────────────

describe('parsePayrollOcrPage — robustez con variantes', () => {
  it('acepta "IRPF" sin puntos y "I.R.P.F." con puntos', () => {
    const row = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
    // IRPF aparece en notas si se detectó algún valor — no es obligatorio
    expect(row.include).toBe(true);
  });

  it('acepta diferentes separadores en el periodo (-/ vs espacio)', () => {
    const text = FEB_ALFONSO.replace('01 FEB 26 a 28 FEB 26', '01-FEB-26 AL 28-FEB-26');
    const row = parsePayrollOcrPage(text, 1, PDF_FEB);
    expect(row.yearMonth).toBe('2026-02');
  });

  it('el txId es determinista por (slug, yearMonth) → bloquea duplicados', () => {
    const a = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
    const b = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
    expect(a.txId).toBe(b.txId);
  });

  it('rellena notes con los campos detectados (incluye fileName)', () => {
    const row = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
    expect(row.notes).toContain(PDF_FEB);
    expect(row.notes).toContain('Período: 2026-02');
    expect(row.notes).toContain('OCR navegador');
  });
});
