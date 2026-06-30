/**
 * Parser puro de texto OCR extraído de nóminas ELEVATEX.
 *
 * Recibe el texto crudo de UNA página (un trabajador) y devuelve:
 *   - `row`: PayrollImportRow lista para el preview del wizard
 *   - `diagnostic`: metadatos seguros (sin PII) para logging y troubleshooting
 *
 * Importable desde cliente y servidor (sin side-effects, sin imports
 * de env/db/server-only).
 *
 * Mantenido en paralelo con `src/lib/parsers/payrollOcr.ts::ocrTextToPayrollRow`
 * (server, hoy en kill-switch detrás de PAYROLL_OCR_ENABLED).
 */

import { normalizeAmount } from '@/lib/finance/payroll/manualRow';
import type { PayrollImportRow } from '@/lib/finance/payroll/types';

// ── Tipos públicos ──────────────────────────────────────────────────────────

export type MissingField = 'employee' | 'period' | 'costCompany';

export type PayrollOcrRowDiagnostic = {
  readonly hasEmployeeName: boolean;
  readonly hasPeriod: boolean;
  readonly hasCostCompany: boolean;
  /** Token de mes encontrado por el parser (MAR, MARZO, etc.) o null. */
  readonly monthTokenDetected: string | null;
  readonly validationMissingFields: readonly MissingField[];
};

export type PayrollOcrParseResult = {
  readonly row: PayrollImportRow;
  readonly diagnostic: PayrollOcrRowDiagnostic;
};

// ── Constantes ──────────────────────────────────────────────────────────────

/**
 * Mapa de tokens de mes (uppercase) → número de mes (1-12).
 * Acepta abreviaturas españolas estándar (3-4 chars) y nombres completos.
 * El parser tolera además punto final ("MAR.") y mayúscula/minúscula.
 */
const MONTH_MAP_EXT: Record<string, number> = {
  ENE: 1,  ENERO: 1,
  FEB: 2,  FEBRERO: 2,
  MAR: 3,  MARZO: 3,
  ABR: 4,  ABRIL: 4,
  MAY: 5,  MAYO: 5,
  JUN: 6,  JUNIO: 6,
  JUL: 7,  JULIO: 7,
  AGO: 8,  AGOSTO: 8,
  SEP: 9,  SEPT: 9, SEPTIEMBRE: 9,
  OCT: 10, OCTUBRE: 10,
  NOV: 11, NOVIEMBRE: 11,
  DIC: 12, DICIEMBRE: 12,
};

// Ordenar tokens por longitud descendente para que el regex matchee
// "MARZO" antes que "MAR", "SEPTIEMBRE" antes que "SEPT", etc.
const MONTH_TOKENS_SORTED = Object.keys(MONTH_MAP_EXT).sort((a, b) => b.length - a.length);
const MONTHS_ALT = MONTH_TOKENS_SORTED.join('|');

const PAYROLL_LABEL_WORDS = new Set([
  'TOTAL', 'DEVENGADO', 'DEDUCCIONES', 'EMPRESA', 'LIQUIDO', 'LÍQUIDO',
  'PERCIBIR', 'COSTE', 'COSTO', 'PERIODO', 'PERÍODO', 'CONCEPTO',
  'NOMINA', 'NÓMINA', 'NOMINAS', 'NÓMINAS', 'IRPF',
]);

// ── Helpers puros ──────────────────────────────────────────────────────────

function slugifyEmployeeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function makePayrollTxId(slug: string, yearMonth: string): string {
  return `payroll:${slug}:${yearMonth}`;
}

function yearFromToken(token: string): number {
  const n = parseInt(token, 10);
  return n < 100 ? 2000 + n : n;
}

/**
 * Parsea el periodo de la nómina y devuelve { yearMonth, monthToken }.
 *
 * Tres estrategias en cascada:
 *
 *   A) Rango completo: "01 MAR 26 a 31 MAR 26", "01-MAR-26 AL 31-MAR-26"
 *      Tolera saltos de línea entre las dos fechas (whitespace normalizado).
 *
 *   B) Mes + año: "MAR 26", "MAR. 26", "MARZO 2026", "MARZO.2026"
 *
 *   C) Formato narrativo: "01 DE MARZO DE 2026"
 *
 * Devuelve { yearMonth: null, monthToken: null } si ninguna estrategia matchea.
 */
