'server-only';

import { and, eq, sum } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  invoicePayments,
  issuedInvoices,
  invoices,
} from '@/db/schema';
import { logReconciliationEvent } from './bankReconciliation';
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

  const invoice = await db.query.issuedInvoices.findFirst({
    where: eq(issuedInvoices.id, issuedInvoiceId),
    columns: { id: true, totalAmount: true, currency: true, invoiceNumber: true },
  });

  if (!invoice) throw new Error(`Factura emitida ${issuedInvoiceId} no encontrada`);
  if (invoice.currency !== currency) {
    throw new Error(`La moneda del pago (${currency}) no coincide con la de la factura (${invoice.currency})`);
  }

  let payment: InvoicePayment | undefined;

  await db.transaction(async (tx) => {
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

    // Sumar todos los pagos de esta factura (incluye el recién insertado)
    const sumRows = await tx
      .select({ total: sum(invoicePayments.amount) })
      .from(invoicePayments)
      .where(eq(invoicePayments.issuedInvoiceId, issuedInvoiceId));

    const totalPaid = Number(sumRows[0]?.total ?? '0');
    const totalDue = Number(invoice.totalAmount);
    const newStatus = totalPaid >= totalDue - 0.005 ? 'cobrada' : 'parcial';

    await tx
      .update(issuedInvoices)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(issuedInvoices.id, issuedInvoiceId));
  });

  if (!payment) throw new Error('Error al aplicar el pago');

  await logReconciliationEvent({
    transactionId: bankTransactionId,
    eventType: 'payment_applied',
    message: `Cobro aplicado a factura emitida ${invoice.invoiceNumber}: ${amount} ${currency}`,
    metadata: { issuedInvoiceId, invoiceNumber: invoice.invoiceNumber, amount, currency, paymentDate },
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

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    columns: { id: true, totalAmount: true, currency: true, kind: true, number: true, paidAmount: true },
  });

  if (!invoice) throw new Error(`Factura interna ${invoiceId} no encontrada`);
  if (invoice.currency !== currency) {
    throw new Error(`La moneda del pago (${currency}) no coincide con la de la factura (${invoice.currency})`);
  }

  let payment: InvoicePayment | undefined;

  await db.transaction(async (tx) => {
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

    const newPaidAmount = (Number(invoice.paidAmount ?? '0') + Number(amount)).toFixed(2);
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
    message: `Pago aplicado a factura ${invoice.number ?? invoiceId}: ${amount} ${currency}`,
    metadata: { invoiceId, invoiceNumber: invoice.number ?? null, amount, currency, paymentDate },
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
