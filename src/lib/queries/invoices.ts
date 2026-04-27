import { and, desc, eq, sql, gte, lte, ne, ilike, or, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoices, crmBrands, talents, files } from '@/db/schema';
import type {
  Invoice,
  InvoiceKind,
  InvoiceStatus,
  InvoiceCompany,
  InvoicePaymentMethod,
  InvoiceSummary,
  InvoiceWithRelations,
  NewInvoice,
  FileRecord,
} from '@/types';

type InvoiceFilters = {
  readonly kind?: InvoiceKind;
  readonly status?: InvoiceStatus;
  readonly statuses?: readonly InvoiceStatus[];
  readonly from?: string;
  readonly to?: string;
  readonly brandId?: number;
  readonly talentId?: number;
  readonly campaignId?: number;
  readonly company?: InvoiceCompany;
  readonly paymentMethod?: InvoicePaymentMethod;
  readonly category?: string;
  readonly search?: string;
  readonly includeAnuladas?: boolean;
};

const INVOICE_LIST_COLUMNS = {
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
  paidAmount: invoices.paidAmount,
  currency: invoices.currency,
  series: invoices.series,
  status: invoices.status,
  company: invoices.company,
  paymentMethod: invoices.paymentMethod,
  aiTool: invoices.aiTool,
  fileUrl: invoices.fileUrl,
  filePath: invoices.filePath,
  invoiceFileId: invoices.invoiceFileId,
  statementFileId: invoices.statementFileId,
  notes: invoices.notes,
  createdByUserId: invoices.createdByUserId,
  campaignId: invoices.campaignId,
  createdAt: invoices.createdAt,
  updatedAt: invoices.updatedAt,
  brandName: crmBrands.name,
  talentName: talents.name,
} as const;

type InvoiceListRow = Invoice & {
  readonly brandName: string | null;
  readonly talentName: string | null;
};

async function attachFiles(rows: readonly InvoiceListRow[]): Promise<readonly InvoiceWithRelations[]> {
  const fileIds = new Set<number>();
  for (const row of rows) {
    if (row.invoiceFileId !== null && row.invoiceFileId !== undefined) fileIds.add(row.invoiceFileId);
    if (row.statementFileId !== null && row.statementFileId !== undefined) fileIds.add(row.statementFileId);
  }
  if (fileIds.size === 0) {
    return rows.map((row) => ({ ...row, invoiceFile: null, statementFile: null }));
  }
  const fileRows = await db
    .select()
    .from(files)
    .where(inArray(files.id, Array.from(fileIds)));
  const byId = new Map<number, FileRecord>(fileRows.map((f) => [f.id, f]));
  return rows.map((row) => ({
    ...row,
    invoiceFile: row.invoiceFileId !== null ? byId.get(row.invoiceFileId) ?? null : null,
    statementFile: row.statementFileId !== null ? byId.get(row.statementFileId) ?? null : null,
  }));
}

export async function listInvoices(filters: InvoiceFilters = {}): Promise<readonly InvoiceWithRelations[]> {
  const conds = [];
  if (filters.kind) conds.push(eq(invoices.kind, filters.kind));
  if (filters.status) conds.push(eq(invoices.status, filters.status));
  if (filters.statuses && filters.statuses.length > 0) conds.push(inArray(invoices.status, filters.statuses as InvoiceStatus[]));
  if (!filters.includeAnuladas && !filters.status && (!filters.statuses || filters.statuses.length === 0)) {
    conds.push(ne(invoices.status, 'anulada'));
  }
  if (filters.from) conds.push(gte(invoices.issueDate, filters.from));
  if (filters.to) conds.push(lte(invoices.issueDate, filters.to));
  if (filters.brandId) conds.push(eq(invoices.brandId, filters.brandId));
  if (filters.talentId) conds.push(eq(invoices.talentId, filters.talentId));
  if (filters.campaignId) conds.push(eq(invoices.campaignId, filters.campaignId));
  if (filters.company) conds.push(eq(invoices.company, filters.company));
  if (filters.paymentMethod) conds.push(eq(invoices.paymentMethod, filters.paymentMethod));
  if (filters.category) conds.push(ilike(invoices.category, `%${filters.category}%`));
  if (filters.search) {
    const q = `%${filters.search}%`;
    conds.push(
      or(
        ilike(invoices.concept, q),
        ilike(invoices.number, q),
        ilike(invoices.counterpartyName, q),
        ilike(invoices.category, q),
      )!,
    );
  }

  const rows = await db
    .select(INVOICE_LIST_COLUMNS)
    .from(invoices)
    .leftJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
    .leftJoin(talents, eq(talents.id, invoices.talentId))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(invoices.issueDate), desc(invoices.id));

  return attachFiles(rows as readonly InvoiceListRow[]);
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return row ?? null;
}

