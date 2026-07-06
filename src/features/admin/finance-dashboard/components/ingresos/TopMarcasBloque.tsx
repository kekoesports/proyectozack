import type { TopMarcaRow } from '@/lib/queries/financeDashboard/ingresos';

interface Props {
  readonly rows: readonly TopMarcaRow[];
  readonly variant: 'facturado' | 'pendiente';
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

/**
 * Top marcas — dos variantes:
 *   - facturado: ranking por importe facturado en el período
 *   - pendiente: ranking por importe pendiente vivo
 */
export function TopMarcasBloque({ rows, variant }: Props): React.ReactElement {
  const title = variant === 'facturado' ? 'Top marcas por facturación' : 'Top marcas por pendiente';
  const icon = variant === 'facturado' ? '🏆' : '⚠️';
  const emptyText = variant === 'facturado'
    ? 'Sin facturación registrada en el período.'
    : 'Sin marcas con pendiente vivo.';
  const emptyClass = variant === 'facturado' ? 'text-sp-admin-muted' : 'text-emerald-500 font-medium';

  return (
    <section aria-labelledby={`top-marcas-${variant}-title`} className="rounded-2xl border border-sp-border bg-sp-admin-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>{icon}</span>
        <h2 id={`top-marcas-${variant}-title`} className="text-sm font-bold text-sp-admin-fg">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className={`text-sm italic ${emptyClass}`}>
          {variant === 'pendiente' ? <span aria-hidden>✅ </span> : null}{emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, idx) => {
            const primaryAmount = variant === 'facturado' ? r.invoicedTotal : r.pendingAmount;
            const primaryColor = variant === 'facturado' ? 'text-emerald-500' : 'text-amber-500';
            return (
              <li key={r.name} className="flex items-center justify-between gap-3 rounded-lg border border-sp-border/60 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-sp-admin-muted tabular-nums w-5">#{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-sp-admin-fg truncate">{r.name}</p>
                    <p className="text-[11px] text-sp-admin-muted mt-0.5">
                      {r.invoiceCount} factura{r.invoiceCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-bold tabular-nums shrink-0 ${primaryColor}`}>{fmt(primaryAmount)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
