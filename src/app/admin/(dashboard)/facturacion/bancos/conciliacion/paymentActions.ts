'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { logRedacted } from '@/lib/log';
import { applyPaymentSchema } from '@/lib/schemas/invoicePayments';
import {
  applyPaymentToIssuedInvoice,
  applyPaymentToInternalInvoice,
} from '@/lib/queries/invoicePayments';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
};

const RECON_PATH = '/admin/facturacion/bancos/conciliacion';

export async function applyPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission('bancos', 'write');

    const parsed = applyPaymentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    const { bankTransactionId, issuedInvoiceId, invoiceId, amount, currency, paymentDate, notes } = parsed.data;

    if (issuedInvoiceId !== undefined) {
      await applyPaymentToIssuedInvoice({
        bankTransactionId,
        issuedInvoiceId,
        amount,
        currency,
        paymentDate,
        ...(notes !== undefined ? { notes } : {}),
        appliedByUserId: session.user.id,
      });
    } else if (invoiceId !== undefined) {
      await applyPaymentToInternalInvoice({
        bankTransactionId,
        invoiceId,
        amount,
        currency,
        paymentDate,
        ...(notes !== undefined ? { notes } : {}),
        appliedByUserId: session.user.id,
      });
    } else {
      return { error: 'Debe indicar una factura' };
    }

    revalidatePath(RECON_PATH);
    return { success: true };
  } catch (err) {
    logRedacted('error', 'applyPaymentAction', err);
    const msg = err instanceof Error ? err.message : 'Error al aplicar el pago';
    return { error: msg };
  }
}
