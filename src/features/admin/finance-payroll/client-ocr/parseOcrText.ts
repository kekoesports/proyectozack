/**
 * Parser puro de texto OCR extraído de nóminas ELEVATEX.
 *
 * Recibe el texto crudo de UNA página (un trabajador) y devuelve una
 * `PayrollImportRow` lista para mostrar en el preview del wizard.
 *
 * Importable desde cliente y servidor (sin side-effects, sin imports
 * de env/db/server-only).
 *
 * Mantenido en paralelo con `src/lib/parsers/payrollOcr.ts::ocrTextToPayrollRow`
 * (server) — misma lógica de extracción y misma estructura de retorno.
 *
 * Sin logs con PII: solo retorna estructuras.
 */

import { normalizeAmount } from '@/lib/finance/payroll/manualRow';
import type { PayrollImportRow } from '@/lib/finance/payroll/types';

// ── Constantes ──────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

// "01 MAR 26 al 31 MAR 26" o "01-MAR-26 AL 31-MAR-26"
const PERIOD_RX =
  /(\d{1,2})[\s\-/]+([A-ZÑ]{3,4})[\s\-/]+(\d{2,4})\s+(?:[Aa][Ll]?)\s+(\d{1,2})[\s\-/]+([A-ZÑ]{3,4})[\s\-/]+(\d{2,4})/;

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

function parsePeriodFromText(text: string): string | null {
  const upper = text.toUpperCase();
  const m = PERIOD_RX.exec(upper);
  if (!m || !m[5] || !m[6]) return null;
  const endMonth = MONTH_MAP[m[5]];
  if (!endMonth) return null;
  const n = parseInt(m[6], 10);
  const endYear = n < 100 ? 2000 + n : n;
  return `${endYear}-${String(endMonth).padStart(2, '0')}`;
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
 * `PayrollImportRow` lista para el preview.
 *
 * Si faltan datos obligatorios (trabajador, periodo, coste empresa)
 * la fila se devuelve igualmente con `include=false` y un `warning`,
 * para que el usuario pueda completarla manualmente en el preview.
 */
export function parsePayrollOcrPage(
  pageText: string,
  pageNum: number,
  pdfFileName: string,
): PayrollImportRow {
  const upper = pageText.toUpperCase();

  const employeeName = extractNameFromLines(pageText) ?? '';
  const yearMonth = parsePeriodFromText(upper) ?? 'desconocido';

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

  const missingRequired = !employeeName || costoStr === '0.00' || yearMonth === 'desconocido';

  return {
    page: pageNum,
    include: !missingRequired,
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
    warning: missingRequired ? 'OCR: revisar datos (trabajador, mes/año, coste empresa)' : null,
  };
}
