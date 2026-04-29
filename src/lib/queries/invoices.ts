import { and, desc, eq, sql, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoices, crmBrands, talents, campaigns } from '@/db/schema';
import type {
  BillingKPIs,
  Invoice,
  InvoiceKind,
  InvoiceStatus,
  InvoiceSummary,
  InvoiceWithRelations,
  NewInvoice,
} from '@/types';

type InvoiceFilters = {
  readonly kind?: InvoiceKind;
  readonly status?: InvoiceStatus;
  readonly from?: string;
  readonly to?: string;
  readonly brandId?: number;
  readonly talentId?: number;
  readonly campaignId?: number;
  readonly entity?: string;
  readonly paymentMethod?: string;
  readonly category?: string;
  readonly currency?: string;
};

const INVOICE_SELECT = {
  id: invoices.id,
  kind: invoices.kind,
  number: invoices.number,
  issueDate: invoices.issueDate,
  dueDate: invoices.dueDate,
  paidDate: invoices.paidDate,
  brandId: invoices.brandId,
  talentId: invoices.talentId,
  campaignId: invoices.campaignId,
  counterpartyName: invoices.counterpartyName,
  concept: invoices.concept,
  description: invoices.description,
  category: invoices.category,
  aiToolName: invoices.aiToolName,
  netAmount: invoices.netAmount,
  vatPct: invoices.vatPct,
  withholdingPct: invoices.withholdingPct,
  totalAmount: invoices.totalAmount,
  currency: invoices.currency,
  series: invoices.series,
  status: invoices.status,
  fileUrl: invoices.fileUrl,
  filePath: invoices.filePath,
  receiptFileUrl: invoices.receiptFileUrl,
  receiptFilePath: invoices.receiptFilePath,
  entity: invoices.entity,
  paymentMethod: invoices.paymentMethod,
  notes: invoices.notes,
  createdByUserId: invoices.createdByUserId,
  createdAt: invoices.createdAt,
  updatedAt: invoices.updatedAt,
} as const;

export async function listInvoices(filters: InvoiceFilters = {}): Promise<readonly InvoiceWithRelations[]> {
  const conds = [];
  if (filters.kind) conds.push(eq(invoices.kind, filters.kind));
  if (filters.status) conds.push(eq(invoices.status, filters.status));
  if (filters.from) conds.push(gte(invoices.issueDate, filters.from));
  if (filters.to) conds.push(lte(invoices.issueDate, filters.to));
  if (filters.brandId) conds.push(eq(invoices.brandId, filters.brandId));
  if (filters.talentId) conds.push(eq(invoices.talentId, filters.talentId));
  if (filters.campaignId) conds.push(eq(invoices.campaignId, filters.campaignId));
  if (filters.entity) conds.push(eq(invoices.entity, filters.entity));
  if (filters.paymentMethod) conds.push(eq(invoices.paymentMethod, filters.paymentMethod));
  if (filters.category) conds.push(eq(invoices.category, filters.category));
  if (filters.currency) conds.push(eq(invoices.currency, filters.currency));

  const rows = await db
    .select({
      ...INVOICE_SELECT,
      brandName: crmBrands.name,
      talentName: talents.name,
      campaignName: campaigns.name,
    })
    .from(invoices)
    .leftJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
    .leftJoin(talents, eq(talents.id, invoices.talentId))
    .leftJoin(campaigns, eq(campaigns.id, invoices.campaignId))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(invoices.issueDate), desc(invoices.id));

  return rows;
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return row ?? null;
}

export async function getBillingKPIs(from?: string, to?: string): Promise<BillingKPIs> {
  const conds = [];
  if (from) conds.push(gte(invoices.issueDate, from));
  if (to) conds.push(lte(invoices.issueDate, to));

  const [row] = await db
    .select({
      incomeTotal: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='income' AND ${invoices.status}!='anulada' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
      expenseTotal: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.status}!='anulada' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
      pendingCobro: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='income' AND ${invoices.status} IN ('no_cobrado','pendiente','emitida') THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
      pendingPago: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.status} IN ('no_pagado','pendiente','emitida') THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
      ingresosBanco: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='income' AND ${invoices.category}='Ingresos en banco' AND ${invoices.status}!='anulada' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
      ingresosCrypto: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='income' AND ${invoices.category}='Ingresos en crypto' AND ${invoices.status}!='anulada' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
      gastoEmpresa: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.category}='Gastos empresa' AND ${invoices.status}!='anulada' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
      gastoCreador: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.category}='Gastos creador' AND ${invoices.status}!='anulada' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
    })
    .from(invoices)
    .where(conds.length > 0 ? and(...conds) : undefined);

  const incomeTotal = Number(row?.incomeTotal ?? 0);
  const expenseTotal = Number(row?.expenseTotal ?? 0);
  return {
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
    pendingCobro: Number(row?.pendingCobro ?? 0),
    pendingPago: Number(row?.pendingPago ?? 0),
    ingresosBanco: Number(row?.ingresosBanco ?? 0),
    ingresosCrypto: Number(row?.ingresosCrypto ?? 0),
    gastoEmpresa: Number(row?.gastoEmpresa ?? 0),
    gastoCreador: Number(row?.gastoCreador ?? 0),
  };
}

/** @deprecated Usar getBillingKPIs */
export async function getInvoiceSummary(from?: string, to?: string): Promise<InvoiceSummary> {
  const kpis = await getBillingKPIs(from, to);
  return {
    incomeTotal: kpis.incomeTotal,
    expenseTotal: kpis.expenseTotal,
    netTotal: kpis.netTotal,
    pendingIncome: kpis.pendingCobro,
    overdueIncome: 0,
  };
}

export async function getUsedInvoiceCategories(): Promise<readonly string[]> {
  const rows = await db
    .select({ category: invoices.category, uses: sql<number>`count(*)::int` })
    .from(invoices)
    .where(sql`${invoices.category} IS NOT NULL`)
    .groupBy(invoices.category)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => r.category).filter((c): c is string => Boolean(c));
}

export async function createInvoice(values: NewInvoice): Promise<Invoice> {
  const [row] = await db.insert(invoices).values(values).returning();
  if (!row) throw new Error('Failed to insert invoice');
  return row;
}

export async function updateInvoice(id: number, patch: Partial<NewInvoice>): Promise<Invoice | null> {
  const [row] = await db
    .update(invoices)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(invoices.id, id))
    .returning();
  return row ?? null;
}


export async function deleteInvoice(id: number): Promise<void> {
  await db.delete(invoices).where(eq(invoices.id, id));
}
