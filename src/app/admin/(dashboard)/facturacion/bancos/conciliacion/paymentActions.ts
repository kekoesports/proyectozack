'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { logRedacted } from '@/lib/log';
import { applyPaymentSchema } from '@/lib/schemas/invoicePayments';
import {
  applyPaymentToIssuedInvoice,
  applyPaymentToInternalInvoice,
} from '@/lib/queries/invoicePayments';
import { logReconciliationEvent } from '@/lib/queries/bankReconciliation';
import { PaymentGuardError } from '@/lib/services/bank-reconciliation/invoicePaymentGuards';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
};

const RECON_PATH = '/admin/facturacion/bancos/conciliacion';

export async function applyPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requirePermission('bancos', 'write');

  const parsed = applyPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const { bankTransactionId, issuedInvoiceId, invoiceId, amount, currency, paymentDate, notes } = parsed.data;

  try {
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
    if (err instanceof PaymentGuardError) {
      // Auditar rechazos con event_type payment_apply_blocked. El
      // varchar acepta cualquier tag — no requiere migración de enum.
      await logReconciliationEvent({
        transactionId: bankTransactionId,
        eventType: 'payment_apply_blocked',
        message: err.message,
        metadata: {
          reason: err.reason,
          ...(issuedInvoiceId !== undefined ? { issuedInvoiceId } : {}),
          ...(invoiceId !== undefined ? { invoiceId } : {}),
          amount,
          currency,
        },
        createdByUserId: session.user.id,
      });
      return { error: err.message };
    }

    logRedacted('error', 'applyPaymentAction', err);
    const msg = err instanceof Error ? err.message : 'Error al aplicar el pago';
    return { error: msg };
  }
}
