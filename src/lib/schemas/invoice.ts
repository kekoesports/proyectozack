import { z } from 'zod';

export const INVOICE_KINDS = ['income', 'expense'] as const;
export const INVOICE_STATUSES = [
  'borrador',
  'emitida',
  'cobrada',
  'vencida',
  'anulada',
  'no_cobrado',
  'no_pagado',
  'pendiente',
] as const;

export const INCOME_STATUSES = ['cobrada', 'no_cobrado', 'pendiente', 'anulada'] as const;
export const EXPENSE_STATUSES = ['cobrada', 'no_pagado', 'pendiente', 'anulada'] as const;

export const BILLING_ENTITIES = [
  'SocialPro España',
  'SocialPro Andorra',
  'SocialPro Argentina',
] as const;

export const BILLING_PAYMENT_METHODS = [
  'SocialPro España',
  'SocialPro LLC',
  'SocialPro Stark',
  'SocialPro Andorra',
  'SocialPro Crypto',
  'SocialPro Argentina',
] as const;

export const BILLING_CATEGORIES = [
  'Gastos empresa',
  'Gastos creador',
  'Ingresos en banco',
  'Ingresos en crypto',
  'Herramientas IA',
  'Software',
  'Diseño',
  'Edición',
  'Nóminas',
  'Gestoría',
  'Impuestos',
  'Otros',
] as const;

export const AI_TOOLS = [
  'ChatGPT',
  'Claude',
  'Midjourney',
  'ElevenLabs',
  'Runway',
  'Otro',
] as const;

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

const invoiceFields = z.object({
  kind: z.enum(INVOICE_KINDS),
  number: optStr(60),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de emisión inválida'),
  dueDate: optDate,
  paidDate: optDate,
  brandId: z
    .preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  talentId: z
    .preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  campaignId: z
    .preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  counterpartyName: optStr(200),
  concept: z.string().min(1).max(2000),
  description: z.string().optional(),
  category: optStr(80),
  aiToolName: optStr(100),
  netAmount: moneyStr,
  vatPct: moneyStr.default('21.00'),
  withholdingPct: moneyStr.default('0.00'),
  totalAmount: moneyStr,
  currency: z.string().length(3).default('EUR'),
  series: z.string().min(1).max(20).default('A'),
  status: z.enum(INVOICE_STATUSES).default('pendiente'),
  entity: optStr(80),
  paymentMethod: optStr(80),
  notes: z.string().optional(),
});

export const createInvoiceSchema = invoiceFields;
export const updateInvoiceSchema = invoiceFields.partial().extend({
  id: z.coerce.number().int().positive(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
