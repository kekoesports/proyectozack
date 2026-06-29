'server-only';

import { extractPdfText, groupIntoLines } from './pdf';
import type { PdfTextItem } from './pdf';
import { parseEsNumber } from './common';
import { findLabelItem, findNearValue } from './pdfHeuristics';
import type { ParsedPayrollPage, PayrollImportRow, FilenameWarning } from '@/lib/finance/payroll/types';

const MONTH_MAP: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

const FILENAME_MONTH_MAP: Record<string, number> = {
  ENE: 1, ENERO: 1,
  FEB: 2, FEBRERO: 2,
  MAR: 3, MARZO: 3,
  ABR: 4, ABRIL: 4,
  MAY: 5, MAYO: 5,
  JUN: 6, JUNIO: 6,
  JUL: 7, JULIO: 7,
  AGO: 8, AGOSTO: 8,
  SEP: 9, SEPTIEMBRE: 9,
  OCT: 10, OCTUBRE: 10,
  NOV: 11, NOVIEMBRE: 11,
  DIC: 12, DICIEMBRE: 12,
};

const MONTH_NAMES_ES: Record<number, string> = {
  1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril', 5: 'mayo', 6: 'junio',
  7: 'julio', 8: 'agosto', 9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre',
};

function normStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

export function detectMonthFromFilename(filename: string): { year: number; month: number } | null {
  const upper = filename.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const yearMatch = /\b(20\d{2})\b/.exec(upper);
  if (!yearMatch?.[1]) return null;
  const year = parseInt(yearMatch[1], 10);
  // Match longest names first to avoid FEB matching inside FEBRERO
  const names = Object.keys(FILENAME_MONTH_MAP).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (new RegExp(`\\b${name}\\b`).test(upper)) {
      const month = FILENAME_MONTH_MAP[name];
      if (month !== undefined) return { year, month };
    }
  }
  return null;
}

export function detectFilenameMismatch(filename: string, yearMonth: string): FilenameWarning | null {
  const fileDate = detectMonthFromFilename(filename);
  if (!fileDate) return null;
  const parts = yearMonth.split('-');
  const ymYear = parseInt(parts[0] ?? '0', 10);
  const ymMonth = parseInt(parts[1] ?? '0', 10);
  if (fileDate.year === ymYear && fileDate.month === ymMonth) return null;
  return {
    filenameMonth: `${MONTH_NAMES_ES[fileDate.month] ?? String(fileDate.month)} ${fileDate.year}`,
    detectedPeriod: `${MONTH_NAMES_ES[ymMonth] ?? String(ymMonth)} ${ymYear}`,
  };
}

// Matches "01 OCT 25 a 31 OCT 25" or "01-OCT-25 AL 31-OCT-25" style periods
const PERIOD_RX =
  /(\d{1,2})[\s\-/]+([A-ZÑ]{3,4})[\s\-/]+(\d{2,4})\s+(?:[Aa][Ll]?)\s+(\d{1,2})[\s\-/]+([A-ZÑ]{3,4})[\s\-/]+(\d{2,4})/;

// Matches Spanish monetary amounts like 1.667,51 or 350,00
const AMOUNT_RX = /(?:\d{1,3}(?:\.\d{3})+|\d+),\d{1,2}/;

function parseYear(y: string): number {
  const n = parseInt(y, 10);
  return n < 100 ? 2000 + n : n;
}

function parsePeriod(text: string): { yearMonth: string; issueDate: string } | null {
  const m = PERIOD_RX.exec(text.toUpperCase());
  if (!m || !m[5] || !m[6]) return null;
  const endMonth = MONTH_MAP[m[5]];
  if (!endMonth) return null;
  const endYear = parseYear(m[6]);
  const yearMonth = `${endYear}-${String(endMonth).padStart(2, '0')}`;
  return { yearMonth, issueDate: `${yearMonth}-01` };
}

export function slugifyEmployeeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function makePayrollTxId(slug: string, yearMonth: string): string {
  return `payroll:${slug}:${yearMonth}`;
}

export function extractMoney(str: string): number | null {
  const m = AMOUNT_RX.exec(str);
  if (!m || !m[0]) return null;
  return parseEsNumber(m[0]);
}

function amountPredicate(str: string): string | null {
  const n = extractMoney(str);
  return n != null ? n.toFixed(2) : null;
}

export function buildPayrollNotes(parsed: ParsedPayrollPage, pdfFileName: string): string {
  const parts: string[] = [];
  if (parsed.yearMonth) parts.push(`Período: ${parsed.yearMonth}`);
  if (parsed.liquidoPercibir != null) parts.push(`Líquido: ${parsed.liquidoPercibir.toFixed(2)}`);
  if (parsed.totalDevengado != null) parts.push(`T.Devengado: ${parsed.totalDevengado.toFixed(2)}`);
  if (parsed.totalDeducciones != null) parts.push(`T.Deducciones: ${parsed.totalDeducciones.toFixed(2)}`);
  if (parsed.irpfPct != null) parts.push(`IRPF: ${parsed.irpfPct}%`);
  parts.push(`PDF: ${pdfFileName}`);
  return parts.join(' | ');
}

