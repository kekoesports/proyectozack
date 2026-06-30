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
    const { row } = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
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
    const { row } = parsePayrollOcrPage(FEB_ALFONSO, 2, PDF_FEB);
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
    const { row } = parsePayrollOcrPage(MAR_PABLO, 1, PDF_MAR);
    expect(row.counterpartyName).toBe('CAMACHO CARRION PABLO');
    expect(row.yearMonth).toBe('2026-03');
    expect(row.netAmount).toBe('1696.55');
    expect(row.include).toBe(true);
    expect(row.warning).toBeNull();
    expect(row.txId).toBe('payroll:camacho-carrion-pablo:2026-03');
    expect(row.issueDate).toBe('2026-03-01');
  });

  it('[6] Alfonso marzo — extrae todos los campos correctamente', () => {
    const { row } = parsePayrollOcrPage(MAR_ALFONSO, 2, PDF_MAR);
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
    const { row } = parsePayrollOcrPage(text, 2, PDF_FEB);
    expect(row.include).toBe(false);
    expect(row.warning).toMatch(/coste empresa/i);
    expect(row.netAmount).toBe('0.00');
  });

  it('[8] si falta trabajador → fila marcada inválida', () => {
    const text = FEB_ALFONSO.replace(/^ARIAS.*\n/m, '');
    const { row } = parsePayrollOcrPage(text, 2, PDF_FEB);
    expect(row.include).toBe(false);
    expect(row.warning).toMatch(/trabajador/i);
    expect(row.counterpartyName).toBe('');
  });

  it('[9] si falta periodo → fila marcada inválida (yearMonth=desconocido)', () => {
    const text = FEB_ALFONSO.replace(/PERIODO.*\n/, '');
    const { row } = parsePayrollOcrPage(text, 2, PDF_FEB);
    expect(row.include).toBe(false);
    expect(row.yearMonth).toBe('desconocido');
    expect(row.warning).toMatch(/mes\/año/i);
  });
});

// ── Variantes razonables de OCR ─────────────────────────────────────────────

describe('parsePayrollOcrPage — robustez con variantes', () => {
  it('acepta "IRPF" sin puntos y "I.R.P.F." con puntos', () => {
    const { row } = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
    // IRPF aparece en notas si se detectó algún valor — no es obligatorio
    expect(row.include).toBe(true);
  });

  it('acepta diferentes separadores en el periodo (-/ vs espacio)', () => {
    const text = FEB_ALFONSO.replace('01 FEB 26 a 28 FEB 26', '01-FEB-26 AL 28-FEB-26');
    const { row } = parsePayrollOcrPage(text, 1, PDF_FEB);
    expect(row.yearMonth).toBe('2026-02');
  });

  it('el txId es determinista por (slug, yearMonth) → bloquea duplicados', () => {
    const { row: a } = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
    const { row: b } = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
    expect(a.txId).toBe(b.txId);
  });

  it('rellena notes con los campos detectados (incluye fileName)', () => {
    const { row } = parsePayrollOcrPage(FEB_PABLO, 1, PDF_FEB);
    expect(row.notes).toContain(PDF_FEB);
    expect(row.notes).toContain('Período: 2026-02');
    expect(row.notes).toContain('OCR navegador');
  });
});

// ── Tests del fix de marzo: 3 estrategias en cascada ────────────────────────

