import type { PdfTextItem, PdfExtract } from './pdf';
import { groupIntoLines } from './pdf';
import { parseAnyDate, parseEsNumber } from './common';
import type { InvoiceDraft } from '@/lib/schemas/invoiceDraft';

export type Bbox = {
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type ParsedRegions = Partial<Record<keyof InvoiceDraft, Bbox>>;

export type ParsedPdfResult = {
  readonly draft: Partial<InvoiceDraft>;
  readonly regions: ParsedRegions;
  readonly warnings: readonly string[];
};

// ---------- Spanish NIF / NIE / CIF validation ----------

const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

const DNI_RX = /^(\d{8})([A-Z])$/;
const NIE_RX = /^([XYZ])(\d{7})([A-Z])$/;
const CIF_RX = /^([ABCDEFGHJNPQRSUVW])(\d{7})([\dA-J])$/;

function validateDni(candidate: string): boolean {
  const m = DNI_RX.exec(candidate);
  if (!m || !m[1] || !m[2]) return false;
  const num = Number.parseInt(m[1], 10);
  return NIF_LETTERS[num % 23] === m[2];
}

function validateNie(candidate: string): boolean {
  const m = NIE_RX.exec(candidate);
  if (!m || !m[1] || !m[2] || !m[3]) return false;
  const prefix: Record<string, string> = { X: '0', Y: '1', Z: '2' };
  const num = Number.parseInt(prefix[m[1]] + m[2], 10);
  return NIF_LETTERS[num % 23] === m[3];
}

function validateCif(candidate: string): boolean {
  const m = CIF_RX.exec(candidate);
  if (!m || !m[1] || !m[2] || !m[3]) return false;
  const digits = m[2];
  let evenSum = 0;
  let oddSum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    const d = Number.parseInt(digits[i] ?? '0', 10);
    if (i % 2 === 0) {
      // odd position in human (1st, 3rd...)
      const doubled = d * 2;
      oddSum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      evenSum += d;
    }
  }
  const total = evenSum + oddSum;
  const control = (10 - (total % 10)) % 10;
  const controlLetter = 'JABCDEFGHI'[control];
  const last = m[3];
  const firstLetter = m[1];
  // Some CIF letters require a digit, others a letter, some accept either.
  if ('KPQS'.includes(firstLetter)) return last === controlLetter;
  if ('ABEH'.includes(firstLetter)) return last === String(control);
  return last === String(control) || last === controlLetter;
}

export function isValidNif(raw: string): boolean {
  const candidate = raw.replace(/[\s-]/g, '').toUpperCase();
  return validateDni(candidate) || validateNie(candidate) || validateCif(candidate);
}

// Candidate NIF strings: 8-9 alphanumerics, with optional leading letter and trailing letter/digit.
const NIF_CANDIDATE_RX = /\b([A-Z]?\d{7,8}[A-Z0-9]?)\b/gi;

export function findNifs(items: readonly PdfTextItem[]): readonly { readonly value: string; readonly item: PdfTextItem }[] {
  const out: { value: string; item: PdfTextItem }[] = [];
  for (const item of items) {
    const normalized = item.str.toUpperCase();
    const matches = normalized.matchAll(NIF_CANDIDATE_RX);
    for (const m of matches) {
      const candidate = m[1]?.replace(/[\s-]/g, '') ?? '';
      if (candidate && isValidNif(candidate)) out.push({ value: candidate, item });
    }
  }
  return out;
}

// ---------- Date / amount candidates in items ----------

const DATE_RX = /\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
const AMOUNT_RX = /(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})|(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})|\d+(?:[,.]\d{1,2})/g;

// ---------- Near-label search ----------

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function distance(a: PdfTextItem, b: PdfTextItem): number {
  if (a.page !== b.page) return Number.POSITIVE_INFINITY;
  const dx = b.x - (a.x + a.width);
  const dy = b.y - a.y;
  // Reward items to the right on the same line, then items below.
  return Math.hypot(Math.max(dx, 0), Math.abs(dy) * 1.5);
}

