import type { RentabilidadKpis } from '@/lib/queries/financeDashboard/rentabilidad';

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmtMoney(n: number): string { return EUR.format(n); }
function fmtPct(n: number | null): string { return n === null ? 'Sin datos' : `${n.toFixed(1)}%`; }

type KpiCardProps = {
  readonly label: string;
  readonly value: string;
  readonly accent: string;
  readonly sub?: string;
  readonly subAccent?: string;
};

function KpiCard({ label, value, accent, sub, subAccent }: KpiCardProps): React.ReactElement {
  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-border overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted leading-none">{label}</p>
        <p className="text-[17px] font-bold tabular-nums mt-1.5 leading-none" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-[9px] font-semibold mt-1 leading-none" style={{ color: subAccent ?? '#6b7280' }}>{sub}</p>}
      </div>
    </div>
  );
}

/**
 * Bloque de 8 KPIs de rentabilidad (PR 6A brief).
 * Pactado vs Real + conteos por estado + mayor desviación negativa.
 */
export function RentabilidadKpisBlock({ kpis }: { readonly kpis: RentabilidadKpis }): React.ReactElement {
  const worst = kpis.mayorDesviacionNegativa;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Ingresos pactados"        value={fmtMoney(kpis.ingresosPactados)}        accent="#5b9bd5" />
        <KpiCard label="Margen pactado medio"     value={fmtPct(kpis.margenPactadoMedio)}        accent="#8b3aad" />
        <KpiCard label="Ingresos reales asoc."    value={fmtMoney(kpis.ingresosRealesAsociados)} accent="#16a34a" />
        <KpiCard label="Margen real medio"        value={fmtPct(kpis.margenRealMedio)}
          accent={kpis.margenRealMedio !== null && kpis.margenRealMedio >= 20 ? '#16a34a' : '#f59e0b'} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Campañas rentables"       value={String(kpis.campanasRentables)}         accent="#16a34a" />
        <KpiCard label="Campañas margen bajo"     value={String(kpis.campanasMargenBajo)}        accent="#f59e0b" />
        <KpiCard label="Campañas negativas"       value={String(kpis.campanasNegativas)}         accent="#ef4444" />
        <KpiCard
          label="Mayor desviación negativa"
          value={worst ? `${worst.deviation.toFixed(1)}%` : 'Sin datos'}
          accent="#ef4444"
          {...(worst ? { sub: worst.name } : {})}
        />
      </div>
    </div>
  );
}
