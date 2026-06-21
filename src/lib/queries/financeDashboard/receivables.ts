'server-only';

import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { billingClients, invoicePayments, invoices, issuedInvoices } from '@/db/schema';
import { PENDING_INCOME_FILTER } from '@/lib/utils/invoice-status';
import type { InvoiceStatus } from '@/types';
import type { ReceivableRow } from '@/types/financeDashboard';

const LIMIT = 30;

const TODAY_MADRID = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

export async function getReceivables(): Promise<readonly ReceivableRow[]> {
  const [issuedRows, internalRows] = await Promise.all([
    // Facturas emitidas pendientes — paid via invoice_payments (SUM per invoice)
    db
      .select({
        id: issuedInvoices.id,
        invoiceNumber: issuedInvoices.invoiceNumber,
        clientName: billingClients.name,
        totalAmount: issuedInvoices.totalAmount,
        paidAmount: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text`,
        status: issuedInvoices.status,
        dueDate: issuedInvoices.dueDate,
      })
      .from(issuedInvoices)
      .leftJoin(billingClients, eq(billingClients.id, issuedInvoices.billingClientId))
      .leftJoin(invoicePayments, eq(invoicePayments.issuedInvoiceId, issuedInvoices.id))
      .where(inArray(issuedInvoices.status, ['emitida', 'vencida', 'parcial']))
      .groupBy(
        issuedInvoices.id,
        issuedInvoices.invoiceNumber,
        billingClients.name,
        issuedInvoices.totalAmount,
        issuedInvoices.status,
        issuedInvoices.dueDate,
      )
      .orderBy(asc(issuedInvoices.dueDate))
      .limit(LIMIT),

    // Facturas internas (kind=income) pendientes — paidAmount column
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        totalAmount: invoices.totalAmount,
        paidAmount: invoices.paidAmount,
        status: invoices.status,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.kind, 'income'),
          inArray(invoices.status, PENDING_INCOME_FILTER as InvoiceStatus[]),
        ),
      )
      .orderBy(asc(invoices.dueDate))
      .limit(LIMIT),
  ]);

  const today = TODAY_MADRID;

  const issued: ReceivableRow[] = issuedRows.map((r) => {
    const total = Number(r.totalAmount);
    const paid = Number(r.paidAmount);
    const pending = Math.max(0, total - paid);
    return {
      id: r.id,
      source: 'issued',
      invoiceNumber: r.invoiceNumber,
      clientName: r.clientName ?? null,
      totalAmount: total,
      paidAmount: paid,
      pendingAmount: pending,
      status: r.status,
      dueDate: r.dueDate ?? null,
      isOverdue: r.dueDate !== null && r.dueDate < today,
    };
  });

  const internal: ReceivableRow[] = internalRows.map((r) => {
    const total = Number(r.totalAmount);
    const paid = Number(r.paidAmount ?? '0');
    const pending = Math.max(0, total - paid);
    return {
      id: r.id,
      source: 'internal',
      invoiceNumber: r.number ?? `INT-${r.id}`,
      clientName: null,
      totalAmount: total,
      paidAmount: paid,
      pendingAmount: pending,
      status: r.status,
      dueDate: r.dueDate ?? null,
      isOverdue: r.dueDate !== null && r.dueDate < today,
    };
  });

  return [...issued, ...internal].sort((a, b) => {
    if (a.dueDate === null && b.dueDate === null) return 0;
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });
}