function parsePeriodFromText(text: string): { yearMonth: string | null; monthToken: string | null } {
  // Normalizar whitespace (incluye saltos de línea) a espacios simples.
  // Permite que la estrategia A tolere saltos de línea entre fecha inicial y final.
  const upper = text.toUpperCase().replace(/\s+/g, ' ');

  // ── Estrategia A: rango completo ──────────────────────────────────────
  const RANGE_RX = new RegExp(
    `(\\d{1,2})[\\s\\-/]+(${MONTHS_ALT})\\.?[\\s\\-/]+(\\d{2,4})\\s+(?:[Aa][Ll]?)\\s+(\\d{1,2})[\\s\\-/]+(${MONTHS_ALT})\\.?[\\s\\-/]+(\\d{2,4})`,
  );
  const mRange = RANGE_RX.exec(upper);
  if (mRange && mRange[5] && mRange[6]) {
    const endMonth = MONTH_MAP_EXT[mRange[5]];
    if (endMonth) {
      const year = yearFromToken(mRange[6]);
      return {
        yearMonth: `${year}-${String(endMonth).padStart(2, '0')}`,
        monthToken: mRange[5],
      };
    }
  }

  // ── Estrategia B: mes + año (con o sin punto, abreviatura o nombre) ──
  // Buscar dentro del contexto "PERIODO ..." si existe para evitar matches falsos
  // en otras partes del documento.
  const PERIODO_CONTEXT_RX = new RegExp(
    `PER[IÍ]ODO[^A-ZÑ\\d]{0,20}(${MONTHS_ALT})\\.?\\s+(?:DE\\s+)?(\\d{2,4})`,
  );
  const mPerCtx = PERIODO_CONTEXT_RX.exec(upper);
  if (mPerCtx && mPerCtx[1] && mPerCtx[2]) {
    const month = MONTH_MAP_EXT[mPerCtx[1]];
    if (month) {
      const year = yearFromToken(mPerCtx[2]);
      return {
        yearMonth: `${year}-${String(month).padStart(2, '0')}`,
        monthToken: mPerCtx[1],
      };
    }
  }

  // También aceptamos "MES MARZO 2026" o equivalente sin "PERIODO" cerca.
  const SINGLE_RX = new RegExp(`\\b(${MONTHS_ALT})\\.?\\s+(?:DE\\s+)?(\\d{2,4})\\b`);
  const mSingle = SINGLE_RX.exec(upper);
  if (mSingle && mSingle[1] && mSingle[2]) {
    const month = MONTH_MAP_EXT[mSingle[1]];
    if (month) {
      const year = yearFromToken(mSingle[2]);
      return {
        yearMonth: `${year}-${String(month).padStart(2, '0')}`,
        monthToken: mSingle[1],
      };
    }
  }

  // ── Estrategia C: formato narrativo "01 DE MARZO DE 2026" ────────────
  const DE_RX = new RegExp(`\\d{1,2}\\s+DE\\s+(${MONTHS_ALT})\\.?\\s+DE\\s+(\\d{2,4})`);
  const mDe = DE_RX.exec(upper);
  if (mDe && mDe[1] && mDe[2]) {
    const month = MONTH_MAP_EXT[mDe[1]];
    if (month) {
      const year = yearFromToken(mDe[2]);
      return {
        yearMonth: `${year}-${String(month).padStart(2, '0')}`,
        monthToken: mDe[1],
      };
    }
  }

  return { yearMonth: null, monthToken: null };
}

function extractNameFromLines(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  // Primeras ~8 líneas: línea con ≥2 palabras en MAYÚSCULAS, sin dígitos,
  // sin tokens de 1-2 chars (e.g. "A" en "LIQUIDO A PERCIBIR"), sin etiquetas
  for (const line of lines.slice(0, 8)) {
    if (!/^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]{4,}$/.test(line)) continue;
    if (/\d/.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < 2) continue;
    if (words.some((w) => w.length < 3)) continue;
    if (words.some((w) => PAYROLL_LABEL_WORDS.has(w.toUpperCase()))) continue;
    return line.trim();
  }
  // Fallback: "TRABAJADOR/A NOMBRE" en la misma línea
  const m = /TRABAJADOR(?:\/A)?[:\s]+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]+)/i.exec(text);
  if (m?.[1]) return m[1].trim();
  return null;
}

// ── Función principal ───────────────────────────────────────────────────────

/**
 * Parsea texto OCR de UNA página de nómina ELEVATEX y devuelve una
 * `PayrollImportRow` lista para el preview + un objeto `diagnostic` con
 * metadatos seguros (sin PII) para logging.
 */
