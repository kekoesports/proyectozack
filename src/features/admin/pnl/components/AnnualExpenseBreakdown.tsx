import type { ExpenseSubgroupKey, ExpenseSubgroupRow } from '@/lib/queries/financeDashboard/expenseSubgroups';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/**
 * Detecta si el rango corresponde al año en curso (desde 1-ene hasta hoy).
 * Se usa solo para elegir el título: "este año" vs "este periodo".
 */
function isYearToDateRange(from: string, to: string): boolean {
  const now = new Date();
  const y = now.getFullYear();
  const yearStart = `${y}-01-01`;
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today = `${y}-${mm}-${dd}`;
  return from === yearStart && to === today;
}

function barColor(key: ExpenseSubgroupKey): string {
  switch (key) {
    case 'nomina_pablo':
    case 'nomina_alfonso':
    case 'nomina_otros':
      return 'bg-red-500/70';
    case 'cuota_pablo':
    case 'cuota_alfonso':
    case 'cuota_otros':
    case 'seguridad_social':
      return 'bg-orange-500/70';
    case 'pagos_talentos':
    case 'campana_otros':
      return 'bg-red-400/60';
    case 'sin_clasificar':
      return 'bg-amber-500/70';
    default:
      return 'bg-red-500/50';
  }
}

function amountColor(key: ExpenseSubgroupKey): string {
  return key === 'sin_clasificar' ? 'text-amber-400' : 'text-red-400';
}

function facturasLabel(count: number): string {
  return count === 1 ? '1 factura' : `${count} facturas`;
}

type Props = {
  readonly rows: readonly ExpenseSubgroupRow[];
  readonly totalExpense: number;
  readonly from: string;
  readonly to: string;
};

/**
 * Desglose visual de gastos por subgrupo humano (Nóminas Pablo, Software / IA,
 * Cuota autónomo Alfonso, …). Ordenado DESC por importe.
 *
 * @kind server
 * @feature admin/pnl
 * @route /admin/finanzas/pl
 */
export function AnnualExpenseBreakdown({ rows, totalExpense, from, to }: Props): React.ReactElement {
  const title = isYearToDateRange(from, to)
    ? 'Dónde se ha ido el dinero este año'
    : 'Dónde se ha ido el dinero en este periodo';

  if (rows.length === 0 || totalExpense <= 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
          {title}
        </p>
        <p className="py-4 text-center text-sm text-sp-admin-muted">
          No hay gastos registrados en este rango.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
          {title}
        </p>
        <p className="text-xs text-sp-admin-muted">
          Total gastos: <span className="tabular-nums text-sp-admin-fg">{EUR.format(totalExpense)}</span>
        </p>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => {
          const pctLabel = totalExpense > 0 ? `${r.pct.toFixed(0)}%` : '—';
          return (
            <li key={r.key}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-sm text-sp-admin-fg">
                  {r.label}
                  <span className="ml-2 text-xs text-sp-admin-muted">· {facturasLabel(r.count)}</span>
                </span>
                <span className={`tabular-nums text-sm ${amountColor(r.key)}`}>
                  {EUR.format(r.amount)}
                  <span className="text-sp-admin-muted"> · {pctLabel}</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sp-admin-border">
                <div
                  className={`h-full rounded-full ${barColor(r.key)}`}
                  style={{ width: `${Math.min(r.pct, 100).toFixed(1)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
