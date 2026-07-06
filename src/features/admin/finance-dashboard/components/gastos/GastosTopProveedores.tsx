import type { GastosTopProveedor } from '@/lib/queries/financeDashboard/gastos';

interface Props {
  readonly rows: readonly GastosTopProveedor[];
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

/**
 * Top 8 proveedores/conceptos por importe. Derivado en memoria de las
 * filas del periodo — no ejecuta queries extra.
 */
export function GastosTopProveedoresBloque({ rows }: Props): React.ReactElement {
  return (
    <section aria-labelledby="top-prov-title" className="rounded-2xl border border-sp-border bg-sp-admin-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>🏢</span>
        <h2 id="top-prov-title" className="text-sm font-bold text-sp-admin-fg">Top proveedores por gasto</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-sp-admin-muted italic">Sin gastos registrados en el período.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, idx) => (
            <li key={r.name} className="flex items-center justify-between gap-3 rounded-lg border border-sp-border/60 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[11px] font-bold text-sp-admin-muted tabular-nums w-5">#{idx + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sp-admin-fg truncate">{r.name}</p>
                  <p className="text-[11px] text-sp-admin-muted mt-0.5">
                    {r.count} factura{r.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold tabular-nums text-sp-admin-fg shrink-0">{fmt(r.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
