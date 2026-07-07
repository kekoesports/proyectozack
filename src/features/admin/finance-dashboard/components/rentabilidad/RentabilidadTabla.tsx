import Link from 'next/link';
import type { RentabilidadEstado, RentabilidadRow } from '@/lib/queries/financeDashboard/rentabilidad';

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmtMoney(n: number): string { return EUR.format(n); }
function fmtPct(n: number | null): string { return n === null ? '—' : `${n.toFixed(1)}%`; }

const ESTADO_LABELS: Record<RentabilidadEstado, string> = {
  rentable:                  'Rentable',
  bajo:                      'Margen bajo',
  negativo:                  'Negativa',
  sin_datos:                 'Sin datos',
  sin_ejecucion_suficiente:  'Sin ejecución suficiente',
};

const ESTADO_BADGE: Record<RentabilidadEstado, string> = {
  rentable:                  'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
  bajo:                      'bg-amber-500/15  text-amber-500  border border-amber-500/30',
  negativo:                  'bg-red-500/15    text-red-500    border border-red-500/30',
  sin_datos:                 'bg-slate-500/15  text-slate-400  border border-slate-500/30',
  sin_ejecucion_suficiente:  'bg-slate-500/15  text-slate-400  border border-slate-500/30',
};

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  propuesta:      'Propuesta',
  negociacion:    'Negociación',
  aprobada:       'Aprobada',
  activa:         'Activa',
  completada:     'Completada',
  cancelada:      'Cancelada',
  pendiente_pago: 'Pendiente pago',
  pagada:         'Pagada',
};

function deviationClass(pct: number | null): string {
  if (pct === null) return 'text-sp-admin-muted';
  if (pct < -5)  return 'text-red-500 font-semibold';
  if (pct < 0)   return 'text-amber-500';
  return 'text-emerald-500';
}

type Props = {
  readonly rows: readonly RentabilidadRow[];
  readonly totalRows: number;
};

export function RentabilidadTabla({ rows, totalRows }: Props): React.ReactElement {
  return (
    <section aria-labelledby="rentabilidad-tabla-title" className="rounded-2xl border border-sp-border bg-sp-admin-card overflow-hidden">
      <div className="px-4 py-3 border-b border-sp-border flex items-baseline justify-between gap-3">
        <div>
          <h2 id="rentabilidad-tabla-title" className="text-sm font-bold text-sp-admin-fg">Rentabilidad por campaña</h2>
          <p className="text-[11px] text-sp-admin-muted mt-0.5">
            Margen pactado vs margen real facturado · desviación en puntos porcentuales.
          </p>
        </div>
        <p className="text-[11px] text-sp-admin-muted tabular-nums">
          {rows.length}/{totalRows} campañas
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-sp-admin-muted italic">
            {totalRows === 0
              ? 'No hay campañas en el período seleccionado.'
              : 'Ningún resultado con los filtros actuales.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-border bg-sp-admin-card/60">
                {[
                  'Campaña', 'Marca', 'Talento', 'Estado',
                  'Ingr. pactados', 'Coste pactado', 'Margen pactado',
                  'Ingr. reales', 'Costes reales', 'Margen real',
                  'Desviación', 'Estado visual',
                ].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-sp-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                  <td className="px-3 py-2 text-[12px] text-sp-admin-fg font-medium max-w-[180px] truncate">
                    <Link href={`/admin/campanas/${row.id}`} className="hover:text-sp-admin-accent transition-colors">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-sp-admin-muted max-w-[120px] truncate">{row.brandName ?? '—'}</td>
                  <td className="px-3 py-2 text-[11px] text-sp-admin-muted max-w-[120px] truncate">{row.talentName ?? '—'}</td>
                  <td className="px-3 py-2 text-[10px] text-sp-admin-muted whitespace-nowrap">
                    {CAMPAIGN_STATUS_LABELS[row.status] ?? row.status}
                  </td>
                  <td className="px-3 py-2 text-[12px] tabular-nums text-right text-sp-admin-fg whitespace-nowrap">
                    {fmtMoney(row.amountBrand)}
                  </td>
                  <td className="px-3 py-2 text-[12px] tabular-nums text-right text-sp-admin-muted whitespace-nowrap">
                    {fmtMoney(row.amountTalent)}
                  </td>
                  <td className="px-3 py-2 text-[12px] tabular-nums text-right whitespace-nowrap">
                    <span className="text-sp-admin-fg">
                      {row.margenPactado !== null ? fmtMoney(row.margenPactado) : '—'}
                    </span>
                    <span className="ml-1 text-[10px] text-sp-admin-muted">
                      ({fmtPct(row.margenPactadoPct)})
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[12px] tabular-nums text-right text-emerald-500 whitespace-nowrap">
                    {fmtMoney(row.ingresosReales)}
                  </td>
                  <td className="px-3 py-2 text-[12px] tabular-nums text-right text-amber-500 whitespace-nowrap">
                    {fmtMoney(row.costesReales)}
                  </td>
                  <td className="px-3 py-2 text-[12px] tabular-nums text-right whitespace-nowrap">
                    <span className="text-sp-admin-fg font-bold">
                      {row.margenReal !== null ? fmtMoney(row.margenReal) : '—'}
                    </span>
                    <span className="ml-1 text-[10px] text-sp-admin-muted">
                      ({fmtPct(row.margenRealPct)})
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-[12px] tabular-nums text-right whitespace-nowrap ${deviationClass(row.desviacionPct)}`}>
                    {row.desviacionPct !== null ? `${row.desviacionPct > 0 ? '+' : ''}${row.desviacionPct.toFixed(1)} pp` : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-block ${ESTADO_BADGE[row.estado]}`}>
                      {ESTADO_LABELS[row.estado]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
