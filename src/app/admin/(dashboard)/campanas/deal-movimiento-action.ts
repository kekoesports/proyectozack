'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod/v4';
import { requirePermission } from '@/lib/permissions';
import { createInvoice } from '@/lib/queries/invoices';
import {
  INVOICE_KINDS,
  INVOICE_STATUSES,
  INVOICE_PAYMENT_METHODS,
  INVOICE_COMPANIES,
} from '@/lib/schemas/invoice';

// ── Schema ────────────────────────────────────────────────────────────────────

const movimientoSchema = z.object({
  campaignId:    z.coerce.number().int().positive(),
  brandId:       z.coerce.number().int().positive().nullable().optional(),
  talentId:      z.coerce.number().int().positive().nullable().optional(),
  kind:          z.enum(INVOICE_KINDS),
  concept:       z.string().min(1).max(2000),
  totalAmount:   z.coerce.number().min(0.01),
  issueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  status:        z.enum(INVOICE_STATUSES),
  company:       z.enum(INVOICE_COMPANIES).optional().nullable(),
  paymentMethod: z.enum(INVOICE_PAYMENT_METHODS).optional().nullable(),
  notes:         z.string().max(2000).optional().nullable(),
});

export type MovimientoInput = z.infer<typeof movimientoSchema>;

export type MovimientoResult =
  | { readonly success: true;  readonly id: number }
  | { readonly success: false; readonly error: string };

// ── Action ────────────────────────────────────────────────────────────────────

export async function addDealMovimientoAction(
  input: MovimientoInput,
): Promise<MovimientoResult> {
  await requirePermission('campanas', 'write');

  const parsed = movimientoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const d = parsed.data;
  const amt = d.totalAmount.toFixed(2);

  const invoice = await createInvoice({
    kind:              d.kind,
    concept:           d.concept,
    issueDate:         d.issueDate,
    status:            d.status,
    netAmount:         amt,
    vatPct:            '0',
    withholdingPct:    '0',
    totalAmount:       amt,
    paidAmount:        (d.status === 'cobrada' || d.status === 'pagada') ? amt : '0',
    paidDate:          (d.status === 'cobrada' || d.status === 'pagada') ? d.issueDate : undefined,
    currency:          'EUR',
    series:            d.kind === 'income' ? 'I' : 'G',
    campaignId:        d.campaignId,
    ...(d.brandId   != null ? { brandId:  d.brandId  } : {}),
    ...(d.talentId  != null ? { talentId: d.talentId } : {}),
    ...(d.company   != null ? { company:  d.company  } : {}),
    ...(d.paymentMethod != null ? { paymentMethod: d.paymentMethod } : {}),
    ...(d.notes     != null && d.notes !== '' ? { notes: d.notes } : {}),
  });

  revalidatePath(`/admin/campanas/${d.campaignId}`);
  revalidatePath('/admin/facturacion');

  return { success: true, id: invoice.id };
}