export function parsePayrollPage(
  pageItems: readonly PdfTextItem[],
  pageNum: number,
): ParsedPayrollPage {
  const warnings: string[] = [];

  // COSTE EMPRESA
  const COSTE_LABELS = ['coste empresa', 'coste de empresa', 'costo empresa', 'coste total empresa'];
  const costoLabel = findLabelItem(pageItems, COSTE_LABELS);
  let costoEmpresa: number | null = null;
  if (costoLabel) {
    const hit = findNearValue(pageItems, costoLabel, amountPredicate);
    if (hit) costoEmpresa = parseEsNumber(hit.value);
  }
  // Fallback: label may be split across multiple PDF items — search grouped line text
  if (costoEmpresa == null) {
    const lines = groupIntoLines(pageItems);
    for (const line of lines) {
      const normLine = normStr(line.text);
      if (COSTE_LABELS.some((l) => normLine.includes(l))) {
        // Use the rightmost item on the label line as anchor
        const anchor = [...line.items].sort((a, b) => b.x - a.x)[0];
        if (anchor) {
          const hit = findNearValue(pageItems, anchor, amountPredicate);
          if (hit) { costoEmpresa = parseEsNumber(hit.value); break; }
        }
      }
    }
  }
  if (costoEmpresa == null) warnings.push('COSTE EMPRESA no encontrado');

  // LIQUIDO A PERCIBIR
  const LIQUIDO_LABELS = ['liquido a percibir', 'líquido a percibir', 'liquido percibir', 'liquido'];
  const liquidoLabel = findLabelItem(pageItems, LIQUIDO_LABELS);
  let liquidoPercibir: number | null = null;
  if (liquidoLabel) {
    const hit = findNearValue(pageItems, liquidoLabel, amountPredicate);
    if (hit) liquidoPercibir = parseEsNumber(hit.value);
  }
  if (liquidoPercibir == null) {
    const lines = groupIntoLines(pageItems);
    for (const line of lines) {
      const normLine = normStr(line.text);
      if (LIQUIDO_LABELS.some((l) => normLine.includes(l))) {
        const anchor = [...line.items].sort((a, b) => b.x - a.x)[0];
        if (anchor) {
          const hit = findNearValue(pageItems, anchor, amountPredicate);
          if (hit) { liquidoPercibir = parseEsNumber(hit.value); break; }
        }
      }
    }
  }

  // T.DEVENGADO
  const devengadoLabel = findLabelItem(pageItems, [
    't.devengado', 'total devengado', 't. devengado',
  ]);
  let totalDevengado: number | null = null;
  if (devengadoLabel) {
    const hit = findNearValue(pageItems, devengadoLabel, amountPredicate);
    if (hit) totalDevengado = parseEsNumber(hit.value);
  }

  // T.A DEDUCIR
  const deducirLabel = findLabelItem(pageItems, [
    't.a deducir', 'total a deducir', 't. a deducir', 'total deducciones',
  ]);
  let totalDeducciones: number | null = null;
  if (deducirLabel) {
    const hit = findNearValue(pageItems, deducirLabel, amountPredicate);
    if (hit) totalDeducciones = parseEsNumber(hit.value);
  }

  // IRPF %
  const irpfLabel = findLabelItem(pageItems, [
    'irpf', '% irpf', 'retencion irpf', 'retención irpf',
  ]);
  let irpfPct: number | null = null;
  if (irpfLabel) {
    const pctPredicate = (str: string): string | null => {
      const n = parseEsNumber(str.replace(',', '.').replace('.', ''));
      // Use extractMoney but validate it's a reasonable IRPF percentage
      const money = extractMoney(str);
      if (money != null && money >= 0 && money <= 50) return money.toFixed(2);
      return n != null && n >= 0 && n <= 50 ? n.toFixed(2) : null;
    };
    const hit = findNearValue(pageItems, irpfLabel, pctPredicate);
    if (hit) irpfPct = parseEsNumber(hit.value.replace(',', '.'));
  }

  // PERIODO — tries in order: label→near, each item, grouped lines, PERIODO label in lines
  let yearMonth: string | null = null;
  let issueDate: string | null = null;

  const periodoLabel = findLabelItem(pageItems, ['periodo', 'período']);
  if (periodoLabel) {
    const periodPredicate = (str: string): string | null => {
      const p = parsePeriod(str);
      return p ? p.yearMonth : null;
    };
    const hit = findNearValue(pageItems, periodoLabel, periodPredicate);
    if (hit) {
      const p = parsePeriod(hit.item.str);
      if (p) { yearMonth = p.yearMonth; issueDate = p.issueDate; }
    }
  }

  // Fallback: scan each item individually
  if (!yearMonth) {
    for (const item of pageItems) {
      const p = parsePeriod(item.str);
      if (p) { yearMonth = p.yearMonth; issueDate = p.issueDate; break; }
    }
  }

  // Fallback: scan grouped line texts (catches periods split across PDF items)
  if (!yearMonth) {
    const lines = groupIntoLines(pageItems);
    for (const line of lines) {
      const p = parsePeriod(line.text);
      if (p) { yearMonth = p.yearMonth; issueDate = p.issueDate; break; }
    }
  }

  // Fallback: look for "PERIODO" label in lines (split label), then scan neighbor items
  if (!yearMonth) {
    const lines = groupIntoLines(pageItems);
    for (const line of lines) {
      if (normStr(line.text).startsWith('periodo')) {
        // The period value may be on the same line or the next item after the label
        const p = parsePeriod(line.text);
        if (p) { yearMonth = p.yearMonth; issueDate = p.issueDate; break; }
        // Try items after the last item of this line
        const anchor = [...line.items].sort((a, b) => b.x - a.x)[0];
        if (anchor) {
          const nearItems = pageItems
            .filter((i) => i !== anchor && i.y >= anchor.y - 2)
            .sort((a, b) => {
              const dx = a.x - (anchor.x + anchor.width);
              const dy = a.y - anchor.y;
              return Math.hypot(Math.max(dx, 0), Math.abs(dy) * 1.5) -
                     Math.hypot(Math.max(b.x - (anchor.x + anchor.width), 0), Math.abs(b.y - anchor.y) * 1.5);
            });
          for (const ni of nearItems.slice(0, 5)) {
            const p2 = parsePeriod(ni.str);
            if (p2) { yearMonth = p2.yearMonth; issueDate = p2.issueDate; break; }
          }
        }
        if (yearMonth) break;
      }
    }
  }

  if (!yearMonth) warnings.push('PERIODO no encontrado');

  // EMPLOYEE NAME — look for TRABAJADOR / NOMBRE labels
  const nameLabel = findLabelItem(pageItems, [
    'trabajador', 'nombre y apellidos', 'nombre trabajador',
  ]);
  let employeeName: string | null = null;
  if (nameLabel) {
    const namePredicate = (str: string): string | null => {
      const trimmed = str.trim();
      if (trimmed.length < 3) return null;
      if (/^\d/.test(trimmed)) return null;
      // Avoid DNI/NIF patterns (8 digits + letter, or letter + digits)
      if (/^[A-Z0-9]{8,9}$/.test(trimmed.toUpperCase())) return null;
      if (/^[A-ZÁÉÍÓÚÑÜ\s\-]+$/i.test(trimmed) && trimmed.length >= 3) return trimmed;
      return null;
    };
    const hit = findNearValue(pageItems, nameLabel, namePredicate);
    if (hit) employeeName = hit.value;
  }

  return {
    page: pageNum,
    employeeName,
    costoEmpresa,
    liquidoPercibir,
    yearMonth,
    issueDate,
    irpfPct,
    totalDevengado,
    totalDeducciones,
    warnings,
  };
}

