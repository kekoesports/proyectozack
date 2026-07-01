'server-only';

import { and, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoicePayments, invoices } from '@/db/schema';
import type { PnLFilters, PnLResult, PnLBreakdownByMonth, PnLBreakdownByCategory } from '@/lib/queries/pnl';
import {
  SETTLED_INCOME_STATUSES,
  SETTLED_EXPENSE_STATUSES,
  PENDING_INCOME_STATUSES,
  PENDING_EXPENSE_STATUSES,
} from '@/lib/utils/invoice-status';
import {
  classifyExpenseSubgroup,
  summarizeExpenseSubgroups,
  type ExpenseSubgroupKey,
  type ExpenseSubgroupRow,
} from './expenseSubgroups';

export type FinancePnLResult = PnLResult & {
  readonly gastosCampanaDirect: number;
  readonly gastosOperativos: number;
  readonly gastosNoClasificados: number;
  readonly cobradoYTD: number;
  readonly pagadoYTD: number;
  readonly expenseBySubgroup: readonly ExpenseSubgroupRow[];
};

/** @pure Clasifica un gasto en su bucket de expenseGroup. */
export function classifyExpenseRow(
  expenseGroup: string | null,
  campaignId: number | null,
): 'campaign_direct' | 'operational' | 'unclassified' {
  if (expenseGroup === 'campaign_direct') return 'campaign_direct';
  if (expenseGroup === 'operational' || (expenseGroup === null && campaignId === null)) return 'operational';
  return 'unclassified';
}

const ZERO: FinancePnLResult = {
  ingresos: 0,
  gastos: 0,
  pagosCreadores: 0,
  comisionAgencia: 0,
  margenBruto: 0,
  margenPct: 0,
  pendienteCobro: 0,
  pendientePago: 0,
  breakdownByMonth: [],
  breakdownByCategory: [],
  gastosCampanaDirect: 0,
  gastosOperativos: 0,
  gastosNoClasificados: 0,
  cobradoYTD: 0,
  pagadoYTD: 0,
  expenseBySubgroup: [],
};

/**
 * P&L financiero extendido: igual que `getPnL` pero con desglose por expenseGroup
 * y cifras de caja (cobrado/pagado YTD via invoice_payments).
 *
 * No usa `paidAmount` — métricas de caja solo desde `invoice_payments`.
 *
 * @cache none
 * @visibility admin
 */
