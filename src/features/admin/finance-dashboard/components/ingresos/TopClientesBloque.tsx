import type { TopClienteRow } from '@/lib/queries/financeDashboard/ingresos';

interface Props {
  readonly rows: readonly TopClienteRow[];
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

/**
 * Top 5 clientes por pendiente de cobro. Deriva del aging.rows.
 */
export function TopClientesBloque({ rows }: Props): React.ReactElement {
  return (
    <section aria-labelledby="top-clientes-title" className="rounded-2xl border border-sp-border bg-sp-admin-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>👥</span>
        <h2 id="top-clientes-title" className="text-sm font-bold text-sp-admin-fg">Clientes con más pendiente de cobro</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-emerald-500 font-medium">
          <span aria-hidden>✅</span> Nadie con deuda pendiente.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-3 rounded-lg border border-sp-border/60 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sp-admin-fg truncate">{r.name}</p>
                <p className="text-[11px] text-sp-admin-muted mt-0.5">
                  {r.invoiceCount} factura{r.invoiceCount === 1 ? '' : 's'}
                  {r.lastInvoiceDate ? ` · última ${r.lastInvoiceDate}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums text-amber-500">{fmt(r.pendingAmount)}</p>
                {r.overdueAmount > 0 ? (
                  <p className="text-[11px] font-medium text-red-400 tabular-nums">
                    Vencido: {fmt(r.overdueAmount)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
