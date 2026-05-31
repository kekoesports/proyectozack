import { z } from 'zod';
import { INVOICE_KINDS, INVOICE_STATUSES } from './invoice';
import type { NewInvoice } from '@/types';

export const INVOICE_DRAFT_SOURCES = [
  'xlsx',
  'csv',
  'pdf-text',
  'facturae-xml',
  'ubl-xml',
  'manual',
] as const;

export type InvoiceDraftSource = (typeof INVOICE_DRAFT_SOURCES)[number];

const optStr = (max: number): z.ZodType<string | undefined> =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().max(max).optional(),
  );

const optDate: z.ZodType<string | undefined> = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
);

const moneyStr = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toFixed(2) : v.replace(',', '.')))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Importe inválido'));

const optMoneyStr: z.ZodType<string | undefined> = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  moneyStr.optional(),
);

const optInt: z.ZodType<number | undefined> = z.preprocess(
  (v) => (v === '' || v == null ? undefined : Number(v)),
  z.number().int().positive().optional(),
);

export const invoiceDraftSchema = z.object({
  source: z.enum(INVOICE_DRAFT_SOURCES),
  kind: z.enum(INVOICE_KINDS),
  concept: z.string().min(1).max(2000),
  netAmount: moneyStr,
  totalAmount: moneyStr,

  number: optStr(60),
  issueDate: optDate,
  dueDate: optDate,
  paidDate: optDate,
  brandId: optInt,
  talentId: optInt,
  counterpartyName: optStr(200),
  issuerNif: optStr(20),
  issuerName: optStr(200),
  category: optStr(80),
  vatPct: optMoneyStr,
  withholdingPct: optMoneyStr,
  currency: z.string().length(3).default('EUR'),
  series: z.string().min(1).max(20).default('A'),
  status: z.enum(INVOICE_STATUSES).default('borrador'),
  notes: z.string().optional(),
});

export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>;

export const approveImportSchema = invoiceDraftSchema.extend({
  id: z.coerce.number().int().positive(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de emisión requerida'),
  vatPct: moneyStr.default('21.00'),
  withholdingPct: moneyStr.default('0.00'),
  series: z.string().min(1).max(20).default('A'),
});

export type ApproveImportInput = z.infer<typeof approveImportSchema>;

// ─── Mapped commit (XLSX/CSV upload con mapping JSON) ──────────────────

export const commitMappedImportSchema = z.object({
  kind: z.enum(INVOICE_KINDS),
  mapping: z.string().min(2),
  saveAsTemplate: z.preprocess(
    (v) => v === 'on' || v === 'true' || v === true,
    z.boolean().default(false),
  ),
  templateName: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z.string().max(80).optional(),
  ),
});

export function draftToInvoiceInsert(
  input: ApproveImportInput,
  createdByUserId: string | null,
): NewInvoice {
  return {
    kind: input.kind,
    scope: (input.brandId != null || input.talentId != null) ? 'campaign' : 'company',
    number: input.number ?? null,
    issueDate: input.issueDate,
    dueDate: input.dueDate ?? null,
    paidDate: input.paidDate ?? null,
    brandId: input.brandId ?? null,
    talentId: input.talentId ?? null,
    counterpartyName: input.counterpartyName ?? input.issuerName ?? null,
    concept: input.concept,
    category: input.category ?? null,
    netAmount: input.netAmount,
    vatPct: input.vatPct,
    withholdingPct: input.withholdingPct,
    totalAmount: input.totalAmount,
    currency: input.currency,
    series: input.series,
    status: input.status,
    notes: input.notes ?? null,
    createdByUserId,
  };
}
