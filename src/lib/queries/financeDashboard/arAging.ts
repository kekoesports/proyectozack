'server-only';

import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  billingClients,
  crmBrands,
  invoicePayments,
  invoices,
  issuedInvoices,
  issuerCompanies,
} from '@/db/schema';
import { INVOICE_COMPANY_LABELS } from '@/lib/schemas/invoice';
import { PENDING_INCOME_FILTER } from '@/lib/utils/invoice-status';
import type { InvoiceStatus } from '@/types';
import type { ArAgingData, ArAgingFilters, ArAgingRow } from '@/types/arAging';
import {
  applyArAgingFilters,
  calcPending,
  classifyBucket,
  computeKpis,
  diffDaysIso,
  resolveEffectiveDueDate,
  sortByAgingPriority,
  summarizeBuckets,
  todayInMadrid,
} from './arAging.shared';
import { buildInvoicePdfUrl } from './expenseSubgroups';

// Facturas emitidas: status es varchar libre pero convención observada.
const ISSUED_PENDING_STATUSES = ['emitida', 'vencida', 'parcial'] as const;

/**
 * Fetch AR aging: cobros pendientes de `issued_invoices` + `invoices kind=income`.
 *
 * `paidAmount` viene SIEMPRE de `invoice_payments` (fuente canónica). No leemos
 * `invoices.paidAmount` porque el schema lo marca como @deprecated.
 *
 * Filtros se aplican en memoria tras derivar bucket y daysOverdue.
 */
