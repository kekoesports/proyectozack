'server-only';

import { slugifyEmployeeName, makePayrollTxId } from './payrollPdf';
import { normalizeAmount } from '@/lib/finance/payroll/manualRow';
import type { PayrollImportRow } from '@/lib/finance/payroll/types';

export type OcrPayrollResult = {
  readonly rows: PayrollImportRow[];
  readonly pageCount: number;
};

const MONTH_MAP: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

// Matches "01 MAR 26 al 31 MAR 26" or "01-MAR-26 AL 31-MAR-26"
const PERIOD_RX =
  /(\d{1,2})[\s\-/]+([A-ZÑ]{3,4})[\s\-/]+(\d{2,4})\s+(?:[Aa][Ll]?)\s+(\d{1,2})[\s\-/]+([A-ZÑ]{3,4})[\s\-/]+(\d{2,4})/;

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

// Common payroll label words that must not be mistaken for employee names
const PAYROLL_LABEL_WORDS = new Set([
  'TOTAL', 'DEVENGADO', 'DEDUCCIONES', 'EMPRESA', 'LIQUIDO', 'LÍQUIDO',
  'PERCIBIR', 'COSTE', 'COSTO', 'PERIODO', 'PERÍODO', 'CONCEPTO',
  'NOMINA', 'NÓMINA', 'NOMINAS', 'NÓMINAS', 'IRPF',
]);

function extractNameFromLines(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  // First ~8 lines: look for a line with 2+ all-caps words, no digits,
  // no single-char tokens (e.g. "A" in "LIQUIDO A PERCIBIR"), no label words
  for (const line of lines.slice(0, 8)) {
    if (!/^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]{4,}$/.test(line)) continue;
    if (/\d/.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < 2) continue;
    if (words.some((w) => w.length < 3)) continue;
    if (words.some((w) => PAYROLL_LABEL_WORDS.has(w.toUpperCase()))) continue;
    return line.trim();
  }
  // Fallback: TRABAJADOR/A label on same line as name
  const m = /TRABAJADOR(?:\/A)?[:\s]+([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]+)/i.exec(text);
  if (m?.[1]) return m[1].trim();
  return null;
}

export function ocrTextToPayrollRow(
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

  const irpfMatch = /I\.R\.P\.F\.[:\s]*([\d,]+)/.exec(upper);
  const irpfStr = irpfMatch?.[1] ? irpfMatch[1].replace(',', '.') : '';

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
  noteParts.push('OCR — revisar');
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

// Nóminas ELEVATEX tienen 1-2 páginas. Limitar a 3 evita timeouts en PDFs malformados.
const MAX_OCR_PAGES = 3;

export async function ocrPayrollPdf(
  buffer: ArrayBuffer,
  pdfFileName: string,
): Promise<OcrPayrollResult> {
  // Dynamic imports: WASM modules must not be evaluated at module parse time
  console.log('[ocr-payroll] step=init_mupdf');
  const mupdf = await import('mupdf');
  console.log('[ocr-payroll] step=init_tesseract');
  const { createWorker } = await import('tesseract.js');

  // Render PDF pages to PNG at 3× scale for OCR accuracy
  const uint8 = new Uint8Array(buffer);
  console.log('[ocr-payroll] step=open_doc');
  const doc = mupdf.Document.openDocument(uint8, 'application/pdf');
  const pageCount = doc.countPages();
  const pagesToProcess = Math.min(pageCount, MAX_OCR_PAGES);
  console.log('[ocr-payroll] step=pages_ready', { pageCount, pagesToProcess });

  const pngBuffers: Buffer[] = [];
  for (let i = 0; i < pagesToProcess; i++) {
    console.log('[ocr-payroll] step=render_page', { page: i + 1, of: pagesToProcess });
    const page = doc.loadPage(i);
    const matrix = mupdf.Matrix.scale(3, 3);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
    pngBuffers.push(Buffer.from(pixmap.asPNG()));
    pixmap.destroy();
    page.destroy();
  }
  doc.destroy();

  // Tesseract LSTM, Spanish + English — traineddata files at process.cwd()
  console.log('[ocr-payroll] step=create_worker', { langPath: process.cwd() });
  const worker = await createWorker(['spa', 'eng'], 1, {
    langPath: process.cwd(),
    logger: () => {},
  });

  const rows: PayrollImportRow[] = [];
  for (let i = 0; i < pngBuffers.length; i++) {
    const pageNum = i + 1;
    const png = pngBuffers[i];
    if (!png) continue;
    console.log('[ocr-payroll] step=recognize_page', { page: pageNum });
    const { data } = await worker.recognize(png);
    // data.text contains PII — never log it
    rows.push(ocrTextToPayrollRow(data.text, pageNum, pdfFileName));
  }

  console.log('[ocr-payroll] step=terminate_worker');
  await worker.terminate();

  return { rows, pageCount };
}
