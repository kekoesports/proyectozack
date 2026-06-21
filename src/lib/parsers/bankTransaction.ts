'server-only';

import { createHash } from 'crypto';
import { extractCsvSheet } from './csv';
import { extractXlsxSheet } from './xlsx';
import { parseAnyDate, parseEsNumber } from './common';
import { sanitizeToolOutput } from '@/lib/services/ai-assistant/sanitize';
import { maskIban } from '@/lib/services/ai-assistant/mask';
import type { SheetExtract } from './common';

// ── Field mapping ─────────────────────────────────────────────────────

export const BANK_MAPPABLE_FIELDS = [
  'bookingDate',
  'valueDate',
  'amount',
  'currency',
  'direction',
  'description',
  'counterpartyName',
  'counterpartyAccount',
  'reference',
  'category',
] as const;

export type BankMappableField = (typeof BANK_MAPPABLE_FIELDS)[number];
export type BankColumnMapping = Partial<Record<BankMappableField, number>>;

const BANK_FIELD_HINTS: Record<BankMappableField, readonly string[]> = {
  bookingDate: ['fecha', 'fecha operacion', 'fecha operación', 'booking date', 'date', 'fecha contable', 'transaction date'],
  valueDate: ['valor', 'fecha valor', 'value date', 'settlement date'],
  amount: ['importe', 'amount', 'cantidad', 'monto', 'saldo', 'movimiento', 'cargo haber'],
  currency: ['divisa', 'currency', 'moneda'],
  direction: ['tipo', 'type', 'sentido', 'direction', 'cargo/abono', 'debe/haber'],
  description: ['concepto', 'description', 'descripcion', 'descripción', 'detalle', 'memo', 'motivo', 'narrative'],
  counterpartyName: ['nombre', 'beneficiario', 'ordenante', 'counterparty', 'payee', 'payer', 'razon social', 'razón social', 'nombre beneficiario', 'nombre tercero'],
  counterpartyAccount: ['iban', 'cuenta', 'account', 'cuenta destino', 'cuenta origen', 'cuenta contraparte'],
  reference: ['referencia', 'reference', 'ref', 'id transaccion', 'id transacción', 'transaction id', 'num operacion'],
  category: ['categoria', 'categoría', 'category', 'tipo gasto', 'subcategoria'],
};

function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function suggestBankMapping(headers: readonly string[]): BankColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: BankColumnMapping = {};
  for (const field of BANK_MAPPABLE_FIELDS) {
    const hints = BANK_FIELD_HINTS[field].map(normalizeHeader);
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < normalized.length; i += 1) {
      const h = normalized[i];
      if (!h) continue;
      for (const hint of hints) {
        let score = 0;
        if (h === hint) score = 3;
        else if (h.startsWith(hint) || hint.startsWith(h)) score = 2;
        else if (h.includes(hint)) score = 1;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
    }
    if (bestIdx >= 0) mapping[field] = bestIdx;
  }
  return mapping;
}

// ── Parsed row intermediate ───────────────────────────────────────────

export type ParsedBankRow = {
  readonly bookingDate: Date;
  readonly valueDate: Date | null;
  readonly amount: number;
  readonly currency: string;
  readonly direction: 'income' | 'expense';
  readonly description: string;
  readonly counterpartyName: string | null;
  readonly counterpartyAccountMasked: string | null;
  readonly reference: string | null;
  readonly category: string | null;
  readonly rawFields: Readonly<Record<string, string>>;
  readonly warnings: readonly string[];
};

function cellAt(row: readonly string[], idx: number | undefined): string {
  if (idx == null || idx < 0 || idx >= row.length) return '';
  return (row[idx] ?? '').toString().trim();
}

function inferDirection(amountRaw: string, directionRaw: string, amount: number): 'income' | 'expense' {
  const dir = directionRaw.toLowerCase();
  if (dir.includes('abono') || dir.includes('ingreso') || dir.includes('credit') || dir.includes('haber')) return 'income';
  if (dir.includes('cargo') || dir.includes('gasto') || dir.includes('debit') || dir.includes('debe')) return 'expense';
  // Detect sign from raw amount string
  if (amountRaw.startsWith('-') || amountRaw.includes('-')) return 'expense';
  if (amount < 0) return 'expense';
  return 'income';
}

