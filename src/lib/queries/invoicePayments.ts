'server-only';

import { and, eq, sum } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  invoicePayments,
  issuedInvoices,
  invoices,
} from '@/db/schema';
import { logReconciliationEvent } from './bankReconciliation';
import {
  assertInvoicePayable,
  PaymentGuardError,
} from '@/lib/services/bank-reconciliation/invoicePaymentGuards';
import type { InvoicePayment } from '@/types';

// ── Aplicar cobro a factura emitida ──────────────────────────────────

export async function applyPaymentToIssuedInvoice(opts: {
  bankTransactionId: number;
  issuedInvoiceId: number;
  amount: string;
  currency: string;
  paymentDate: string;
  notes?: string;
  appliedByUserId: string;
}): Promise<InvoicePayment> {
  const { bankTransactionId, issuedInvoiceId, amount, currency, paymentDate, notes, appliedByUserId } = opts;

  let payment: InvoicePayment | undefined;
  let invoiceNumber: string | undefined;

  await db.transaction(async (tx) => {
    // 1) Bloquear la fila de la factura con FOR UPDATE. Postgres serializa
    //    los pagos concurrentes contra la misma factura hasta commit —
    //    cierra la ventana entre lectura de status/SUM y INSERT.
    const invoiceRows = await tx
      .select({
        id: issuedInvoices.id,
        totalAmount: issuedInvoices.totalAmount,
        currency: issuedInvoices.currency,
        invoiceNumber: issuedInvoices.invoiceNumber,
        status: issuedInvoices.status,
      })
      .from(issuedInvoices)
      .where(eq(issuedInvoices.id, issuedInvoiceId))
      .for('update');

    const invoice = invoiceRows[0];
    if (!invoice) throw new Error(`Factura emitida ${issuedInvoiceId} no encontrada`);
    if (invoice.currency !== currency) {
      throw new PaymentGuardError('currency_mismatch');
    }
    invoiceNumber = invoice.invoiceNumber;

    // 2) previouslyPaid = SUM(invoice_payments) leído DENTRO de la tx tras
    //    el lock. Ve todos los commits anteriores; nadie más puede insertar
    //    contra esta factura hasta que soltemos el lock.
    const sumRows = await tx
      .select({ total: sum(invoicePayments.amount) })
      .from(invoicePayments)
      .where(eq(invoicePayments.issuedInvoiceId, issuedInvoiceId));
    const previouslyPaid = sumRows[0]?.total ?? '0';

    // 3) Guards con el estado real y actualizado. Si lanzan, la tx hace
    //    rollback y el action layer audita el rechazo.
    assertInvoicePayable({
      status: invoice.status,
      totalDue: invoice.totalAmount,
      previouslyPaid,
      amountToApply: amount,
      kind: 'issued',
    });

    // 4) INSERT + UPDATE dentro de la misma tx.
    const [inserted] = await tx
      .insert(invoicePayments)
      .values({
        bankTransactionId,
        issuedInvoiceId,
        amount,
        currency,
        paymentDate,
        notes: notes ?? null,
        appliedByUserId,
      })
      .returning();

    if (!inserted) throw new Error('Error al insertar el pago');
    payment = inserted;

    // Post-lock ya sabemos que newTotal = previouslyPaid + amount sin
    // riesgo de carrera; evitamos un segundo SELECT SUM redundante.
    const newTotalPaid = Number(previouslyPaid) + Number(amount);
    const totalDue = Number(invoice.totalAmount);
    const newStatus = newTotalPaid >= totalDue - 0.005 ? 'cobrada' : 'parcial';

    await tx
      .update(issuedInvoices)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(issuedInvoices.id, issuedInvoiceId));
  });

  if (!payment || invoiceNumber === undefined) throw new Error('Error al aplicar el pago');

  await logReconciliationEvent({
    transactionId: bankTransactionId,
    eventType: 'payment_applied',
    message: `Cobro aplicado a factura emitida ${invoiceNumber}: ${amount} ${currency}`,
    metadata: { issuedInvoiceId, invoiceNumber, amount, currency, paymentDate },
    createdByUserId: appliedByUserId,
  });

  return payment;
}

// ── Aplicar pago a factura interna ────────────────────────────────────

