'server-only';

import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  bankTransactions,
  transactionMatches,
  invoicePayments,
  issuedInvoices,
  invoices,
} from '@/db/schema';

export type MatchedTransactionRow = {
  readonly transactionId: number;
  readonly bookingDate: string;
  readonly amount: string;
  readonly currency: string;
  readonly direction: 'income' | 'expense';
  readonly description: string;
  readonly counterpartyName: string | null;
  readonly matchType: string;
  readonly matchedEntityId: number;
  readonly matchConfidence: number;
  readonly matchReason: string;
  // Datos de la factura vinculada
  readonly invoiceLabel: string;
  readonly invoiceAmount: string;
  // Estado del pago
  readonly paymentApplied: boolean;
  readonly paymentId: number | null;
  readonly paymentAmount: string | null;
};

export async function getMatchedTransactionsWithPaymentStatus(opts: {
  limit: number;
  offset: number;
}): Promise<readonly MatchedTransactionRow[]> {
  const { limit, offset } = opts;

  // 1. Obtener transacciones matched + su match aprobado
  const txRows = await db
    .select({
      transactionId: bankTransactions.id,
      bookingDate: bankTransactions.bookingDate,
      amount: bankTransactions.amount,
      currency: bankTransactions.currency,
      direction: bankTransactions.direction,
      description: bankTransactions.description,
      counterpartyName: bankTransactions.counterpartyName,
      matchType: transactionMatches.matchType,
      matchedEntityId: transactionMatches.matchedEntityId,
      matchConfidence: transactionMatches.confidence,
      matchReason: transactionMatches.matchReason,
    })
    .from(bankTransactions)
    .innerJoin(
      transactionMatches,
      and(
        eq(transactionMatches.transactionId, bankTransactions.id),
        eq(transactionMatches.status, 'approved'),
        isNotNull(transactionMatches.matchedEntityId),
      ),
    )
    .where(eq(bankTransactions.status, 'matched'))
    .orderBy(bankTransactions.bookingDate)
    .limit(limit)
    .offset(offset);

  if (txRows.length === 0) return [];

  const txIds = txRows.map((r) => r.transactionId);

  // 2. Fetch payments, issued invoices, internal invoices en paralelo
  const issuedIds = txRows
    .filter((r) => r.matchType === 'issued_invoice' && r.matchedEntityId !== null)
    .map((r) => r.matchedEntityId as number);

  const invoiceIds = txRows
    .filter((r) => r.matchType === 'internal_invoice' && r.matchedEntityId !== null)
    .map((r) => r.matchedEntityId as number);

  const [paymentRows, issuedRows, invoiceRows] = await Promise.all([
    txIds.length > 0
      ? db
          .select({
            bankTransactionId: invoicePayments.bankTransactionId,
            paymentId: invoicePayments.id,
            paymentAmount: invoicePayments.amount,
          })
          .from(invoicePayments)
          .where(inArray(invoicePayments.bankTransactionId, txIds))
      : Promise.resolve([]),

    issuedIds.length > 0
      ? db
          .select({
            id: issuedInvoices.id,
            invoiceNumber: issuedInvoices.invoiceNumber,
            totalAmount: issuedInvoices.totalAmount,
          })
          .from(issuedInvoices)
          .where(inArray(issuedInvoices.id, issuedIds))
      : Promise.resolve([]),

    invoiceIds.length > 0
      ? db
          .select({
            id: invoices.id,
            number: invoices.number,
            totalAmount: invoices.totalAmount,
          })
          .from(invoices)
          .where(inArray(invoices.id, invoiceIds))
      : Promise.resolve([]),
  ]);

  // 3. Indexar en mapas
  const paymentByTxId = new Map(
    paymentRows.map((p) => [p.bankTransactionId, p]),
  );
  const issuedById = new Map(issuedRows.map((r) => [r.id, r]));
  const invoiceById = new Map(invoiceRows.map((r) => [r.id, r]));

  // 4. Combinar
  return txRows.map((row): MatchedTransactionRow => {
    const payment = paymentByTxId.get(row.transactionId) ?? null;

    let invoiceLabel = `Entidad #${row.matchedEntityId ?? 0}`;
    let invoiceAmount = '0.00';

    if (row.matchType === 'issued_invoice' && row.matchedEntityId !== null) {
      const inv = issuedById.get(row.matchedEntityId);
      if (inv) {
        invoiceLabel = `Factura ${inv.invoiceNumber}`;
        invoiceAmount = String(inv.totalAmount);
      }
    } else if (row.matchType === 'internal_invoice' && row.matchedEntityId !== null) {
      const inv = invoiceById.get(row.matchedEntityId);
      if (inv) {
        invoiceLabel = inv.number ? `Factura ${inv.number}` : `Factura interna #${inv.id}`;
        invoiceAmount = String(inv.totalAmount);
      }
    } else if (row.matchType === 'expense') {
      invoiceLabel = 'Gasto recurrente';
      invoiceAmount = String(row.amount);
    }

    return {
      transactionId: row.transactionId,
      bookingDate: row.bookingDate instanceof Date
        ? row.bookingDate.toISOString().substring(0, 10)
        : String(row.bookingDate).substring(0, 10),
      amount: String(row.amount),
      currency: row.currency,
      direction: row.direction as 'income' | 'expense',
      description: row.description,
      counterpartyName: row.counterpartyName,
      matchType: row.matchType,
      matchedEntityId: row.matchedEntityId ?? 0,
      matchConfidence: row.matchConfidence,
      matchReason: row.matchReason ?? '',
      invoiceLabel,
      invoiceAmount,
      paymentApplied: payment !== null,
      paymentId: payment?.paymentId ?? null,
      paymentAmount: payment?.paymentAmount ?? null,
    };
  });
}

export async function countMatchedTransactions(): Promise<number> {
  const rows = await db
    .select({ id: bankTransactions.id })
    .from(bankTransactions)
    .where(eq(bankTransactions.status, 'matched'));
  return rows.length;
}