export async function getInvoiceWithFiles(id: number): Promise<InvoiceWithRelations | null> {
  const rows = await db
    .select(INVOICE_LIST_COLUMNS)
    .from(invoices)
    .leftJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
    .leftJoin(talents, eq(talents.id, invoices.talentId))
    .where(eq(invoices.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  const [first] = await attachFiles(rows as readonly InvoiceListRow[]);
  return first ?? null;
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
      pendingIncome: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'income' AND ${invoices.status} IN ('emitida','no_cobrada','parcial','vencida') THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
      overdueIncome: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind} = 'income' AND ${invoices.status} IN ('emitida','no_cobrada','vencida') AND ${invoices.dueDate} IS NOT NULL AND ${invoices.dueDate} < ${todayMadrid}::date THEN ${invoices.totalAmount} ELSE 0 END), 0)::text`,
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

function buildMonthRange(date: Date): { readonly from: string; readonly to: string } {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, date.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(last).padStart(2, '0')}`,
  };
}

async function sumIncomeBetween(from: string, to: string, company?: InvoiceCompany): Promise<number> {
  const conds = [
    gte(invoices.issueDate, from),
    lte(invoices.issueDate, to),
    eq(invoices.kind, 'income'),
    inArray(invoices.status, ['cobrada', 'pagada'] as InvoiceStatus[]),
  ];
  if (company) conds.push(eq(invoices.company, company));

  const [row] = await db
    .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)::text` })
    .from(invoices)
    .where(and(...conds));
  return Number(row?.total ?? 0);
}

export async function getMonthRevenue(opts?: { readonly company?: InvoiceCompany }): Promise<number> {
  const { from, to } = buildMonthRange(new Date());
  return sumIncomeBetween(from, to, opts?.company);
}

export async function getPreviousMonthRevenue(opts?: { readonly company?: InvoiceCompany }): Promise<number> {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { from, to } = buildMonthRange(prev);
  return sumIncomeBetween(from, to, opts?.company);
}

export type RevenueTrendPoint = {
  readonly month: string; // YYYY-MM
  readonly ingresos: number;
  readonly gastos: number;
};

export async function getRevenueTrend(months = 12, opts?: { readonly company?: InvoiceCompany }): Promise<readonly RevenueTrendPoint[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day current month

  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

  const conds = [
    gte(invoices.issueDate, startStr),
    lte(invoices.issueDate, endStr),
    ne(invoices.status, 'anulada'),
  ];
  if (opts?.company) conds.push(eq(invoices.company, opts.company));

  const rows = await db
    .select({
      kind: invoices.kind,
      issueDate: invoices.issueDate,
      totalAmount: invoices.totalAmount,
    })
    .from(invoices)
    .where(and(...conds));

  const buckets = new Map<string, { ingresos: number; gastos: number }>();
  for (let i = 0; i < months; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { ingresos: 0, gastos: 0 });
  }

  for (const row of rows) {
    const key = (row.issueDate ?? '').slice(0, 7);
    const entry = buckets.get(key);
    if (!entry) continue;
    const amount = Number(row.totalAmount ?? 0);
    if (row.kind === 'income') entry.ingresos += amount;
    else entry.gastos += amount;
  }

  return Array.from(buckets.entries()).map(([month, value]) => ({
    month,
    ingresos: value.ingresos,
    gastos: value.gastos,
  }));
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
    .select(INVOICE_LIST_COLUMNS)
    .from(invoices)
    .innerJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
    .leftJoin(talents, eq(talents.id, invoices.talentId))
    .where(
      and(
        eq(crmBrands.portalUserId, portalUserId),
        eq(invoices.kind, 'income'),
        ne(invoices.status, 'anulada'),
      ),
    )
    .orderBy(desc(invoices.issueDate), desc(invoices.id));

  return attachFiles(rows as readonly InvoiceListRow[]);
}

export async function deleteInvoice(id: number): Promise<void> {
  await db.delete(invoices).where(eq(invoices.id, id));
}
