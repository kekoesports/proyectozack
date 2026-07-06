'server-only';

import { and, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  crmBrands,
  invoicePayments,
  invoices,
  issuedInvoices,
} from '@/db/schema';
import { getArAging } from './arAging';
import type { ArAgingBucket, ArAgingKpis, ArAgingRow } from '@/types/arAging';

/**
 * Datos agregados de la sección "Ingresos" (PR 3).
 *
 * Reutiliza queries existentes (`getArAging`, sumas de invoices/issued)
 * y añade dos agregados nuevos: top clientes por deuda y top marcas por
 * facturación. No ejecuta writes ni migraciones.
 */

export type IngresosPeriod = { readonly from: string; readonly to: string };

export type IngresosKpis = {
  /** SUM invoices.income + issued_invoices totalAmount en el periodo (no anuladas). */
  readonly facturadoTotal: number;
  /** SUM invoice_payments (income) del periodo (fuente canónica). Si no hay bank data cae a 0. */
  readonly cobradoTotal: number;
  /** Pendiente vivo total: aging.totalPending. */
  readonly pendienteCobro: number;
  /** Aging.totalOverdue. */
  readonly vencido: number;
  /** Pendiente NO vencido (aging.pendingNotYetDue). */
  readonly porVencer: number;
  /** Promedio días de vencimiento sobre las vencidas. `null` si no hay vencidas. */
  readonly promedioDiasCobro: number | null;
  /** Cliente/entidad con mayor deuda. `null` si no hay pendiente. */
  readonly clienteMayorDeuda: { readonly name: string; readonly amount: number } | null;
  /** Nº total de facturas pendientes. */
  readonly facturasPendientes: number;
};

export type TopClienteRow = {
  readonly name: string;
  readonly pendingAmount: number;
  readonly overdueAmount: number;
  readonly invoiceCount: number;
  readonly lastInvoiceDate: string | null;
};

export type TopMarcaRow = {
  readonly name: string;
  readonly invoicedTotal: number;
  readonly pendingAmount: number;
  readonly invoiceCount: number;
};

export type IngresosData = {
  readonly period: IngresosPeriod;
  readonly kpis: IngresosKpis;
  readonly aging: { readonly kpis: ArAgingKpis; readonly buckets: readonly ArAgingBucket[]; readonly rows: readonly ArAgingRow[] };
  readonly topClientes: readonly TopClienteRow[];
  readonly topMarcasFacturado: readonly TopMarcaRow[];
  readonly topMarcasPendiente: readonly TopMarcaRow[];
};

function todayInMadridIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function resolvePeriod(input: { readonly from?: string; readonly to?: string } = {}): IngresosPeriod {
  const today = todayInMadridIso();
  return {
    from: input.from ?? `${today.slice(0, 4)}-01-01`,
    to: input.to ?? today,
  };
}

/**
 * SUM de facturado (income) del periodo: internal invoices (no anuladas) +
 * issued_invoices (todas). Fuente canónica de importe: totalAmount.
 */
