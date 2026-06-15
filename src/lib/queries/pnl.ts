import { and, eq, sql, gte, lte, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoices, crmBrands } from '@/db/schema';
import {
  SETTLED_INCOME_STATUSES,
  SETTLED_EXPENSE_STATUSES,
  PENDING_INCOME_STATUSES,
  PENDING_EXPENSE_STATUSES,
} from '@/lib/utils/invoice-status';

import type { InvoiceCompany } from '@/types';

export type PnLFilters = {
  readonly company?: InvoiceCompany;
  readonly from?: string;
  readonly to?: string;
  readonly brandId?: number;
  readonly talentId?: number;
  readonly sector?: string;
  readonly geo?: string;
};

export type PnLBreakdownByMonth = {
  readonly month: string; // YYYY-MM
  readonly ingresos: number;
  readonly gastos: number;
  readonly neto: number;
};

export type PnLBreakdownByCategory = {
  readonly category: string;
  readonly total: number;
  readonly count: number;
};

export type PnLResult = {
  readonly ingresos: number;
  readonly gastos: number;
  readonly pagosCreadores: number;
  readonly comisionAgencia: number;
  /**
   * `margenBruto = ingresos - gastos`. `pagosCreadores` está incluido en `gastos`
   * (es un subset, no se resta de nuevo). No se calcula `margenNeto` aquí porque
   * requiere reservas de impuestos por empresa fiscal — fuera del alcance de Fase 5.
   */
  readonly margenBruto: number;
  /** `margenPct = margenBruto / ingresos × 100`, redondeado a 1 decimal. 0 si no hay ingresos. */
  readonly margenPct: number;
  readonly pendienteCobro: number;
  readonly pendientePago: number;
  readonly breakdownByMonth: readonly PnLBreakdownByMonth[];
  readonly breakdownByCategory: readonly PnLBreakdownByCategory[];
};

const ZERO_PNL: PnLResult = {
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
};

function buildBaseConditions(filters: PnLFilters) {
  const conds = [ne(invoices.status, 'anulada')];
  if (filters.from) conds.push(gte(invoices.issueDate, filters.from));
  if (filters.to) conds.push(lte(invoices.issueDate, filters.to));
  if (filters.company) conds.push(eq(invoices.company, filters.company));
  if (filters.brandId) conds.push(eq(invoices.brandId, filters.brandId));
  if (filters.talentId) conds.push(eq(invoices.talentId, filters.talentId));
  return conds;
}

/**
 * P&L mensual completo: ingresos, gastos, pagos a creators, comisión de agencia,
 * margen bruto, pendiente cobro/pago y breakdowns por mes y categoría.
 *
 * Reglas clave:
 * - Excluye anuladas en todo el cálculo.
 * - `status='cobrada'` y `'pagada'` se consideran ambos liquidados (settled income/expense).
 * - `pagosCreadores` es subset de `gastos` (no se descuenta del margen bruto, ya está dentro).
 * - `comisionAgencia = settled income con campaignId − settled expense con campaignId+talentId`.
 * - Si se filtra por `sector` o `geo`, hace LEFT JOIN con `crmBrands`.
 *
 * @cache none
 * @visibility admin
 * @returns `PnLResult` (objeto con totales y breakdowns; nunca null).
 */
export async function getPnL(filters: PnLFilters = {}): Promise<PnLResult> {
  const baseConds = buildBaseConditions(filters);

  // Optional brand-scoped joins for sector/geo filters.
  const requiresBrandJoin = Boolean(filters.sector || filters.geo);

  const baseQuery = requiresBrandJoin
    ? db
        .select({
          kind: invoices.kind,
          status: invoices.status,
          totalAmount: invoices.totalAmount,
          paidAmount: invoices.paidAmount,
          campaignId: invoices.campaignId,
          talentId: invoices.talentId,
          category: invoices.category,
          issueDate: invoices.issueDate,
          brandSector: crmBrands.sector,
          brandGeo: crmBrands.geo,
        })
        .from(invoices)
        .leftJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
    : db
        .select({
          kind: invoices.kind,
          status: invoices.status,
          totalAmount: invoices.totalAmount,
          paidAmount: invoices.paidAmount,
          campaignId: invoices.campaignId,
          talentId: invoices.talentId,
          category: invoices.category,
          issueDate: invoices.issueDate,
          brandSector: sql<string | null>`NULL`.as('brand_sector'),
          brandGeo: sql<string | null>`NULL`.as('brand_geo'),
        })
        .from(invoices);

  const conds = baseConds;
  if (filters.sector) conds.push(eq(crmBrands.sector, filters.sector));
  if (filters.geo) conds.push(eq(crmBrands.geo, filters.geo));

  const rows = await baseQuery.where(and(...conds));

  if (rows.length === 0) return ZERO_PNL;

  let ingresos = 0;
  let gastos = 0;
  let pagosCreadores = 0;
  let pendienteCobro = 0;
  let pendientePago = 0;
  let comisionIngresoCampana = 0;
  let comisionGastoTalentCampana = 0;

  const monthMap = new Map<string, { ingresos: number; gastos: number }>();
  const categoryMap = new Map<string, { total: number; count: number }>();

  const SETTLED_INCOME = new Set<string>(SETTLED_INCOME_STATUSES);
  const SETTLED_EXPENSE = new Set<string>(SETTLED_EXPENSE_STATUSES);
  const PENDING_INCOME = new Set<string>(PENDING_INCOME_STATUSES);
  const PENDING_EXPENSE = new Set<string>(PENDING_EXPENSE_STATUSES);

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
      if (row.talentId !== null && SETTLED_EXPENSE.has(row.status)) {
        pagosCreadores += amount;
      }
      if (row.campaignId !== null && row.talentId !== null && SETTLED_EXPENSE.has(row.status)) {
        comisionGastoTalentCampana += amount;
      }
    }

    monthMap.set(month, monthEntry);
    if (row.kind === 'expense') categoryMap.set(categoryKey, categoryEntry);
  }

  const margenBruto = ingresos - gastos;
  const margenPct = ingresos > 0 ? Math.round((margenBruto / ingresos) * 1000) / 10 : 0;
  const comisionAgencia = comisionIngresoCampana - comisionGastoTalentCampana;

  const breakdownByMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month,
      ingresos: value.ingresos,
      gastos: value.gastos,
      neto: value.ingresos - value.gastos,
    }));

  const breakdownByCategory = Array.from(categoryMap.entries())
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

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
  };
}