export async function getArAging(
  filters: ArAgingFilters = {},
): Promise<ArAgingData> {
  const today = todayInMadrid();

  const [issuedRows, internalRows] = await Promise.all([
    db
      .select({
        id: issuedInvoices.id,
        invoiceNumber: issuedInvoices.invoiceNumber,
        totalAmount: issuedInvoices.totalAmount,
        paidAmount: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text`,
        currency: issuedInvoices.currency,
        status: issuedInvoices.status,
        issueDate: issuedInvoices.issueDate,
        dueDate: issuedInvoices.dueDate,
        brandName: crmBrands.name,
        clientName: billingClients.name,
        issuerName: issuerCompanies.name,
        pdfUrl: issuedInvoices.pdfUrl,
      })
      .from(issuedInvoices)
      .leftJoin(billingClients, eq(billingClients.id, issuedInvoices.billingClientId))
      .leftJoin(crmBrands, eq(crmBrands.id, issuedInvoices.relatedBrandId))
      .leftJoin(issuerCompanies, eq(issuerCompanies.id, issuedInvoices.issuerCompanyId))
      .leftJoin(invoicePayments, eq(invoicePayments.issuedInvoiceId, issuedInvoices.id))
      .where(inArray(issuedInvoices.status, [...ISSUED_PENDING_STATUSES]))
      .groupBy(
        issuedInvoices.id,
        issuedInvoices.invoiceNumber,
        issuedInvoices.totalAmount,
        issuedInvoices.currency,
        issuedInvoices.status,
        issuedInvoices.issueDate,
        issuedInvoices.dueDate,
        crmBrands.name,
        billingClients.name,
        issuerCompanies.name,
        issuedInvoices.pdfUrl,
      )
      .orderBy(asc(issuedInvoices.issueDate)),

    db
      .select({
        id: invoices.id,
        number: invoices.number,
        totalAmount: invoices.totalAmount,
        paidAmount: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text`,
        currency: invoices.currency,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        brandName: crmBrands.name,
        counterpartyName: invoices.counterpartyName,
        company: invoices.company,
        fileUrl: invoices.fileUrl,
        invoiceFileId: invoices.invoiceFileId,
      })
      .from(invoices)
      .leftJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
      .leftJoin(invoicePayments, eq(invoicePayments.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.kind, 'income'),
          inArray(invoices.status, PENDING_INCOME_FILTER as InvoiceStatus[]),
        ),
      )
      .groupBy(
        invoices.id,
        invoices.number,
        invoices.totalAmount,
        invoices.currency,
        invoices.status,
        invoices.issueDate,
        invoices.dueDate,
        crmBrands.name,
        invoices.counterpartyName,
        invoices.company,
        invoices.fileUrl,
        invoices.invoiceFileId,
      )
      .orderBy(asc(invoices.issueDate)),
  ]);

  const issued: ArAgingRow[] = issuedRows
    .map((r) => buildRow({
      id: r.id,
      source: 'issued',
      invoiceNumber: r.invoiceNumber,
      brandName: r.brandName,
      clientName: r.clientName,
      entity: r.issuerName,
      totalAmount: Number(r.totalAmount),
      paidAmount: Number(r.paidAmount),
      currency: r.currency ?? 'EUR',
      status: r.status,
      issueDate: r.issueDate,
      dueDate: r.dueDate,
      pdfUrl: r.pdfUrl ?? null,
      today,
    }))
    .filter((r) => r.pendingAmount > 0);

  const internal: ArAgingRow[] = internalRows
    .map((r) => buildRow({
      id: r.id,
      source: 'internal',
      invoiceNumber: r.number ?? `INT-${r.id}`,
      brandName: r.brandName,
      clientName: r.counterpartyName,
      entity: r.company ? (INVOICE_COMPANY_LABELS[r.company] ?? null) : null,
      totalAmount: Number(r.totalAmount),
      paidAmount: Number(r.paidAmount),
      currency: r.currency ?? 'EUR',
      status: r.status,
      issueDate: r.issueDate,
      dueDate: r.dueDate,
      pdfUrl: buildInvoicePdfUrl({ id: r.id, invoiceFileId: r.invoiceFileId, fileUrl: r.fileUrl }),
      today,
    }))
    .filter((r) => r.pendingAmount > 0);

  const unfilteredRows: readonly ArAgingRow[] = [...issued, ...internal];

  const availableEntities = uniqueSortedNonEmpty(unfilteredRows.map((r) => r.entity));
  const availableBrands = uniqueSortedNonEmpty(unfilteredRows.map((r) => r.brandName));

  const filtered = applyArAgingFilters(unfilteredRows, filters);
  const rows = sortByAgingPriority(filtered);
  const kpis = computeKpis(rows);
  const buckets = summarizeBuckets(rows);

  const currencies = new Set(rows.map((r) => r.currency));
  const hasMultipleCurrencies = currencies.size > 1;

  return {
    rows,
    kpis,
    buckets,
    hasMultipleCurrencies,
    totalUnfilteredRows: unfilteredRows.length,
    availableEntities,
    availableBrands,
    appliedFilters: filters,
  };
}

// ── Helpers privados ─────────────────────────────────────────────────────────

type BuildRowInput = {
  readonly id: number;
  readonly source: 'issued' | 'internal';
  readonly invoiceNumber: string;
  readonly brandName: string | null;
  readonly clientName: string | null;
  readonly entity: string | null;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly currency: string;
  readonly status: string;
  readonly issueDate: string;
  readonly dueDate: string | null;
  readonly pdfUrl: string | null;
  readonly today: string;
};

function buildRow(input: BuildRowInput): ArAgingRow {
  const { effectiveDueDate, isEstimatedDueDate } = resolveEffectiveDueDate(
    input.issueDate,
    input.dueDate,
  );
  const daysOverdue = diffDaysIso(input.today, effectiveDueDate);
  const bucket = classifyBucket(daysOverdue);
  const pendingAmount = calcPending(input.totalAmount, input.paidAmount);

  return {
    id: input.id,
    source: input.source,
    invoiceNumber: input.invoiceNumber,
    brandName: input.brandName,
    clientName: input.clientName,
    entity: input.entity,
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount,
    pendingAmount,
    currency: input.currency,
    status: input.status,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    effectiveDueDate,
    isEstimatedDueDate,
    daysOverdue,
    bucket,
    pdfUrl: input.pdfUrl,
  };
}

function uniqueSortedNonEmpty(values: ReadonlyArray<string | null>): readonly string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
}
