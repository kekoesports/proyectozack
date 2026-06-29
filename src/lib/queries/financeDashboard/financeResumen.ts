'server-only';

import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoicePayments, invoices } from '@/db/schema';
import { getUnclassifiedExpenseCount } from '@/lib/queries/invoices';

// ── Existing types (kept for backward compat) ────────────────────────────────

export type FinanceResumenKPIs = {
  // Bloque A — Devengo
  readonly incomeTotal: number;
  readonly incomeSettled: number;
  readonly gastosCampanaDirect: number;
  readonly gastosOperativos: number;
  readonly gastosNoClasificados: number;
  readonly pendienteCobro: number;
  readonly pendientePago: number;
  readonly margenBruto: number;
  readonly margenPct: number;
  // Bloque B — Caja (via invoice_payments)
  readonly cobradoMes: number;
  readonly cobradoYTD: number;
  readonly pagadoMes: number;
  readonly unclassifiedCount: number;
};

// ── New types ────────────────────────────────────────────────────────────────

export type MonthlyFinanceFlow = {
  readonly incomeTotal: number;
  readonly gastosCampanaDirect: number;
  readonly gastosOperativos: number;
  readonly gastosTotal: number;
  readonly resultado: number;
  readonly cobradoMes: number;
  readonly pagadoMes: number;
};

export type FinanceStockKPIs = {
  readonly pendienteCobro: number;
  readonly pendientePago: number;
  readonly gastosNoClasificados: number;
  readonly unclassifiedCount: number;
};

export type MonthlyExpenseBreakdownItem = {
  readonly subtype: string | null;
  readonly label: string;
  readonly amount: number;
};

export type MonthlyDocItem = {
  readonly id: number;
  readonly kind: 'income' | 'expense';
  readonly concept: string;
  readonly counterpartyName: string | null;
  readonly totalAmount: number;
  readonly status: string;
  readonly issueDate: string;
};

// ── Expense subtype labels (human-readable) ──────────────────────────────────

export const EXPENSE_SUBTYPE_LABELS: Record<string, string> = {
  pago_talento: 'Pagos a talento',
  coste_produccion: 'Coste de producción',
  comision_plataforma: 'Comisión plataforma',
  otros_campana: 'Otros (campaña)',
  suscripcion_software: 'Suscripciones software',
  herramienta_ia: 'Herramientas IA',
  gestoria: 'Gestoría',
  fiscal_impuestos: 'Impuestos',
  cuota_autonomo: 'Cuota autónomo',
  marketing_publicidad: 'Marketing',
  comision_bancaria: 'Comisión bancaria',
  ajuste_fiscal: 'Ajuste fiscal',
  gasto_general: 'Gasto general',
  factura_autonomo: 'Factura autónomo',
  nomina_socio: 'Nóminas',
  seguro_medico: 'Seguro médico',
  seguridad_social: 'Seguridad Social',
};

// ── Pure helpers (exported for unit tests) ───────────────────────────────────

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Parses ?mes=YYYY-MM; falls back to current month if invalid. */
export function parseYearMonth(raw: unknown): string {
  if (typeof raw !== 'string') return currentYearMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return currentYearMonth();
  return raw;
}

