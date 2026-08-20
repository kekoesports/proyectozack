import type { RevenueBreakdown, ExclusionReason } from '@/lib/finance/revenue.shared';

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

const MOTIVO: Record<ExclusionReason, string> = {
  espejo: 'Espejo de una factura emitida — ya cuenta en la emitida',
  anulada: 'Anulada',
  borrador: 'Borrador, aún no emitida',
};

type Props = { readonly breakdown: RevenueBreakdown };

/**
 * La cifra, sus componentes y sus descartes. Server Component: no hay estado ni
 * interacción, solo lectura.
 */
export function DesgloseTabla({ breakdown }: Props): React.ReactElement {
  const incluidas = breakdown.rows.filter((r) => r.excluded === null);
  const excluidas = breakdown.rows.filter((r) => r.excluded !== null);
  const { totals } = breakdown;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-sp-admin-border/60 p-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
              Facturado en el periodo
            </p>
            <p className="text-4xl font-black tabular-nums">{EUR.format(totals.eur)}</p>
          </div>
          <p className="text-sm text-sp-admin-muted">
            {totals.count} factura{totals.count === 1 ? '' : 's'}
            {excluidas.length > 0 && ` · ${excluidas.length} fuera del total`}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['T1', 'T2', 'T3', 'T4'] as const).map((q) => (
            <div key={q} className="rounded-xl border border-sp-admin-border/40 p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
                {q}
              </dt>
              <dd className="text-lg font-black tabular-nums">{EUR.format(totals.byQuarter[q])}</dd>
            </div>
          ))}
        </dl>
      </section>

      {breakdown.warnings.length > 0 && (
        <section className="flex flex-col gap-2">
          {breakdown.warnings.map((w) => (
            <div
              key={w.code}
              className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm"
            >
              <p className="font-semibold text-amber-300">
                {w.count} {w.count === 1 ? 'movimiento' : 'movimientos'} a revisar
              </p>
              <p className="text-sp-admin-muted">{w.message}</p>
              <p className="mt-1 text-[11px] text-sp-admin-muted">
                Referencias: {w.rowIds.join(', ')}
              </p>
            </div>
          ))}
        </section>
      )}

      <Tabla
        titulo="Lo que compone la cifra"
        filas={incluidas}
        pie={EUR.format(totals.eur)}
      />

      {excluidas.length > 0 && (
        <Tabla titulo="Lo que se quedó fuera" filas={excluidas} pie={null} />
      )}

      {totals.byCounterparty.length > 0 && (
        <section className="rounded-2xl border border-sp-admin-border/60 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
            Por contraparte
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {totals.byCounterparty.map((c) => (
              <li key={c.key} className="flex items-baseline justify-between gap-4">
                <span className="truncate">{c.key}</span>
                <span className="shrink-0 tabular-nums text-sp-admin-muted">
                  {c.count}× · <strong className="text-sp-admin-fg">{EUR.format(c.eur)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── Tabla ──────────────────────────────────────────────────────────────────

function Tabla({ titulo, filas, pie }: {
  readonly titulo: string;
  readonly filas: RevenueBreakdown['rows'];
  readonly pie: string | null;
}): React.ReactElement {
  return (
    <section className="rounded-2xl border border-sp-admin-border/60">
      <h2 className="border-b border-sp-admin-border/60 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
        {titulo}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-sp-admin-muted">
              <th className="px-4 py-2 font-semibold">Fecha</th>
              <th className="px-4 py-2 font-semibold">Origen</th>
              <th className="px-4 py-2 font-semibold">Contraparte</th>
              <th className="px-4 py-2 font-semibold">Concepto</th>
              <th className="px-4 py-2 font-semibold">Estado</th>
              <th className="px-4 py-2 text-right font-semibold">Importe</th>
              <th className="px-4 py-2 text-right font-semibold">En el total</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ row, excluded, eur }) => (
              <tr key={`${row.source}-${row.id}`} className="border-t border-sp-admin-border/40">
                <td className="whitespace-nowrap px-4 py-2 tabular-nums">{row.issueDate}</td>
                <td className="px-4 py-2 text-sp-admin-muted">
                  {row.source === 'issued' ? 'Factura emitida' : 'Libro de gestión'}
                </td>
                <td className="px-4 py-2">{row.counterparty ?? '—'}</td>
                <td className="max-w-xs truncate px-4 py-2 text-sp-admin-muted">
                  {row.concept ?? '—'}
                </td>
                <td className="px-4 py-2 text-sp-admin-muted">{row.status}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                  {row.totalAmount.toFixed(2)} {row.currency}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                  {eur !== null ? (
                    EUR.format(eur)
                  ) : (
                    <span className="text-[11px] text-sp-admin-muted">
                      {excluded ? MOTIVO[excluded] : '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {pie !== null && (
            <tfoot>
              <tr className="border-t border-sp-admin-border">
                <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold">
                  Total
                </td>
                <td className="px-4 py-3 text-right text-base font-black tabular-nums">{pie}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
