import { z } from 'zod';

export const INVOICE_KINDS = ['income', 'expense'] as const;
export const INVOICE_STATUSES = [
  'borrador',
  'emitida',
  'cobrada',
  'vencida',
  'anulada',
  'pagada',
  'parcial',
  'no_cobrada',
  'no_pagada',
] as const;
export const INVOICE_COMPANIES = [
  'spain',
  'andorra',
  'argentina',
  'spain_andorra',
  'spain_argentina',
] as const;
export const INVOICE_PAYMENT_METHODS = [
  'banco',
  'crypto',
  'banco_agencia',
  'banco_stark',
  'crypto_agencia',
  'crypto_zack',
  'otro',
] as const;
export const INVOICE_AI_TOOLS = [
  'chatgpt',
  'claude',
  'gemini',
  'midjourney',
  'otro',
] as const;

export const INVOICE_STATUS_LABELS: Record<(typeof INVOICE_STATUSES)[number], string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  cobrada: 'Cobrada',
  vencida: 'Vencida',
  anulada: 'Anulada',
  pagada: 'Pagada',
  parcial: 'Parcial',
  no_cobrada: 'No cobrada',
  no_pagada: 'No pagada',
};

export const INVOICE_COMPANY_LABELS: Record<(typeof INVOICE_COMPANIES)[number], string> = {
  spain: 'España',
  andorra: 'Andorra',
  argentina: 'Argentina',
  spain_andorra: 'España + Andorra',
  spain_argentina: 'España + Argentina',
};

export const INVOICE_PAYMENT_METHOD_LABELS: Record<(typeof INVOICE_PAYMENT_METHODS)[number], string> = {
  banco: 'Banco',
  crypto: 'Crypto',
  banco_agencia: 'Banco agencia',
  banco_stark: 'Banco Stark',
  crypto_agencia: 'Crypto agencia',
  crypto_zack: 'Crypto Zack',
  otro: 'Otro',
};

export const INVOICE_AI_TOOL_LABELS: Record<(typeof INVOICE_AI_TOOLS)[number], string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  midjourney: 'Midjourney',
  otro: 'Otro',
};

const optStr = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().max(max).optional(),
  );

const optDate = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
);

const moneyStr = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toFixed(2) : v.replace(',', '.')))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Importe inválido'));

const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.enum(values).optional(),
  );

const optInt = z.preprocess(
  (v) => (v === '' || v == null ? undefined : Number(v)),
  z.number().int().positive().optional(),
);

const invoiceFields = z.object({
  kind: z.enum(INVOICE_KINDS),
  number: optStr(60),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de emisión inválida'),
  dueDate: optDate,
  paidDate: optDate,
  brandId: optInt,
  talentId: optInt,
  counterpartyName: optStr(200),
  concept: z.string().min(1).max(2000),
  category: optStr(80),
  netAmount: moneyStr,
  vatPct: moneyStr.default('21.00'),
  withholdingPct: moneyStr.default('0.00'),
  totalAmount: moneyStr,
  paidAmount: moneyStr.optional(),
  currency: z.string().length(3).default('EUR'),
  series: z.string().min(1).max(20).default('A'),
  status: z.enum(INVOICE_STATUSES).default('borrador'),
  company: optEnum(INVOICE_COMPANIES),
  paymentMethod: optEnum(INVOICE_PAYMENT_METHODS),
  aiTool: optEnum(INVOICE_AI_TOOLS),
  campaignId: optInt,
  invoiceFileId: optInt,
  statementFileId: optInt,
  notes: z.string().max(5000).optional(),
});

export const createInvoiceSchema = invoiceFields;
export const updateInvoiceSchema = invoiceFields.partial().extend({
  id: z.coerce.number().int().positive(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export type InvoiceCompanyValue = (typeof INVOICE_COMPANIES)[number];
export type InvoicePaymentMethodValue = (typeof INVOICE_PAYMENT_METHODS)[number];
export type InvoiceAiToolValue = (typeof INVOICE_AI_TOOLS)[number];
export type InvoiceStatusValue = (typeof INVOICE_STATUSES)[number];

const AI_HEURISTIC_REGEX = /\b(ia|ai|chat\s?gpt|chatgpt|claude|gemini|midjourney|copilot)\b/i;

export function looksLikeAiCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return AI_HEURISTIC_REGEX.test(category);
}