/** Computes first/last day of a YYYY-MM month. */
export function monthRange(yearMonth: string): { from: string; to: string } {
  const parts = yearMonth.split('-');
  const y = parseInt(parts[0] ?? '2026', 10);
  const m = parseInt(parts[1] ?? '01', 10);
  // new Date(y, m, 0) → last day of month m (1-indexed)
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${yearMonth}-01`, to: `${yearMonth}-${String(lastDay).padStart(2, '0')}` };
}

/** Generates contextual explanation text for the monthly result card. */
export function buildContextualText(
  incomeTotal: number,
  gastosTotal: number,
  topExpenseLabel: string | null,
): string {
  if (incomeTotal === 0 && gastosTotal === 0) return 'No hay datos registrados para este mes.';
  if (incomeTotal >= gastosTotal) {
    const surplus = incomeTotal - gastosTotal;
    return surplus === 0
      ? 'Ingresos iguales a gastos este mes.'
      : 'Buen mes — has ingresado más de lo gastado.';
  }
  const base = 'Has gastado más de lo ingresado este mes.';
  return topExpenseLabel ? `${base} Principal gasto: ${topExpenseLabel}.` : base;
}

// ── Existing pure function (kept unchanged) ──────────────────────────────────

/** @pure Calcula margenBruto y margenPct desde valores liquidados. */
export function computeMargen(
  incomeSettled: number,
  settledCampana: number,
  settledOperativos: number,
): { margenBruto: number; margenPct: number } {
  const margenBruto = incomeSettled - settledCampana - settledOperativos;
  const margenPct = incomeSettled > 0 ? Math.round((margenBruto / incomeSettled) * 1000) / 10 : 0;
  return { margenBruto, margenPct };
}

function currentMonthRange(): { from: string; to: string } {
  return monthRange(currentYearMonth());
}

// ── New split queries ─────────────────────────────────────────────────────────

/**
 * Flow KPIs for a specific month (issueDate-based / devengo).
 * Caja figures use paymentDate to match the selected month.
 * DOES NOT include stock metrics (pendientes, unclassified) — use getFinanceStockKPIs().
 */
export async function getMonthlyFinanceFlow(from: string, to: string): Promise<MonthlyFinanceFlow> {
  const [flowRow, cobradoRow, pagadoRow] = await Promise.all([
    db
      .select({
        incomeTotal: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='income' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
        gastosCampanaDirect: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.expenseGroup}='campaign_direct' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
        gastosOperativos: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND (${invoices.expenseGroup}='operational' OR (${invoices.expenseGroup} IS NULL AND ${invoices.campaignId} IS NULL)) THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
      })
      .from(invoices)
      .where(and(ne(invoices.status, 'anulada'), gte(invoices.issueDate, from), lte(invoices.issueDate, to))),

    db
      .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
      .where(and(gte(invoicePayments.paymentDate, from), lte(invoicePayments.paymentDate, to), eq(invoices.kind, 'income'))),

    db
      .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
      .where(and(gte(invoicePayments.paymentDate, from), lte(invoicePayments.paymentDate, to), eq(invoices.kind, 'expense'))),
  ]);

  const incomeTotal = Number(flowRow[0]?.incomeTotal ?? 0);
  const gastosCampanaDirect = Number(flowRow[0]?.gastosCampanaDirect ?? 0);
  const gastosOperativos = Number(flowRow[0]?.gastosOperativos ?? 0);
  const gastosTotal = gastosCampanaDirect + gastosOperativos;

  return {
    incomeTotal,
    gastosCampanaDirect,
    gastosOperativos,
    gastosTotal,
    resultado: incomeTotal - gastosTotal,
    cobradoMes: Number(cobradoRow[0]?.total ?? 0),
    pagadoMes: Number(pagadoRow[0]?.total ?? 0),
  };
}

/**
 * Stock KPIs — no date filter.
 * Pendientes and unclassified are balance figures, not flow figures.
 */
export async function getFinanceStockKPIs(): Promise<FinanceStockKPIs> {
  const [stockRow, unclassifiedCount] = await Promise.all([
    db
      .select({
        pendienteCobro: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='income' AND ${invoices.status} IN ('emitida','no_cobrada','parcial','vencida') THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
        pendientePago: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.status} IN ('emitida','no_pagada','parcial','vencida') THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
        gastosNoClasificados: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.expenseGroup} IS NULL THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
      })
      .from(invoices)
      .where(ne(invoices.status, 'anulada')),

    getUnclassifiedExpenseCount(),
  ]);

  return {
    pendienteCobro: Number(stockRow[0]?.pendienteCobro ?? 0),
    pendientePago: Number(stockRow[0]?.pendientePago ?? 0),
    gastosNoClasificados: Number(stockRow[0]?.gastosNoClasificados ?? 0),
    unclassifiedCount,
  };
}

/** Expense totals grouped by subtype for the selected month. */
export async function getMonthlyExpenseBreakdown(from: string, to: string): Promise<MonthlyExpenseBreakdownItem[]> {
  const rows = await db
    .select({
      subtype: invoices.expenseSubtype,
      amount: sql<string>`SUM(${invoices.totalAmount})::text`,
    })
    .from(invoices)
    .where(and(
      eq(invoices.kind, 'expense'),
      ne(invoices.status, 'anulada'),
      gte(invoices.issueDate, from),
      lte(invoices.issueDate, to),
    ))
    .groupBy(invoices.expenseSubtype)
    .orderBy(desc(sql`SUM(${invoices.totalAmount})`));

  return rows.map((row) => ({
    subtype: row.subtype,
    label: row.subtype ? (EXPENSE_SUBTYPE_LABELS[row.subtype] ?? row.subtype) : 'Sin clasificar',
    amount: Number(row.amount ?? 0),
  }));
}

/** Most recent invoices (income + expense) for the selected month, limit 6. */
export async function getMonthlyDocs(from: string, to: string): Promise<MonthlyDocItem[]> {
  const rows = await db
    .select({
      id: invoices.id,
      kind: invoices.kind,
      concept: invoices.concept,
      counterpartyName: invoices.counterpartyName,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      issueDate: invoices.issueDate,
    })
    .from(invoices)
    .where(and(ne(invoices.status, 'anulada'), gte(invoices.issueDate, from), lte(invoices.issueDate, to)))
    .orderBy(desc(invoices.issueDate), desc(invoices.id))
    .limit(6);

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as 'income' | 'expense',
    concept: row.concept,
    counterpartyName: row.counterpartyName,
    totalAmount: Number(row.totalAmount),
    status: row.status ?? 'borrador',
    issueDate: row.issueDate ?? '',
  }));
}

// ── Legacy composite query (kept for backward compat — used by FinanceResumenBlocks) ──

/**
 * KPIs doble-base para el resumen financiero.
 *
 * Bloque A (devengo): usa `invoices` directamente.
 * Bloque B (caja): usa `invoice_payments` — solo cobros/pagos verificados via conciliación bancaria.
 *
 * @cache none
 * @visibility admin
 */
export async function getFinanceResumenKPIs(opts: {
  readonly from?: string;
  readonly to?: string;
} = {}): Promise<FinanceResumenKPIs> {
  const { from: monthFrom, to: monthTo } = currentMonthRange();
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const conds = [ne(invoices.status, 'anulada')];
  if (opts.from) conds.push(gte(invoices.issueDate, opts.from));
  if (opts.to) conds.push(lte(invoices.issueDate, opts.to));

  const [accrualRows, unclassifiedCount, cobradoMesRows, cobradoYTDRows, pagadoMesRows] =
    await Promise.all([
      db
        .select({
          incomeTotal: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='income' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
          incomeSettled: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='income' AND ${invoices.status} IN ('cobrada','pagada') THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
          gastosCampanaDirect: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.expenseGroup}='campaign_direct' THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
          gastosOperativos: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND (${invoices.expenseGroup}='operational' OR (${invoices.expenseGroup} IS NULL AND ${invoices.campaignId} IS NULL)) THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
          gastosNoClasificados: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.expenseGroup} IS NULL THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
          pendienteCobro: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='income' AND ${invoices.status} IN ('emitida','no_cobrada','parcial','vencida') THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
          pendientePago: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.status} IN ('emitida','no_pagada','parcial','vencida') THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
          settledCampana: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND ${invoices.expenseGroup}='campaign_direct' AND ${invoices.status} IN ('cobrada','pagada') THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
          settledOperativos: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.kind}='expense' AND (${invoices.expenseGroup}='operational' OR (${invoices.expenseGroup} IS NULL AND ${invoices.campaignId} IS NULL)) AND ${invoices.status} IN ('cobrada','pagada') THEN ${invoices.totalAmount} ELSE 0 END),0)::text`,
        })
        .from(invoices)
        .where(and(...conds)),

      getUnclassifiedExpenseCount(),

      db
        .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
        .from(invoicePayments)
        .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
        .where(and(gte(invoicePayments.paymentDate, monthFrom), lte(invoicePayments.paymentDate, monthTo), eq(invoices.kind, 'income'))),

      db
        .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
        .from(invoicePayments)
        .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
        .where(and(gte(invoicePayments.paymentDate, yearStart), eq(invoices.kind, 'income'))),

      db
        .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
        .from(invoicePayments)
        .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
        .where(and(gte(invoicePayments.paymentDate, monthFrom), lte(invoicePayments.paymentDate, monthTo), eq(invoices.kind, 'expense'))),
    ]);

  const row = accrualRows[0];
  const incomeSettled = Number(row?.incomeSettled ?? 0);
  const settledCampana = Number(row?.settledCampana ?? 0);
  const settledOperativos = Number(row?.settledOperativos ?? 0);
  const { margenBruto, margenPct } = computeMargen(incomeSettled, settledCampana, settledOperativos);

  return {
    incomeTotal: Number(row?.incomeTotal ?? 0),
    incomeSettled,
    gastosCampanaDirect: Number(row?.gastosCampanaDirect ?? 0),
    gastosOperativos: Number(row?.gastosOperativos ?? 0),
    gastosNoClasificados: Number(row?.gastosNoClasificados ?? 0),
    pendienteCobro: Number(row?.pendienteCobro ?? 0),
    pendientePago: Number(row?.pendientePago ?? 0),
    margenBruto,
    margenPct,
    cobradoMes: Number(cobradoMesRows[0]?.total ?? 0),
    cobradoYTD: Number(cobradoYTDRows[0]?.total ?? 0),
    pagadoMes: Number(pagadoMesRows[0]?.total ?? 0),
    unclassifiedCount,
  };
}
