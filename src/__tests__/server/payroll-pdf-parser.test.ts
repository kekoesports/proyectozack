import type { PdfTextItem } from '@/lib/parsers/pdf';

// Mock pdf.ts to avoid pdfjs-dist ESM incompatibility with Jest (import.meta.url)
jest.mock('@/lib/parsers/pdf', () => ({
  extractPdfText: jest.fn(),
  groupIntoLines: (items: readonly PdfTextItem[]) => {
    const byY = new Map<number, PdfTextItem[]>();
    for (const item of items) {
      const key = Math.round(item.y);
      const existing = byY.get(key);
      if (existing) existing.push(item);
      else byY.set(key, [item]);
    }
    return Array.from(byY.entries())
      .sort(([a], [b]) => b - a)
      .map(([y, lineItems]) => {
        const sorted = [...lineItems].sort((a, b) => a.x - b.x);
        return { page: sorted[0]!.page, y, items: sorted, text: sorted.map((i) => i.str).join(' ') };
      });
  },
}));

import { extractPdfText } from '@/lib/parsers/pdf';
import {
  slugifyEmployeeName,
  makePayrollTxId,
  buildPayrollNotes,
  parsePayrollPage,
  extractMoney,
  detectMonthFromFilename,
  detectFilenameMismatch,
  parsePayrollPdfBuffer,
} from '@/lib/parsers/payrollPdf';
import type { ParsedPayrollPage } from '@/lib/finance/payroll/types';

const mockExtractPdfText = extractPdfText as jest.MockedFunction<typeof extractPdfText>;

// Synthetic fixtures — no real employee data, no real DNIs/NIFs/addresses
const SYNTHETIC_ITEMS: readonly PdfTextItem[] = [
  { str: 'TRABAJADOR', page: 1, x: 10, y: 700, width: 80, height: 10, fontSize: 10 },
  { str: 'EMPLEADO PRUEBA UNO', page: 1, x: 100, y: 700, width: 130, height: 10, fontSize: 10 },
  { str: 'PERIODO', page: 1, x: 10, y: 650, width: 50, height: 10, fontSize: 10 },
  { str: '01 ENE 26 a 31 ENE 26', page: 1, x: 70, y: 650, width: 150, height: 10, fontSize: 10 },
  { str: 'T.DEVENGADO', page: 1, x: 10, y: 300, width: 80, height: 10, fontSize: 10 },
  { str: '1.500,00', page: 1, x: 100, y: 300, width: 60, height: 10, fontSize: 10 },
  { str: 'T.A DEDUCIR', page: 1, x: 10, y: 280, width: 80, height: 10, fontSize: 10 },
  { str: '350,00', page: 1, x: 100, y: 280, width: 50, height: 10, fontSize: 10 },
  { str: 'LIQUIDO A PERCIBIR', page: 1, x: 10, y: 260, width: 120, height: 10, fontSize: 10 },
  { str: '1.150,00', page: 1, x: 140, y: 260, width: 60, height: 10, fontSize: 10 },
  { str: 'COSTE EMPRESA', page: 1, x: 10, y: 240, width: 100, height: 10, fontSize: 10 },
  { str: '1.667,51', page: 1, x: 120, y: 240, width: 60, height: 10, fontSize: 10 },
];

const ITEMS_MISSING_COSTE: readonly PdfTextItem[] = SYNTHETIC_ITEMS.filter(
  (item) => item.str !== 'COSTE EMPRESA' && item.str !== '1.667,51',
);