export async function getFinancePnL(filters: PnLFilters = {}): Promise<FinancePnLResult> {
  const conds = [ne(invoices.status, 'anulada')];
  if (filters.from) conds.push(gte(invoices.issueDate, filters.from));
  if (filters.to) conds.push(lte(invoices.issueDate, filters.to));
  if (filters.company) conds.push(eq(invoices.company, filters.company));
  if (filters.brandId) conds.push(eq(invoices.brandId, filters.brandId));
  if (filters.talentId) conds.push(eq(invoices.talentId, filters.talentId));

  const yearStart = `${new Date().getFullYear()}-01-01`;
  const yearEnd = `${new Date().getFullYear()}-12-31`;

  const [rows, cobradoYTDRows, pagadoYTDRows] = await Promise.all([
    db
      .select({
        kind: invoices.kind,
        status: invoices.status,
        totalAmount: invoices.totalAmount,
        campaignId: invoices.campaignId,
        talentId: invoices.talentId,
        expenseGroup: invoices.expenseGroup,
        expenseSubtype: invoices.expenseSubtype,
        category: invoices.category,
        concept: invoices.concept,
        counterpartyName: invoices.counterpartyName,
        issueDate: invoices.issueDate,
      })
      .from(invoices)
      .where(and(...conds)),

    // Cobrado YTD via invoice_payments (income)
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
      .where(
        and(
          gte(invoicePayments.paymentDate, yearStart),
          lte(invoicePayments.paymentDate, yearEnd),
          eq(invoices.kind, 'income'),
        ),
      ),

    // Pagado YTD via invoice_payments (expense)
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)::text` })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoices.id, invoicePayments.invoiceId))
      .where(
        and(
          gte(invoicePayments.paymentDate, yearStart),
          lte(invoicePayments.paymentDate, yearEnd),
          eq(invoices.kind, 'expense'),
        ),
      ),
  ]);

  if (rows.length === 0) {
    return {
      ...ZERO,
      cobradoYTD: Number(cobradoYTDRows[0]?.total ?? 0),
      pagadoYTD: Number(pagadoYTDRows[0]?.total ?? 0),
    };
  }

  const SETTLED_INCOME = new Set<string>(SETTLED_INCOME_STATUSES);
  const SETTLED_EXPENSE = new Set<string>(SETTLED_EXPENSE_STATUSES);
  const PENDING_INCOME = new Set<string>(PENDING_INCOME_STATUSES);
  const PENDING_EXPENSE = new Set<string>(PENDING_EXPENSE_STATUSES);

  let ingresos = 0;
  let gastos = 0;
  let pagosCreadores = 0;
  let pendienteCobro = 0;
  let pendientePago = 0;
  let comisionIngresoCampana = 0;
  let comisionGastoTalentCampana = 0;
  let gastosCampanaDirect = 0;
  let gastosOperativos = 0;
  let gastosNoClasificados = 0;

  const monthMap = new Map<string, { ingresos: number; gastos: number }>();
  const categoryMap = new Map<string, { total: number; count: number }>();
  const subgroupMap = new Map<ExpenseSubgroupKey, { amount: number; count: number }>();

  for (const row of rows) {
    const amount = Number(row.totalAmount ?? 0);
    const month = row.issueDate ? row.issueDate.slice(0, 7) : 'sin-fecha';
    const monthEntry = monthMap.get(month) ?? { ingresos: 0, gastos: 0 };
    const categoryKey = (row.category ?? 'sin categoría').toLowerCase();
    const categoryEntry = categoryMap.get(categoryKey) ?? { total: 0, count: 0 };

    if (row.kind === 'income') {
      ingresos += amount;
      monthEntry.ingresos += amount;
      if (PENDING_INCOME.has(row.status)) pendienteCobro += amount;
      if (row.campaignId !== null && SETTLED_INCOME.has(row.status)) {
        comisionIngresoCampana += amount;
      }
    } else {
      gastos += amount;
      monthEntry.gastos += amount;
      categoryEntry.total += amount;
      categoryEntry.count += 1;
      if (PENDING_EXPENSE.has(row.status)) pendientePago += amount;
      if (row.talentId !== null && SETTLED_EXPENSE.has(row.status)) pagosCreadores += amount;
      if (row.campaignId !== null && row.talentId !== null && SETTLED_EXPENSE.has(row.status)) {
        comisionGastoTalentCampana += amount;
      }
      // expenseGroup breakdown
      const bucket = classifyExpenseRow(row.expenseGroup, row.campaignId);
      if (bucket === 'campaign_direct') gastosCampanaDirect += amount;
      else if (bucket === 'operational') gastosOperativos += amount;
      else gastosNoClasificados += amount;

      // Desglose visual por subgrupo (Nóminas Pablo / Alfonso, Software / IA, ...)
      const subgroupKey = classifyExpenseSubgroup({
        expenseGroup: row.expenseGroup,
        expenseSubtype: row.expenseSubtype,
        concept: row.concept,
        counterpartyName: row.counterpartyName,
      });
      const subEntry = subgroupMap.get(subgroupKey) ?? { amount: 0, count: 0 };
      subEntry.amount += amount;
      subEntry.count += 1;
      subgroupMap.set(subgroupKey, subEntry);
    }

    monthMap.set(month, monthEntry);
    if (row.kind === 'expense') categoryMap.set(categoryKey, categoryEntry);
  }

  const margenBruto = ingresos - gastos;
  const margenPct = ingresos > 0 ? Math.round((margenBruto / ingresos) * 1000) / 10 : 0;
  const comisionAgencia = comisionIngresoCampana - comisionGastoTalentCampana;

  const breakdownByMonth: PnLBreakdownByMonth[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ingresos: v.ingresos, gastos: v.gastos, neto: v.ingresos - v.gastos }));

  const breakdownByCategory: PnLBreakdownByCategory[] = Array.from(categoryMap.entries())
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([category, v]) => ({ category, total: v.total, count: v.count }));

  const expenseBySubgroup = summarizeExpenseSubgroups(subgroupMap, gastos);

  return {
    ingresos,
    gastos,
    pagosCreadores,
    comisionAgencia,
    margenBruto,
    margenPct,
    pendienteCobro,
    pendientePago,
    breakdownByMonth,
    breakdownByCategory,
    gastosCampanaDirect,
    gastosOperativos,
    gastosNoClasificados,
    cobradoYTD: Number(cobradoYTDRows[0]?.total ?? 0),
    pagadoYTD: Number(pagadoYTDRows[0]?.total ?? 0),
    expenseBySubgroup,
  };
}
