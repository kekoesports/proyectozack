import type { PnLResult } from '@/lib/queries/pnl';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type Props = {
  readonly breakdown: PnLResult['breakdownByCategory'];
};

/**
 * Lista de top categorías de gasto del P&L (importe agregado y % sobre el total).
 *
 * @kind server
 * @feature admin/pnl
 * @route /admin/pl
 */
export function PnLCategoryList({ breakdown }: Props): React.ReactElement {
  if (breakdown.length === 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-8 text-center text-sm text-sp-admin-muted">
        Sin gastos registrados.
      </div>
    );
  }

  const max = Math.max(...breakdown.map((c) => c.total), 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <h3 className="border-b border-sp-admin-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">
        Top categorías de gasto
      </h3>
      <ul className="divide-y divide-sp-admin-border/60">
        {breakdown.map((row) => {
          const ratio = max > 0 ? Math.round((row.total / max) * 100) : 0;
          return (
            <li key={row.category} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm capitalize text-sp-admin-text">{row.category}</span>
                <span className="font-semibold tabular-nums text-amber-400">{EUR.format(row.total)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-sp-admin-bg">
                <div className="h-full rounded-full bg-amber-500/80" style={{ width: `${ratio}%` }} />
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-sp-admin-muted">
                {row.count} {row.count === 1 ? 'factura' : 'facturas'}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
