import { z } from 'zod';

export const applyPaymentSchema = z.object({
  bankTransactionId: z.coerce.number().int().positive(),
  // Exactamente uno de los dos debe estar presente
  issuedInvoiceId: z.coerce.number().int().positive().optional(),
  invoiceId: z.coerce.number().int().positive().optional(),
  amount: z.string()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Importe inválido')
    .refine((value) => Number(value) > 0, 'El importe debe ser mayor que cero'),
  currency: z.string().trim().transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{3}$/, 'Moneda inválida'))
    .default('EUR'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  notes: z.string().max(500).optional(),
}).refine(
  (d) => (d.issuedInvoiceId !== undefined) !== (d.invoiceId !== undefined),
  { message: 'Debe indicar exactamente una factura (issuedInvoiceId o invoiceId, no ambas)' },
);

export type ApplyPaymentInput = z.infer<typeof applyPaymentSchema>;
