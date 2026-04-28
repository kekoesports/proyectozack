import { and, desc, eq, sql, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoices, crmBrands, talents } from '@/db/schema';
import type {
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
};

export async function listInvoices(filters: InvoiceFilters = {}): Promise<readonly InvoiceWithRelations[]> {
  const conds = [];
  if (filters.kind) conds.push(eq(invoices.kind, filters.kind));
  if (filters.status) conds.push(eq(invoices.status, filters.status));
  if (filters.from) conds.push(gte(invoices.issueDate, filters.from));
  if (filters.to) conds.push(lte(invoices.issueDate, filters.to));
  if (filters.brandId) conds.push(eq(invoices.brandId, filters.brandId));
  if (filters.talentId) conds.push(eq(invoices.talentId, filters.talentId));

  const rows = await db
    .select({
      id: invoices.id,
      kind: invoices.kind,
      number: invoices.number,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      paidDate: invoices.paidDate,
      brandId: invoices.brandId,
      talentId: invoices.talentId,
      counterpartyName: invoices.counterpartyName,
      concept: invoices.concept,
      category: invoices.category,
      netAmount: invoices.netAmount,
      vatPct: invoices.vatPct,
      withholdingPct: invoices.withholdingPct,
      totalAmount: invoices.totalAmount,
      currency: invoices.currency,
      series: invoices.series,
      status: invoices.status,
      fileUrl: invoices.fileUrl,
      filePath: invoices.filePath,
      entity: invoices.entity,
      paymentMethod: invoices.paymentMethod,
      notes: invoices.notes,
      createdByUserId: invoices.createdByUserId,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      brandName: crmBrands.name,
      talentName: talents.name,
    })
    .from(invoices)
    .leftJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
    .leftJoin(talents, eq(talents.id, invoices.talentId))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(invoices.issueDate), desc(invoices.id));

  return rows;
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return row ?? null;
}

export async function getInvoiceSummary(from?: string, to?: string): Promise<InvoiceSummary> {
  const conds = [];
  if (from) conds.push(gte(invoices.issueDate, from));
  if (to) conds.push(lte(invoices.issueDate, to));

  const todayMadrid = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [row] = await db
    .select({
      incomeTotal: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'income' AND ${invoices.status} != 'anulada' THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
      expenseTotal: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'expense' AND ${invoices.status} != 'anulada' THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
      pendingIncome: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'income' AND ${invoices.status} IN ('emitida') THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
      overdueIncome: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'income' AND ${invoices.status} = 'emitida' AND ${invoices.dueDate} IS NOT NULL AND ${invoices.dueDate} < ${todayMadrid}::date THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
    })
    .from(invoices)
    .where(conds.length > 0 ? and(...conds) : undefined);

  const incomeTotal = Number(row?.incomeTotal ?? 0);
  const expenseTotal = Number(row?.expenseTotal ?? 0);
  return {
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
    pendingIncome: Number(row?.pendingIncome ?? 0),
    overdueIncome: Number(row?.overdueIncome ?? 0),
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

export async function getInvoicesForBrandUser(portalUserId: string): Promise<readonly InvoiceWithRelations[]> {
  const rows = await db
    .select({
      id: invoices.id,
      kind: invoices.kind,
      number: invoices.number,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      paidDate: invoices.paidDate,
      brandId: invoices.brandId,
      talentId: invoices.talentId,
      counterpartyName: invoices.counterpartyName,
      concept: invoices.concept,
      category: invoices.category,
      netAmount: invoices.netAmount,
      vatPct: invoices.vatPct,
      withholdingPct: invoices.withholdingPct,
      totalAmount: invoices.totalAmount,
      currency: invoices.currency,
      series: invoices.series,
      status: invoices.status,
      fileUrl: invoices.fileUrl,
      filePath: invoices.filePath,
      entity: invoices.entity,
      paymentMethod: invoices.paymentMethod,
      notes: invoices.notes,
      createdByUserId: invoices.createdByUserId,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      brandName: crmBrands.name,
      talentName: talents.name,
    })
    .from(invoices)
    .innerJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
    .leftJoin(talents, eq(talents.id, invoices.talentId))
    .where(and(eq(crmBrands.portalUserId, portalUserId), eq(invoices.kind, 'income')))
    .orderBy(desc(invoices.issueDate), desc(invoices.id));

  return rows;
}

export async function deleteInvoice(id: number): Promise<void> {
  await db.delete(invoices).where(eq(invoices.id, id));
}