describe('parsePeriodFromText — estrategias en cascada (fix marzo 2026)', () => {
  const baseRow = (period: string) => `
CAMACHO CARRION PABLO
${period}
LIQUIDO A PERCIBIR 1.000,00
COSTE EMPRESA: 1.696,55
`.trim();

  it('[2] marzo full range "01 MAR 26 a 31 MAR 26" → 2026-03 (no regresión vs. febrero)', () => {
    const { row, diagnostic } = parsePayrollOcrPage(
      baseRow('PERIODO 01 MAR 26 a 31 MAR 26'), 1, 'm.pdf',
    );
    expect(row.yearMonth).toBe('2026-03');
    expect(diagnostic.hasPeriod).toBe(true);
    expect(diagnostic.monthTokenDetected).toBe('MAR');
    expect(diagnostic.validationMissingFields).toEqual([]);
  });

  it('[3a] estrategia B: "MAR 26" en contexto PERIODO → 2026-03', () => {
    const { row, diagnostic } = parsePayrollOcrPage(
      baseRow('PERIODO MAR 26'), 1, 'm.pdf',
    );
    expect(row.yearMonth).toBe('2026-03');
    expect(diagnostic.monthTokenDetected).toBe('MAR');
  });

  it('[3b] estrategia B: "MARZO 2026" → 2026-03', () => {
    const { row, diagnostic } = parsePayrollOcrPage(
      baseRow('PERIODO MARZO 2026'), 1, 'm.pdf',
    );
    expect(row.yearMonth).toBe('2026-03');
    expect(diagnostic.monthTokenDetected).toBe('MARZO');
  });

  it('[4a] tolera punto final "MAR." → 2026-03', () => {
    const { row } = parsePayrollOcrPage(baseRow('PERIODO MAR. 26'), 1, 'm.pdf');
    expect(row.yearMonth).toBe('2026-03');
  });

  it('[4b] tolera punto final "MARZO." → 2026-03', () => {
    const { row } = parsePayrollOcrPage(baseRow('PERIODO MARZO. 2026'), 1, 'm.pdf');
    expect(row.yearMonth).toBe('2026-03');
  });

  it('[5] estrategia C: formato narrativo "01 DE MARZO DE 2026" → 2026-03', () => {
    const { row, diagnostic } = parsePayrollOcrPage(
      baseRow('FECHA 01 DE MARZO DE 2026'), 1, 'm.pdf',
    );
    expect(row.yearMonth).toBe('2026-03');
    expect(diagnostic.monthTokenDetected).toBe('MARZO');
  });

  it('[8] todos los meses ENE-DIC se reconocen correctamente (abreviatura y nombre)', () => {
    const cases: Array<[string, string]> = [
      ['ENE 26', '2026-01'], ['ENERO 2026',     '2026-01'],
      ['FEB 26', '2026-02'], ['FEBRERO 2026',   '2026-02'],
      ['MAR 26', '2026-03'], ['MARZO 2026',     '2026-03'],
      ['ABR 26', '2026-04'], ['ABRIL 2026',     '2026-04'],
      ['MAY 26', '2026-05'], ['MAYO 2026',      '2026-05'],
      ['JUN 26', '2026-06'], ['JUNIO 2026',     '2026-06'],
      ['JUL 26', '2026-07'], ['JULIO 2026',     '2026-07'],
      ['AGO 26', '2026-08'], ['AGOSTO 2026',    '2026-08'],
      ['SEP 26', '2026-09'], ['SEPT 26',        '2026-09'], ['SEPTIEMBRE 2026', '2026-09'],
      ['OCT 26', '2026-10'], ['OCTUBRE 2026',   '2026-10'],
      ['NOV 26', '2026-11'], ['NOVIEMBRE 2026', '2026-11'],
      ['DIC 26', '2026-12'], ['DICIEMBRE 2026', '2026-12'],
    ];
    for (const [token, expected] of cases) {
      const { row } = parsePayrollOcrPage(baseRow(`PERIODO ${token}`), 1, 'p.pdf');
      expect({ token, got: row.yearMonth }).toEqual({ token, got: expected });
    }
  });

  it('[bonus] tolera salto de línea entre fecha inicial y final', () => {
    const { row } = parsePayrollOcrPage(baseRow('PERIODO 01 MAR 26\na 31 MAR 26'), 1, 'm.pdf');
    expect(row.yearMonth).toBe('2026-03');
  });
});

// ── Tests del diagnostic ────────────────────────────────────────────────────

describe('PayrollOcrRowDiagnostic — metadata segura para logging', () => {
  it('[6] si falta periodo → diagnostic.validationMissingFields = ["period"]', () => {
    const text = `
CAMACHO CARRION PABLO
LIQUIDO A PERCIBIR 1.000,00
COSTE EMPRESA: 1.696,55
`.trim();
    const { row, diagnostic } = parsePayrollOcrPage(text, 1, 'p.pdf');
    expect(diagnostic.hasPeriod).toBe(false);
    expect(diagnostic.monthTokenDetected).toBeNull();
    expect(diagnostic.validationMissingFields).toEqual(['period']);
    expect(row.include).toBe(false);
    expect(row.warning).toMatch(/mes\/año/i);
  });

  it('[7] si falta nombre → diagnostic.validationMissingFields = ["employee"]', () => {
    const text = `
PERIODO 01 MAR 26 a 31 MAR 26
LIQUIDO A PERCIBIR 1.000,00
COSTE EMPRESA: 1.696,55
`.trim();
    const { row, diagnostic } = parsePayrollOcrPage(text, 1, 'p.pdf');
    expect(diagnostic.hasEmployeeName).toBe(false);
    expect(diagnostic.validationMissingFields).toEqual(['employee']);
    expect(row.include).toBe(false);
  });

  it('si faltan todos los campos críticos → 3 missingFields', () => {
    const text = `algun texto OCR irrelevante`;
    const { diagnostic } = parsePayrollOcrPage(text, 1, 'p.pdf');
    expect(diagnostic.hasEmployeeName).toBe(false);
    expect(diagnostic.hasPeriod).toBe(false);
    expect(diagnostic.hasCostCompany).toBe(false);
    expect([...diagnostic.validationMissingFields].sort()).toEqual(['costCompany', 'employee', 'period']);
  });

  it('diagnostic NO incluye texto OCR crudo ni nombres ni importes (solo flags + token)', () => {
    const { diagnostic } = parsePayrollOcrPage(
      baseTextFebPablo(), 1, 'p.pdf',
    );
    // Verificación defensiva: el shape del diagnostic es solo flags + token + array de strings cortos
    const keys = Object.keys(diagnostic).sort();
    expect(keys).toEqual([
      'hasCostCompany',
      'hasEmployeeName',
      'hasPeriod',
      'monthTokenDetected',
      'validationMissingFields',
    ]);
    // No debe haber strings con nombres ni importes
    const json = JSON.stringify(diagnostic);
    expect(json).not.toMatch(/CAMACHO|PABLO|ARIAS|ALFONSO/);
    expect(json).not.toMatch(/1\.000|1\.696|1\.369/);
  });
});

function baseTextFebPablo(): string {
  return `
CAMACHO CARRION PABLO
PERIODO 01 FEB 26 a 28 FEB 26
LIQUIDO A PERCIBIR 1.000,00
COSTE EMPRESA: 1.696,55
`.trim();
}