/**
 * Given a list of items, find the first item whose string contains one of the labels
 * (normalized, case-insensitive). Returns the label item itself.
 */
export function findLabelItem(
  items: readonly PdfTextItem[],
  labels: readonly string[],
): PdfTextItem | null {
  const normLabels = labels.map(normalizeText);
  for (const item of items) {
    const norm = normalizeText(item.str);
    if (normLabels.some((l) => norm.includes(l))) return item;
  }
  return null;
}

/**
 * Returns the closest item to the right or below `anchor` whose text matches `predicate`.
 */
export function findNearValue(
  items: readonly PdfTextItem[],
  anchor: PdfTextItem,
  predicate: (str: string) => string | null,
): { readonly item: PdfTextItem; readonly value: string } | null {
  let best: { item: PdfTextItem; value: string; dist: number } | null = null;
  for (const item of items) {
    if (item === anchor) continue;
    if (item.page !== anchor.page) continue;
    // Must be at the same height or below, and to the right or below.
    if (item.y < anchor.y - 2) continue;
    const value = predicate(item.str);
    if (!value) continue;
    const d = distance(anchor, item);
    if (!Number.isFinite(d)) continue;
    if (!best || d < best.dist) best = { item, value, dist: d };
  }
  return best ? { item: best.item, value: best.value } : null;
}

function toBbox(item: PdfTextItem): Bbox {
  return { page: item.page, x: item.x, y: item.y, width: item.width, height: item.height };
}

// ---------- Label groups ----------

const TOTAL_LABELS = ['total factura', 'total a pagar', 'importe total', 'total'];
const NET_LABELS = ['base imponible', 'subtotal', 'base'];
const VAT_LABELS = ['iva', 'i.v.a.', 'vat'];
const DATE_LABELS = ['fecha de emision', 'fecha emision', 'fecha factura', 'fecha'];
const NUMBER_LABELS = ['nº factura', 'no. factura', 'n. factura', 'numero factura', 'invoice number', 'factura nº', 'factura n'];

// ---------- Main entrypoint ----------

type ParseOptions = {
  readonly template?: {
    readonly regions: ParsedRegions;
    readonly issuerNif: string;
    readonly issuerName: string | null;
  };
};

function itemInBbox(item: PdfTextItem, box: Bbox, slack = 2): boolean {
  if (item.page !== box.page) return false;
  return (
    item.x >= box.x - slack &&
    item.x <= box.x + box.width + slack &&
    item.y >= box.y - slack &&
    item.y <= box.y + box.height + slack
  );
}

function firstMatchInBbox(
  items: readonly PdfTextItem[],
  box: Bbox,
  predicate: (s: string) => string | null,
): { readonly item: PdfTextItem; readonly value: string } | null {
  for (const item of items) {
    if (!itemInBbox(item, box)) continue;
    const v = predicate(item.str);
    if (v) return { item, value: v };
  }
  return null;
}