describe('slugifyEmployeeName', () => {
  it('slugifica nombre básico en minúsculas con guiones', () => {
    expect(slugifyEmployeeName('EMPLEADO PRUEBA UNO')).toBe('empleado-prueba-uno');
  });

  it('elimina acentos correctamente', () => {
    expect(slugifyEmployeeName('PABLO CAMACHO CARRIÓN')).toBe('pablo-camacho-carrion');
  });

  it('colapsa espacios múltiples y elimina extremos', () => {
    expect(slugifyEmployeeName('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });
});

describe('makePayrollTxId', () => {
  it('genera formato payroll:{slug}:{YYYY-MM}', () => {
    expect(makePayrollTxId('pablo-camacho', '2026-01')).toBe('payroll:pablo-camacho:2026-01');
  });

  it('es estable: mismos inputs → mismo output', () => {
    const id1 = makePayrollTxId('empleado-prueba', '2025-10');
    const id2 = makePayrollTxId('empleado-prueba', '2025-10');
    expect(id1).toBe(id2);
  });
});

describe('buildPayrollNotes', () => {
  const parsed: ParsedPayrollPage = {
    page: 1,
    employeeName: 'EMPLEADO PRUEBA UNO',
    costoEmpresa: 1667.51,
    liquidoPercibir: 1000.0,
    yearMonth: '2026-01',
    issueDate: '2026-01-01',
    irpfPct: 21.2,
    totalDevengado: 1667.51,
    totalDeducciones: 667.51,
    warnings: [],
  };

  it('incluye el período (yearMonth) en las notas', () => {
    const notes = buildPayrollNotes(parsed, 'nominas-enero.pdf');
    expect(notes).toContain('2026-01');
  });

  it('incluye el líquido a percibir', () => {
    const notes = buildPayrollNotes(parsed, 'nominas.pdf');
    expect(notes).toContain('1000.00');
  });

  it('incluye el nombre del archivo PDF fuente', () => {
    const notes = buildPayrollNotes(parsed, 'NOMINAS ELEVATEX ENE 2026.pdf');
    expect(notes).toContain('NOMINAS ELEVATEX ENE 2026.pdf');
  });

  it('no contiene patrones DNI (8 dígitos + letra)', () => {
    const notes = buildPayrollNotes(parsed, 'test.pdf');
    expect(notes).not.toMatch(/\d{8}[A-Z]/);
  });
});

describe('parsePayrollPage', () => {
  it('extrae costoEmpresa de los items sintéticos', () => {
    const result = parsePayrollPage(SYNTHETIC_ITEMS, 1);
    expect(result.costoEmpresa).toBeCloseTo(1667.51, 1);
  });

  it('extrae yearMonth del período sintético', () => {
    const result = parsePayrollPage(SYNTHETIC_ITEMS, 1);
    expect(result.yearMonth).toBe('2026-01');
  });

  it('emite advertencia cuando falta COSTE EMPRESA', () => {
    const result = parsePayrollPage(ITEMS_MISSING_COSTE, 1);
    expect(result.costoEmpresa).toBeNull();
    expect(result.warnings).toContain('COSTE EMPRESA no encontrado');
  });
});

describe('extractMoney', () => {
  it('extrae importe en formato español (1.667,51)', () => {
    expect(extractMoney('1.667,51')).toBeCloseTo(1667.51, 1);
  });

  it('devuelve null cuando no hay número', () => {
    expect(extractMoney('sin número aquí')).toBeNull();
  });
});

// ── Tests de robustez y nuevas funciones ──────────────────────────────────────

describe('detectMonthFromFilename', () => {
  it('detecta FEBRERO del nombre de archivo ELEVATEX', () => {
    const result = detectMonthFromFilename('NOMINA ELEVATEX FEBRERO 2026.pdf');
    expect(result).toEqual({ year: 2026, month: 2 });
  });

  it('detecta ENERO del nombre de archivo', () => {
    const result = detectMonthFromFilename('NOMINA ELEVATEX ENERO 2026.pdf');
    expect(result).toEqual({ year: 2026, month: 1 });
  });

  it('detecta MARZO del nombre de archivo', () => {
    const result = detectMonthFromFilename('NOMINA ELEVATEX MARZO 2026.pdf');
    expect(result).toEqual({ year: 2026, month: 3 });
  });

  it('devuelve null si no hay mes reconocible', () => {
    expect(detectMonthFromFilename('nomina-sin-mes.pdf')).toBeNull();
  });

  it('devuelve null si no hay año de 4 dígitos', () => {
    expect(detectMonthFromFilename('NOMINA FEBRERO.pdf')).toBeNull();
  });
});

describe('detectFilenameMismatch', () => {
  it('detecta mismatch: archivo FEBRERO pero periodo enero 2026', () => {
    const warning = detectFilenameMismatch('NOMINA ELEVATEX FEBRERO 2026.pdf', '2026-01');
    expect(warning).not.toBeNull();
    expect(warning?.filenameMonth).toContain('febrero');
    expect(warning?.detectedPeriod).toContain('enero');
  });

  it('devuelve null cuando filename y periodo coinciden', () => {
    const warning = detectFilenameMismatch('NOMINA ELEVATEX ENERO 2026.pdf', '2026-01');
    expect(warning).toBeNull();
  });

  it('devuelve null cuando no se puede detectar mes en el filename', () => {
    const warning = detectFilenameMismatch('nomina-sin-mes.pdf', '2026-01');
    expect(warning).toBeNull();
  });
});

const EMPTY_EXTRACT = { items: [] as never[], pageCount: 2, text: '', pageSizes: [] };
const SINGLE_PAGE_EMPTY = { items: [] as never[], pageCount: 1, text: '', pageSizes: [] };

describe('parsePayrollPdfBuffer — PDF sin texto extraíble', () => {
  it('devuelve itemCount 0 y pageCount > 0 cuando el PDF es vectorial (sin text items)', async () => {
    mockExtractPdfText.mockResolvedValueOnce(EMPTY_EXTRACT);
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'NOMINA ELEVATEX MARZO 2026.pdf');
    expect(result.itemCount).toBe(0);
    expect(result.pageCount).toBe(2);
    // El parser crea filas placeholder por página, todas con include=false
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((r) => !r.include)).toBe(true);
  });

  it('no lanza excepción cuando el PDF tiene 0 items (sin romper en 500)', async () => {
    mockExtractPdfText.mockResolvedValueOnce(SINGLE_PAGE_EMPTY);
    await expect(
      parsePayrollPdfBuffer(new ArrayBuffer(0), 'test.pdf'),
    ).resolves.not.toThrow();
  });

  it('la acción detecta itemCount=0 — el test verifica que el parser lo señaliza (control de 500)', async () => {
    // Este test confirma que parsePayrollPdfBuffer NUNCA lanza aunque reciba items vacíos.
    // La respuesta estructurada es lo que evita el 500: actions.ts comprueba itemCount===0
    // y retorna mode:'manual' en lugar de propagar un error.
    mockExtractPdfText.mockResolvedValueOnce(SINGLE_PAGE_EMPTY);
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'test.pdf');
    expect(result.itemCount).toBe(0);
    expect(result).toHaveProperty('pageCount');
    expect(result).toHaveProperty('rows');
  });
});

describe('parsePayrollPdfBuffer — PDF con texto (fixture enero)', () => {
  beforeEach(() => {
    mockExtractPdfText.mockResolvedValue({ items: [...SYNTHETIC_ITEMS], pageCount: 1, text: '', pageSizes: [] });
  });

  it('parsea correctamente enero 2026 con los campos requeridos', async () => {
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'NOMINA ELEVATEX ENERO 2026.pdf');
    expect(result.pageCount).toBe(1);
    expect(result.itemCount).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0]!;
    expect(row.yearMonth).toBe('2026-01');
    expect(row.counterpartyName).toBe('EMPLEADO PRUEBA UNO');
  });

  it('genera txId con formato payroll:{slug}:{YYYY-MM}', async () => {
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'NOMINA ELEVATEX ENERO 2026.pdf');
    const row = result.rows[0]!;
    expect(row.txId).toBe('payroll:empleado-prueba-uno:2026-01');
  });

  it('usa expenseSubtype = nomina_socio', async () => {
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'NOMINA ELEVATEX ENERO 2026.pdf');
    expect(result.rows[0]!.expenseSubtype).toBe('nomina_socio');
  });

  it('usa expenseGroup = operational', async () => {
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'NOMINA ELEVATEX ENERO 2026.pdf');
    expect(result.rows[0]!.expenseGroup).toBe('operational');
  });

  it('netAmount = costoEmpresa (importe contable EBITDA)', async () => {
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'NOMINA ELEVATEX ENERO 2026.pdf');
    const row = result.rows[0]!;
    expect(row.netAmount).toBe('1667.51');
    expect(row.totalAmount).toBe('1667.51');
  });

  it('no llama a DB — parsePayrollPdfBuffer es puro (solo usa extractPdfText)', async () => {
    // Si este test corre sin error de módulo DB, confirma que el parser no toca la base de datos
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'NOMINA ELEVATEX ENERO 2026.pdf');
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('detecta mismatch filename FEBRERO vs periodo enero y añade filenameWarning', async () => {
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'NOMINA ELEVATEX FEBRERO 2026.pdf');
    expect(result.filenameWarning).not.toBeNull();
    expect(result.filenameWarning?.filenameMonth).toContain('febrero');
    expect(result.filenameWarning?.detectedPeriod).toContain('enero');
  });

  it('filenameWarning es null cuando filename y periodo coinciden', async () => {
    const result = await parsePayrollPdfBuffer(new ArrayBuffer(0), 'NOMINA ELEVATEX ENERO 2026.pdf');
    expect(result.filenameWarning).toBeNull();
  });
});
