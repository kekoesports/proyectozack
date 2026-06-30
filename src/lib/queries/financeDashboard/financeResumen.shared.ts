/**
 * Tipos, constantes y helpers puros del módulo finanzas/resumen.
 *
 * Importable desde Client Components — NO depende de @/lib/db ni @/lib/env.
 * Las queries de DB viven en financeResumen.ts (server-only) y re-exportan
 * desde aquí para mantener una sola fuente de verdad de tipos/constantes.
 *
 * Antes de este split, FinanceMonthlyControl (client) importaba símbolos
 * puros desde financeResumen.ts, arrastrando @/lib/db al bundle cliente
 * y disparando "Attempted to access a server-side environment variable on the client".
 */

// ── Tipos compartidos ──────────────────────────────────────────────────────

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

// ── Constantes ─────────────────────────────────────────────────────────────

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
  nomina_socio: 'Nóminas socios',
  seguro_medico: 'Seguro médico',
  seguridad_social: 'Seguridad Social',
};

// ── Helpers puros ──────────────────────────────────────────────────────────

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
