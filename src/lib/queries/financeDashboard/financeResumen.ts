'server-only';

import { and, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoicePayments, invoices } from '@/db/schema';
import { getUnclassifiedExpenseCount } from '@/lib/queries/invoices';

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
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(last).padStart(2, '0')}`,
  };
}

/**
 * KPIs doble-base para el resumen financiero.
 *
 * Bloque A (devengo): usa `invoices` directamente.
 * Bloque B (caja): usa `invoice_payments` — solo cobros/pagos verificados via conciliación bancaria.
 *
 * `gastosNoClasificados` = gastos con campaignId pero sin expenseGroup asignado.
 * Son costes directos de campaña pendientes de clasificar.
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
      // Bloque A: todos los agregados accrual en una sola query
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

      // Bloque B: cobrado este mes (invoicePayments → kind='income')
      db
        .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
        .from(invoicePayments)
        .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
        .where(
          and(
            gte(invoicePayments.paymentDate, monthFrom),
            lte(invoicePayments.paymentDate, monthTo),
            eq(invoices.kind, 'income'),
          ),
        ),

      // Cobrado YTD
      db
        .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
        .from(invoicePayments)
        .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
        .where(
          and(
            gte(invoicePayments.paymentDate, yearStart),
            eq(invoices.kind, 'income'),
          ),
        ),

      // Pagado este mes (invoicePayments → kind='expense')
      db
        .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
        .from(invoicePayments)
        .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
        .where(
          and(
            gte(invoicePayments.paymentDate, monthFrom),
            lte(invoicePayments.paymentDate, monthTo),
            eq(invoices.kind, 'expense'),
          ),
        ),
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
