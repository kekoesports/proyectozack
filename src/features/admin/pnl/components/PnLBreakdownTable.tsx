import type { PnLResult } from '@/lib/queries/pnl';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function formatMonth(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNumber = Number(monthStr);
  if (!yearStr || !monthStr || Number.isNaN(year) || Number.isNaN(monthNumber)) return month;
  const date = new Date(year, monthNumber - 1, 1);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

type Props = {
  readonly breakdown: PnLResult['breakdownByMonth'];
};

/**
 * Tabla mensual del P&L con ingresos, gastos y resultado por mes (EUR).
 *
 * @kind server
 * @feature admin/pnl
 * @route /admin/pl
 */
export function PnLBreakdownTable({ breakdown }: Props): React.ReactElement {
  if (breakdown.length === 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-8 text-center text-sm text-sp-admin-muted">
        No hay datos para los filtros activos.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sp-admin-border bg-sp-admin-bg/40 text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">
            <th className="px-5 py-3 text-left">Mes</th>
            <th className="px-5 py-3 text-right">Ingresos</th>
            <th className="px-5 py-3 text-right">Gastos</th>
            <th className="px-5 py-3 text-right">Neto</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row) => (
            <tr key={row.month} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover/40">
              <td className="px-5 py-3 text-sp-admin-text capitalize">{formatMonth(row.month)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-emerald-400">{EUR.format(row.ingresos)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-amber-400">{EUR.format(row.gastos)}</td>
              <td className={`px-5 py-3 text-right tabular-nums ${row.neto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {EUR.format(row.neto)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