async function sumFacturado(period: IngresosPeriod): Promise<number> {
  const [internal, issued] = await Promise.all([
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)::text` })
      .from(invoices)
      .where(and(
        eq(invoices.kind, 'income'),
        ne(invoices.status, 'anulada'),
        gte(invoices.issueDate, period.from),
        lte(invoices.issueDate, period.to),
      )),
    db
      .select({ total: sql<string>`COALESCE(SUM(${issuedInvoices.totalAmount}), 0)::text` })
      .from(issuedInvoices)
      .where(and(
        gte(issuedInvoices.issueDate, period.from),
        lte(issuedInvoices.issueDate, period.to),
      )),
  ]);
  return Number(internal[0]?.total ?? 0) + Number(issued[0]?.total ?? 0);
}

/**
 * SUM de cobrado real desde `invoice_payments`. Cubre tanto invoices
 * internas (income) como issued_invoices. paymentDate ∈ periodo.
 */
async function sumCobradoReal(period: IngresosPeriod): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
    .from(invoicePayments)
    .leftJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
    .where(and(
      gte(invoicePayments.paymentDate, period.from),
      lte(invoicePayments.paymentDate, period.to),
      // Solo cuenta pagos ligados a invoices income o a issued_invoices.
      // Si es de expense internal → excluido.
      sql`(${invoicePayments.issuedInvoiceId} IS NOT NULL OR ${invoices.kind} = 'income')`,
    ));
  return Number(row?.total ?? 0);
}

/**
 * Deriva `topClientes` a partir de las filas del aging (que ya trae
 * pendingAmount por fila). Agrupa por clientName. Ordena por pendiente
 * descendente.
 */
function computeTopClientes(rows: readonly ArAgingRow[], limit = 5): readonly TopClienteRow[] {
  const map = new Map<string, { pending: number; overdue: number; count: number; lastDate: string | null }>();
  for (const r of rows) {
    const key = r.clientName ?? r.entity ?? '(Sin cliente)';
    const existing = map.get(key) ?? { pending: 0, overdue: 0, count: 0, lastDate: null };
    existing.pending += r.pendingAmount;
    if (r.daysOverdue > 0) existing.overdue += r.pendingAmount;
    existing.count += 1;
    if (!existing.lastDate || r.issueDate > existing.lastDate) {
      existing.lastDate = r.issueDate;
    }
    map.set(key, existing);
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      pendingAmount: Number(v.pending.toFixed(2)),
      overdueAmount: Number(v.overdue.toFixed(2)),
      invoiceCount: v.count,
      lastInvoiceDate: v.lastDate,
    }))
    .sort((a, b) => b.pendingAmount - a.pendingAmount)
    .slice(0, limit);
}

/**
 * Top marcas por facturación del periodo. Combina internal income +
 * issued invoices agrupadas por `crm_brands.name`. Ignora anuladas.
 */
async function computeTopMarcasFacturado(period: IngresosPeriod, limit = 5): Promise<readonly TopMarcaRow[]> {
  const [internalRows, issuedRows] = await Promise.all([
    db
      .select({
        name: crmBrands.name,
        total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)::text`,
        cnt: sql<number>`COUNT(${invoices.id})::int`,
      })
      .from(invoices)
      .innerJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
      .where(and(
        eq(invoices.kind, 'income'),
        ne(invoices.status, 'anulada'),
        gte(invoices.issueDate, period.from),
        lte(invoices.issueDate, period.to),
      ))
      .groupBy(crmBrands.name),
    db
      .select({
        name: crmBrands.name,
        total: sql<string>`COALESCE(SUM(${issuedInvoices.totalAmount}), 0)::text`,
        cnt: sql<number>`COUNT(${issuedInvoices.id})::int`,
      })
      .from(issuedInvoices)
      .innerJoin(crmBrands, eq(crmBrands.id, issuedInvoices.relatedBrandId))
      .where(and(
        gte(issuedInvoices.issueDate, period.from),
        lte(issuedInvoices.issueDate, period.to),
      ))
      .groupBy(crmBrands.name),
  ]);

  const map = new Map<string, { total: number; cnt: number; pending: number }>();
  for (const r of internalRows) {
    const existing = map.get(r.name) ?? { total: 0, cnt: 0, pending: 0 };
    existing.total += Number(r.total);
    existing.cnt += r.cnt;
    map.set(r.name, existing);
  }
  for (const r of issuedRows) {
    const existing = map.get(r.name) ?? { total: 0, cnt: 0, pending: 0 };
    existing.total += Number(r.total);
    existing.cnt += r.cnt;
    map.set(r.name, existing);
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      invoicedTotal: Number(v.total.toFixed(2)),
      pendingAmount: Number(v.pending.toFixed(2)),
      invoiceCount: v.cnt,
    }))
    .sort((a, b) => b.invoicedTotal - a.invoicedTotal)
    .slice(0, limit);
}

/**
 * Top marcas por pendiente — derivado del aging rows.
 */
function computeTopMarcasPendiente(rows: readonly ArAgingRow[], limit = 5): readonly TopMarcaRow[] {
  const map = new Map<string, { pending: number; cnt: number }>();
  for (const r of rows) {
    const key = r.brandName ?? '(Sin marca)';
    const existing = map.get(key) ?? { pending: 0, cnt: 0 };
    existing.pending += r.pendingAmount;
    existing.cnt += 1;
    map.set(key, existing);
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      invoicedTotal: 0,
      pendingAmount: Number(v.pending.toFixed(2)),
      invoiceCount: v.cnt,
    }))
    .sort((a, b) => b.pendingAmount - a.pendingAmount)
    .slice(0, limit);
}

/**
 * Query principal de la sección /admin/finanzas/ingresos.
 *
 * Reutiliza `getArAging` para todo lo relativo a pendientes y añade
 * agregados nuevos. Cero writes, cero migración.
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function getIngresosData(input: { readonly from?: string; readonly to?: string } = {}): Promise<IngresosData> {
  const period = resolvePeriod(input);

  const [aging, facturadoTotal, cobradoTotal, topMarcasFacturado] = await Promise.all([
    getArAging({}),
    sumFacturado(period),
    sumCobradoReal(period),
    computeTopMarcasFacturado(period),
  ]);

  const topClientes = computeTopClientes(aging.rows);
  const topMarcasPendiente = computeTopMarcasPendiente(aging.rows);

  const clienteMayorDeuda = topClientes[0]
    ? { name: topClientes[0].name, amount: topClientes[0].pendingAmount }
    : null;

  const kpis: IngresosKpis = {
    facturadoTotal: Number(facturadoTotal.toFixed(2)),
    cobradoTotal: Number(cobradoTotal.toFixed(2)),
    pendienteCobro: aging.kpis.totalPending,
    vencido: aging.kpis.totalOverdue,
    porVencer: aging.kpis.pendingNotYetDue,
    promedioDiasCobro: aging.kpis.avgDaysOverdue,
    clienteMayorDeuda,
    facturasPendientes: aging.rows.length,
  };

  return {
    period,
    kpis,
    aging: { kpis: aging.kpis, buckets: aging.buckets, rows: aging.rows },
    topClientes,
    topMarcasFacturado,
    topMarcasPendiente,
  };
}
