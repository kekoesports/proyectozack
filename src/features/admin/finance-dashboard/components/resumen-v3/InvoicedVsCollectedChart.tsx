'use client';

import type { FinanzasResumenV2 } from '@/types/finanzasResumen';

interface Props {
  readonly resumen: FinanzasResumenV2;
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

/**
 * Facturado vs cobrado — chart minimalista de progreso YTD (barra
 * horizontal apilada). No usa recharts para que quede muy ligero, porque
 * son solo 2 magnitudes.
 */
export function InvoicedVsCollectedChart({ resumen }: Props): React.ReactElement {
  const facturado = resumen.ingresos.facturados;
  const cobrado = resumen.ingresos.cobrados;
  const pendiente = resumen.ingresos.pendientes;
  const total = Math.max(facturado, cobrado);
  const cobradoPct = total > 0 ? Math.round((cobrado / total) * 100) : 0;
  const pendientePct = total > 0 ? Math.round((pendiente / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-sp-admin-fg">Facturado vs cobrado</h3>
        <span className="text-[10px] text-sp-admin-muted">Período seleccionado</span>
      </div>

      {facturado === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-sp-admin-muted italic">
          Sin facturación en el período seleccionado.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] text-sp-admin-muted uppercase tracking-wide font-semibold">Facturado</span>
                <span className="text-sm font-bold text-sp-admin-fg tabular-nums">{fmt(facturado)}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-500/15 overflow-hidden">
                <div className="h-full bg-slate-500" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] text-emerald-500 uppercase tracking-wide font-semibold">Cobrado</span>
                <span className="text-sm font-bold text-emerald-500 tabular-nums">{fmt(cobrado)} <span className="text-[10px] font-medium opacity-70">({cobradoPct}%)</span></span>
              </div>
              <div className="h-3 rounded-full bg-emerald-500/15 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${cobradoPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] text-amber-500 uppercase tracking-wide font-semibold">Pendiente cobro</span>
                <span className="text-sm font-bold text-amber-500 tabular-nums">{fmt(pendiente)} <span className="text-[10px] font-medium opacity-70">({pendientePct}%)</span></span>
              </div>
              <div className="h-3 rounded-full bg-amber-500/15 overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${pendientePct}%` }} />
              </div>
            </div>
          </div>
          {cobrado === 0 && pendiente > 0 ? (
            <p className="text-[11px] text-sp-admin-muted mt-3 italic">
              El indicador de cobrado se calcula con pagos conciliados; si no hay extractos bancarios importados aparecerá a 0 aunque hayas cobrado.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