export function parsePayrollOcrPage(
  pageText: string,
  pageNum: number,
  pdfFileName: string,
): PayrollOcrParseResult {
  const upper = pageText.toUpperCase();

  const employeeName = extractNameFromLines(pageText) ?? '';
  const periodResult = parsePeriodFromText(pageText);
  const yearMonth = periodResult.yearMonth ?? 'desconocido';

  const costoMatch = /COSTE EMPRESA[:\s]+([\d.,]+)/.exec(upper);
  const costoStr = costoMatch?.[1] ? normalizeAmount(costoMatch[1]) : '0.00';

  const liquidoMatch = /L[IÍ]QUIDO A PERCIBIR[\r\n\s]+([\d.,]+)/.exec(upper);
  const liquidoStr = liquidoMatch?.[1] ? normalizeAmount(liquidoMatch[1]) : '';

  const irpfMatch = /I\.R\.P\.F\.[:\s]*([\d,]+)|IRPF[:\s]+([\d.,]+)/.exec(upper);
  const irpfRaw = irpfMatch?.[1] ?? irpfMatch?.[2];
  const irpfStr = irpfRaw ? irpfRaw.replace(/\./g, '').replace(',', '.') : '';

  const devengadoMatch = /T\.?\s*DEVENGADO[:\s]*([\d.,]+)/.exec(upper);
  const devengadoStr = devengadoMatch?.[1] ? normalizeAmount(devengadoMatch[1]) : '';

  const deduccionesMatch = /T\.?\s*(?:DEDUCCIONES|A DEDUCIR)[:\s]*([\d.,]+)/.exec(upper);
  const deduccionesStr = deduccionesMatch?.[1] ? normalizeAmount(deduccionesMatch[1]) : '';

  const slug = employeeName ? slugifyEmployeeName(employeeName) : `trabajador-${pageNum}`;
  const txId = makePayrollTxId(slug, yearMonth);
  const isoDate = yearMonth !== 'desconocido' ? `${yearMonth}-01` : new Date().toISOString().slice(0, 10);
  const concept = employeeName
    ? `Nómina ${employeeName} ${yearMonth}`
    : `Nómina pág. ${pageNum} ${yearMonth}`;

  const noteParts: string[] = [];
  if (yearMonth !== 'desconocido') noteParts.push(`Período: ${yearMonth}`);
  if (costoStr !== '0.00') noteParts.push(`Coste empresa: ${costoStr}`);
  if (liquidoStr) noteParts.push(`Líquido: ${liquidoStr}`);
  if (devengadoStr) noteParts.push(`T.Devengado: ${devengadoStr}`);
  if (deduccionesStr) noteParts.push(`T.Deducciones: ${deduccionesStr}`);
  if (irpfStr) noteParts.push(`IRPF: ${irpfStr}%`);
  noteParts.push('OCR navegador — revisar');
  noteParts.push(`PDF: ${pdfFileName}`);

  // Validación: campos obligatorios para que la fila sea importable.
  const hasEmployeeName  = employeeName.length > 0;
  const hasPeriod        = yearMonth !== 'desconocido';
  const hasCostCompany   = costoStr !== '0.00';

  const validationMissingFields: MissingField[] = [];
  if (!hasEmployeeName) validationMissingFields.push('employee');
  if (!hasPeriod)       validationMissingFields.push('period');
  if (!hasCostCompany)  validationMissingFields.push('costCompany');

  const row: PayrollImportRow = {
    page: pageNum,
    include: validationMissingFields.length === 0,
    slug,
    yearMonth,
    txId,
    counterpartyName: employeeName,
    concept,
    issueDate: isoDate,
    netAmount: costoStr,
    totalAmount: costoStr,
    vatPct: '0.00',
    withholdingPct: '0.00',
    expenseGroup: 'operational',
    expenseSubtype: 'nomina_socio',
    status: 'pagada',
    notes: noteParts.join(' | '),
    warning: validationMissingFields.length > 0
      ? `OCR: revisar datos (${validationMissingFields.map((f) => f === 'employee' ? 'trabajador' : f === 'period' ? 'mes/año' : 'coste empresa').join(', ')})`
      : null,
  };

  const diagnostic: PayrollOcrRowDiagnostic = {
    hasEmployeeName,
    hasPeriod,
    hasCostCompany,
    monthTokenDetected: periodResult.monthToken,
    validationMissingFields,
  };

  return { row, diagnostic };
}
