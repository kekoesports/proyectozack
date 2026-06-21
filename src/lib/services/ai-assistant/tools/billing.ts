'server-only';

import { and, desc, eq, gte, lte, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoices, issuedInvoices, billingClients, crmBrands } from '@/db/schema';

export type BillingSummary = {
  readonly currentMonth: {
    readonly incomeTotal: number;
    readonly expenseTotal: number;
    readonly netTotal: number;
    readonly currency: string;
  };
  readonly pendingCount: number;
  readonly overdueCount: number;
  readonly cobradaCount: number;
};

export type OverdueInvoice = {
  readonly id: number;
  readonly type: 'legacy' | 'issued';
  readonly number: string | null;
  readonly concept: string;
  readonly amount: number;
  readonly dueDate: string | null;
  readonly counterparty: string | null;
};

export type PendingInvoice = {
  readonly id: number;
  readonly type: 'legacy' | 'issued';
  readonly number: string | null;
  readonly concept: string;
  readonly amount: number;
  readonly issueDate: string | null;
  readonly counterparty: string | null;
  readonly status: string;
};

export async function getBillingSummary(): Promise<BillingSummary> {
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [incomeRow] = await db
    .select({ total: sql<string>`coalesce(sum(total_amount), 0)` })
    .from(invoices)
    .where(and(
      eq(invoices.kind, 'income'),
      gte(invoices.issueDate, fromDate),
      lte(invoices.issueDate, toDate),
    ));

  const [expenseRow] = await db
    .select({ total: sql<string>`coalesce(sum(total_amount), 0)` })
    .from(invoices)
    .where(and(
      eq(invoices.kind, 'expense'),
      gte(invoices.issueDate, fromDate),
      lte(invoices.issueDate, toDate),
    ));

  const [pendingRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(invoices)
    .where(or(eq(invoices.status, 'emitida'), eq(invoices.status, 'pendiente')));

  const [overdueRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(invoices)
    .where(eq(invoices.status, 'vencida'));

  const [cobradaRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(invoices)
    .where(or(eq(invoices.status, 'cobrada'), eq(invoices.status, 'pagada')));

  const income = parseFloat(incomeRow?.total ?? '0');
  const expense = parseFloat(expenseRow?.total ?? '0');

  return {
    currentMonth: {
      incomeTotal: income,
      expenseTotal: expense,
      netTotal: income - expense,
      currency: 'EUR',
    },
    pendingCount: parseInt(pendingRow?.count ?? '0', 10),
    overdueCount: parseInt(overdueRow?.count ?? '0', 10),
    cobradaCount: parseInt(cobradaRow?.count ?? '0', 10),
  };
}

export async function getOverdueInvoices(): Promise<readonly OverdueInvoice[]> {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      concept: invoices.concept,
      totalAmount: invoices.totalAmount,
      dueDate: invoices.dueDate,
      counterpartyName: invoices.counterpartyName,
      brandName: crmBrands.name,
    })
    .from(invoices)
    .leftJoin(crmBrands, eq(invoices.brandId, crmBrands.id))
    .where(eq(invoices.status, 'vencida'))
    .orderBy(desc(invoices.dueDate))
    .limit(20);

  return rows.map((r) => ({
    id: r.id,
    type: 'legacy' as const,
    number: r.number,
    concept: r.concept,
    amount: parseFloat(r.totalAmount ?? '0'),
    dueDate: r.dueDate,
    counterparty: r.counterpartyName ?? r.brandName ?? null,
  }));
}

export async function getPendingInvoices(): Promise<readonly PendingInvoice[]> {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      concept: invoices.concept,
      totalAmount: invoices.totalAmount,
      issueDate: invoices.issueDate,
      counterpartyName: invoices.counterpartyName,
      brandName: crmBrands.name,
      status: invoices.status,
    })
    .from(invoices)
    .leftJoin(crmBrands, eq(invoices.brandId, crmBrands.id))
    .where(or(
      eq(invoices.status, 'emitida'),
      eq(invoices.status, 'pendiente'),
      eq(invoices.status, 'no_cobrada'),
      eq(invoices.status, 'no_cobrado'),
    ))
    .orderBy(desc(invoices.issueDate))
    .limit(20);

  // Facturas emitidas (nueva arquitectura) pendientes
  const issuedRows = await db
    .select({
      id: issuedInvoices.id,
      invoiceNumber: issuedInvoices.invoiceNumber,
      totalAmount: issuedInvoices.totalAmount,
      issueDate: issuedInvoices.issueDate,
      status: issuedInvoices.status,
      clientName: billingClients.name,
    })
    .from(issuedInvoices)
    .leftJoin(billingClients, eq(issuedInvoices.billingClientId, billingClients.id))
    .where(or(
      eq(issuedInvoices.status, 'emitida'),
      eq(issuedInvoices.status, 'enviada'),
      eq(issuedInvoices.status, 'vencida'),
    ))
    .orderBy(desc(issuedInvoices.issueDate))
    .limit(10);

  const legacyPending: PendingInvoice[] = rows.map((r) => ({
    id: r.id,
    type: 'legacy' as const,
    number: r.number,
    concept: r.concept,
    amount: parseFloat(r.totalAmount ?? '0'),
    issueDate: r.issueDate,
    counterparty: r.counterpartyName ?? r.brandName ?? null,
    status: r.status,
  }));

  const issuedPending: PendingInvoice[] = issuedRows.map((r) => ({
    id: r.id,
    type: 'issued' as const,
    number: r.invoiceNumber,
    concept: `Factura emitida ${r.invoiceNumber}`,
    amount: parseFloat(r.totalAmount ?? '0'),
    issueDate: r.issueDate,
    counterparty: r.clientName ?? null,
    status: r.status,
  }));

  return [...legacyPending, ...issuedPending];
}