export function applyBankMapping(opts: {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly mapping: BankColumnMapping;
  readonly defaultCurrency?: string;
}): readonly ParsedBankRow[] {
  const { rows, mapping, headers, defaultCurrency = 'EUR' } = opts;
  const results: ParsedBankRow[] = [];

  for (const row of rows) {
    if (!row.some((cell) => cell.trim() !== '')) continue;

    const warnings: string[] = [];

    const rawBooking = cellAt(row, mapping.bookingDate);
    const bookingDateStr = rawBooking ? parseAnyDate(rawBooking) : null;
    if (!bookingDateStr) {
      warnings.push(`Fecha de operación no reconocida: "${rawBooking}"`);
      continue; // booking date is required
    }
    const bookingDate = new Date(bookingDateStr);

    const rawValue = cellAt(row, mapping.valueDate);
    const valueDateStr = rawValue ? parseAnyDate(rawValue) : null;
    const valueDate = valueDateStr ? new Date(valueDateStr) : null;

    const rawAmount = cellAt(row, mapping.amount);
    const parsedAmount = rawAmount ? parseEsNumber(rawAmount) : null;
    if (parsedAmount == null) {
      warnings.push(`Importe no reconocido: "${rawAmount}"`);
      continue; // amount is required
    }
    const amount = Math.abs(parsedAmount);

    const currency = cellAt(row, mapping.currency) || defaultCurrency;
    const rawDirection = cellAt(row, mapping.direction);
    const direction = inferDirection(rawAmount, rawDirection, parsedAmount);
    const description = cellAt(row, mapping.description);
    const counterpartyName = cellAt(row, mapping.counterpartyName) || null;
    const counterpartyAccountRaw = cellAt(row, mapping.counterpartyAccount);
    const counterpartyAccountMasked = counterpartyAccountRaw ? maskIban(counterpartyAccountRaw) : null;
    const reference = cellAt(row, mapping.reference) || null;
    const category = cellAt(row, mapping.category) || null;

    // Capture all raw fields for audit trail (sanitized)
    const rawFields: Record<string, string> = {};
    for (let i = 0; i < headers.length; i += 1) {
      rawFields[headers[i] ?? `col_${i}`] = row[i] ?? '';
    }

    results.push({
      bookingDate,
      valueDate,
      amount,
      currency: currency.toUpperCase().slice(0, 3),
      direction,
      description,
      counterpartyName,
      counterpartyAccountMasked,
      reference,
      category,
      rawFields,
      warnings,
    });
  }

  return results;
}

// ── Hash for deduplication ────────────────────────────────────────────

export function hashTransaction(row: ParsedBankRow, bankAccountId: number | null): string {
  const normalizedDate = row.bookingDate.toISOString().split('T')[0] ?? '';
  const normalizedDesc = row.description.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedRef = (row.reference ?? '').toLowerCase().trim();
  const normalizedCounterparty = (row.counterpartyName ?? '').toLowerCase().trim();
  const key = [
    String(bankAccountId ?? 'null'),
    normalizedDate,
    row.amount.toFixed(2),
    row.currency,
    normalizedDesc,
    normalizedRef,
    normalizedCounterparty,
  ].join('|');
  return createHash('sha256').update(key).digest('hex');
}

// ── Raw JSON sanitization for DB write ───────────────────────────────

export function sanitizeBankRawJson(raw: unknown): Record<string, unknown> {
  const sanitized = sanitizeToolOutput(raw);
  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>;
  }
  return {};
}

// ── Sheet extraction shortcuts ────────────────────────────────────────

export function parseBankCsv(content: string): SheetExtract {
  return extractCsvSheet(content);
}

export function parseBankXlsx(buffer: ArrayBuffer | Buffer | Uint8Array): SheetExtract {
  return extractXlsxSheet(buffer);
}