export function parseInvoicePdf(extract: PdfExtract, options: ParseOptions = {}): ParsedPdfResult {
  const { items } = extract;
  const warnings: string[] = [];
  const regions: ParsedRegions = {};
  const draft: Partial<InvoiceDraft> = { source: 'pdf-text' };

  // ---- NIF ----
  let issuerNif: string | undefined;
  let issuerName: string | undefined;

  if (options.template?.issuerNif) {
    issuerNif = options.template.issuerNif;
    issuerName = options.template.issuerName ?? undefined;
  } else {
    const nifs = findNifs(items);
    if (nifs.length > 0 && nifs[0]) {
      issuerNif = nifs[0].value;
      regions.issuerNif = toBbox(nifs[0].item);
    }
  }
  if (issuerNif) draft.issuerNif = issuerNif;
  if (issuerName) draft.issuerName = issuerName;

  // ---- Issue date ----
  const datePredicate = (s: string): string | null => {
    const m = s.match(DATE_RX);
    if (!m || !m[0]) return null;
    return parseAnyDate(m[0]);
  };

  if (options.template?.regions.issueDate) {
    const hit = firstMatchInBbox(items, options.template.regions.issueDate, datePredicate);
    if (hit) {
      draft.issueDate = hit.value;
      regions.issueDate = toBbox(hit.item);
    }
  }
  if (!draft.issueDate) {
    const dateAnchor = findLabelItem(items, DATE_LABELS);
    if (dateAnchor) {
      const hit = findNearValue(items, dateAnchor, datePredicate);
      if (hit) {
        draft.issueDate = hit.value;
        regions.issueDate = toBbox(hit.item);
      }
    }
    if (!draft.issueDate) {
      // fallback: first date found anywhere
      for (const item of items) {
        const v = datePredicate(item.str);
        if (v) {
          draft.issueDate = v;
          regions.issueDate = toBbox(item);
          break;
        }
      }
    }
  }
  if (!draft.issueDate) warnings.push('No se detectó la fecha de emisión');

  // ---- Invoice number ----
  const invoiceNumberPredicate = (s: string): string | null => {
    const trimmed = s.trim();
    // Common shapes: F2024-001, 2024/001, 00123, FAC-123
    const m = trimmed.match(/\b[A-Z0-9][A-Z0-9/\-_.]{2,30}\b/i);
    return m ? m[0] : null;
  };

  if (options.template?.regions.number) {
    const hit = firstMatchInBbox(items, options.template.regions.number, invoiceNumberPredicate);
    if (hit) {
      draft.number = hit.value;
      regions.number = toBbox(hit.item);
    }
  }
  if (!draft.number) {
    const numAnchor = findLabelItem(items, NUMBER_LABELS);
    if (numAnchor) {
      const hit = findNearValue(items, numAnchor, invoiceNumberPredicate);
      if (hit) {
        draft.number = hit.value;
        regions.number = toBbox(hit.item);
      }
    }
  }

  // ---- Amounts: total / net / vat ----
  const amountPredicate = (s: string): string | null => {
    const m = s.match(AMOUNT_RX);
    if (!m || !m[0]) return null;
    const n = parseEsNumber(m[0]);
    return n != null ? n.toFixed(2) : null;
  };

  const tryAmount = (
    field: 'totalAmount' | 'netAmount' | 'vatPct',
    labelGroup: readonly string[],
  ): void => {
    const templateBox = options.template?.regions[field];
    if (templateBox) {
      const hit = firstMatchInBbox(items, templateBox, amountPredicate);
      if (hit) {
        draft[field] = hit.value;
        regions[field] = toBbox(hit.item);
        return;
      }
    }
    const anchor = findLabelItem(items, labelGroup);
    if (!anchor) return;
    const hit = findNearValue(items, anchor, amountPredicate);
    if (hit) {
      draft[field] = hit.value;
      regions[field] = toBbox(hit.item);
    }
  };

  tryAmount('totalAmount', TOTAL_LABELS);
  tryAmount('netAmount', NET_LABELS);
  tryAmount('vatPct', VAT_LABELS);

  if (!draft.totalAmount) warnings.push('No se detectó el importe total');
  if (!draft.netAmount && draft.totalAmount) {
    // Fallback: infer net from total assuming 21% if vatPct not set.
    const total = Number(draft.totalAmount);
    const vat = draft.vatPct ? Number(draft.vatPct) : 21;
    if (Number.isFinite(total) && Number.isFinite(vat)) {
      draft.netAmount = (total / (1 + vat / 100)).toFixed(2);
      warnings.push(`Neto estimado a partir del total con IVA ${vat}%`);
    }
  }

  // ---- Concept: use the longest text in the first 40% of the first page. ----
  const lines = groupIntoLines(items);
  if (!draft.concept) {
    const page1Lines = lines.filter((l) => l.page === 1);
    if (page1Lines.length > 0) {
      const topLines = page1Lines.slice(0, Math.max(8, Math.floor(page1Lines.length * 0.4)));
      const longest = [...topLines].sort((a, b) => b.text.length - a.text.length)[0];
      if (longest && longest.text.length >= 4) draft.concept = longest.text.slice(0, 300);
    }
  }

  return { draft, regions, warnings };
}