export async function parsePayrollPdfBuffer(
  buffer: ArrayBuffer | Uint8Array,
  pdfFileName: string,
): Promise<{ rows: PayrollImportRow[]; pageCount: number; itemCount: number; filenameWarning: FilenameWarning | null }> {
  const extract = await extractPdfText(buffer);
  const rows: PayrollImportRow[] = [];

  for (let pageNum = 1; pageNum <= extract.pageCount; pageNum++) {
    const pageItems = extract.items.filter((item) => item.page === pageNum);
    const parsed = parsePayrollPage(pageItems, pageNum);

    const missingRequired = parsed.costoEmpresa == null || parsed.yearMonth == null;
    const nameForSlug = parsed.employeeName ?? `trabajador-${pageNum}`;
    const slug = slugifyEmployeeName(nameForSlug);
    const ym = parsed.yearMonth ?? 'desconocido';
    const txId = makePayrollTxId(slug, ym);
    const costoStr = parsed.costoEmpresa != null ? parsed.costoEmpresa.toFixed(2) : '0.00';
    const isoDate = parsed.issueDate ?? `${ym}-01`;
    const concept = parsed.employeeName
      ? `Nómina ${parsed.employeeName} ${ym}`
      : `Nómina pág. ${pageNum} ${ym}`;

    rows.push({
      page: pageNum,
      include: !missingRequired,
      slug,
      yearMonth: ym,
      txId,
      counterpartyName: parsed.employeeName ?? '',
      concept,
      issueDate: isoDate,
      netAmount: costoStr,
      totalAmount: costoStr,
      vatPct: '0.00',
      withholdingPct: '0.00',
      expenseGroup: 'operational',
      expenseSubtype: 'nomina_socio',
      status: 'pagada',
      notes: buildPayrollNotes(parsed, pdfFileName),
      warning: missingRequired ? parsed.warnings.join('; ') : null,
    });
  }

  const firstPeriod = rows.find((r) => r.yearMonth !== 'desconocido')?.yearMonth ?? null;
  const filenameWarning = firstPeriod ? detectFilenameMismatch(pdfFileName, firstPeriod) : null;

  return { rows, pageCount: extract.pageCount, itemCount: extract.items.length, filenameWarning };
}