export async function applyPaymentToInternalInvoice(opts: {
  bankTransactionId: number;
  invoiceId: number;
  amount: string;
  currency: string;
  paymentDate: string;
  notes?: string;
  appliedByUserId: string;
}): Promise<InvoicePayment> {
  const { bankTransactionId, invoiceId, amount, currency, paymentDate, notes, appliedByUserId } = opts;

  let payment: InvoicePayment | undefined;
  let invoiceNumber: string | null | undefined;

  await db.transaction(async (tx) => {
    // 1) Bloquear la fila de la factura con FOR UPDATE. Serializa pagos
    //    concurrentes contra la misma factura interna hasta commit.
    const invoiceRows = await tx
      .select({
        id: invoices.id,
        totalAmount: invoices.totalAmount,
        currency: invoices.currency,
        kind: invoices.kind,
        number: invoices.number,
        paidAmount: invoices.paidAmount,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .for('update');

    const invoice = invoiceRows[0];
    if (!invoice) throw new Error(`Factura interna ${invoiceId} no encontrada`);
    if (invoice.currency !== currency) {
      throw new PaymentGuardError('currency_mismatch');
    }
    invoiceNumber = invoice.number;

    // 2) Para internal invoices leemos paidAmount (mirror del write) para
    //    no ignorar datos legacy previos a invoice_payments (ver
    //    `@deprecated` en el schema — cleanup en otra PR). Tras el lock
    //    nadie puede actualizar paidAmount hasta commit.
    const previouslyPaid = invoice.paidAmount ?? '0';

    // 3) Guards con el estado real bloqueado.
    assertInvoicePayable({
      status: invoice.status,
      totalDue: invoice.totalAmount,
      previouslyPaid,
      amountToApply: amount,
      kind: invoice.kind === 'income' ? 'internal_income' : 'internal_expense',
    });

    // 4) INSERT + UPDATE dentro de la misma tx.
    const [inserted] = await tx
      .insert(invoicePayments)
      .values({
        bankTransactionId,
        invoiceId,
        amount,
        currency,
        paymentDate,
        notes: notes ?? null,
        appliedByUserId,
      })
      .returning();

    if (!inserted) throw new Error('Error al insertar el pago');
    payment = inserted;

    const newPaidAmount = (Number(previouslyPaid) + Number(amount)).toFixed(2);
    const totalDue = Number(invoice.totalAmount);
    const paid = Number(newPaidAmount);

    let newStatus: 'cobrada' | 'pagada' | 'parcial';
    if (paid >= totalDue - 0.005) {
      newStatus = invoice.kind === 'income' ? 'cobrada' : 'pagada';
    } else {
      newStatus = 'parcial';
    }

    await tx
      .update(invoices)
      .set({ paidAmount: newPaidAmount, status: newStatus, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  });

  if (!payment) throw new Error('Error al aplicar el pago');

  await logReconciliationEvent({
    transactionId: bankTransactionId,
    eventType: 'payment_applied',
    message: `Pago aplicado a factura ${invoiceNumber ?? invoiceId}: ${amount} ${currency}`,
    metadata: { invoiceId, invoiceNumber: invoiceNumber ?? null, amount, currency, paymentDate },
    createdByUserId: appliedByUserId,
  });

  return payment;
}

// ── Consultas ─────────────────────────────────────────────────────────

export async function getPaymentsForTransaction(
  bankTransactionId: number,
): Promise<readonly InvoicePayment[]> {
  return db
    .select()
    .from(invoicePayments)
    .where(eq(invoicePayments.bankTransactionId, bankTransactionId));
}

export async function getPaymentsForIssuedInvoice(
  issuedInvoiceId: number,
): Promise<readonly InvoicePayment[]> {
  return db
    .select()
    .from(invoicePayments)
    .where(and(eq(invoicePayments.issuedInvoiceId, issuedInvoiceId)));
}

/** SUM(amount) de invoice_payments para una factura emitida. Numeric string. */
export async function getIssuedInvoicePaidToDate(issuedInvoiceId: number): Promise<string> {
  const rows = await db
    .select({ total: sum(invoicePayments.amount) })
    .from(invoicePayments)
    .where(eq(invoicePayments.issuedInvoiceId, issuedInvoiceId));
  return rows[0]?.total ?? '0';
}
