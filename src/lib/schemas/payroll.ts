import { z } from 'zod';

const amountStr = z.string().regex(/^\d+\.\d{2}$/, 'Importe inválido (esperado 0.00)');
const pctStr = z.string().regex(/^\d+\.\d{2}$/, 'Porcentaje inválido');

export const PayrollImportRowSchema = z.object({
  page: z.number().int().positive(),
  include: z.boolean(),
  slug: z.string().min(1),
  yearMonth: z.string().regex(/^(\d{4}-\d{2}|desconocido)$/),
  txId: z.string().min(1),
  counterpartyName: z.string(),
  concept: z.string().min(1),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  netAmount: amountStr,
  totalAmount: amountStr,
  vatPct: pctStr,
  withholdingPct: pctStr,
  expenseGroup: z.literal('operational'),
  expenseSubtype: z.literal('nomina_socio'),
  status: z.literal('pagada'),
  notes: z.string().nullable(),
  warning: z.string().nullable(),
});

export const PayrollImportRowsSchema = z.array(PayrollImportRowSchema).min(1, 'Se requiere al menos una fila');
