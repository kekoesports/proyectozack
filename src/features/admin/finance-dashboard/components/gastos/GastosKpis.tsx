import type { GastosKpis } from '@/lib/queries/financeDashboard/gastos';

interface Props {
  readonly kpis: GastosKpis;
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

type Semantic = 'positive' | 'attention' | 'negative' | 'neutral';

interface Kpi {
  readonly label: string;
  readonly value: string;
  readonly semantic: Semantic;
  readonly hint?: string;
}

const COLORS: Record<Semantic, string> = {
  positive:  '#16a34a',
  attention: '#f59e0b',
  negative:  '#ef4444',
  neutral:   '#6b7280',
};

function KpiCard({ kpi }: { kpi: Kpi }): React.ReactElement {
  const color = COLORS[kpi.semantic];
  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-border overflow-hidden">
      <div className="h-[3px]" style={{ background: color }} />
      <div className="px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sp-admin-muted leading-none">
          {kpi.label}
        </p>
        <p className="text-[19px] font-bold tabular-nums mt-2 leading-none" style={{ color }}>
          {kpi.value}
        </p>
        {kpi.hint ? (
          <p className="text-[10px] font-medium text-sp-admin-muted mt-1.5 leading-tight">{kpi.hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * KPIs propios de la sección Gastos — 8 tarjetas con label + valor +
 * subtexto + color semántico. Sin clasificar destaca en ámbar cuando >0.
 */
export function GastosKpisBlock({ kpis }: Props): React.ReactElement {
  const primary: readonly Kpi[] = [
    {
      label: 'Gasto total',
      value: fmt(kpis.gastoTotal),
      semantic: 'neutral',
      hint: 'Total gastos registrados en el período',
    },
    {
      label: 'Pagado',
      value: fmt(kpis.pagado),
      semantic: kpis.pagado > 0 ? 'positive' : 'neutral',
      hint: 'Estado factura = pagada / cobrada',
    },
    {
      label: 'Pendiente de pago',
      value: fmt(kpis.pendientePago),
      semantic: kpis.pendientePago > 0 ? 'attention' : 'positive',
      hint: 'Estado pendiente / parcial / vencida',
    },
    {
      label: 'Costes directos',
      value: fmt(kpis.costesDirectos),
      semantic: 'neutral',
      hint: 'Grupo campaign_direct',
    },
    {
      label: 'Operativos',
      value: fmt(kpis.gastosOperativos),
      semantic: 'neutral',
      hint: 'Grupo operational',
    },
  ];

  const secondary: readonly Kpi[] = [
    {
      label: 'Sin clasificar',
      value: `${kpis.sinClasificar.count}`,
      semantic: kpis.sinClasificar.count > 0 ? 'attention' : 'positive',
      hint: kpis.sinClasificar.count > 0 ? fmt(kpis.sinClasificar.amount) : 'Todos clasificados',
    },
    {
      label: 'Proveedor principal',
      value: kpis.proveedorPrincipal ? kpis.proveedorPrincipal.name : '—',
      semantic: 'neutral',
      hint: kpis.proveedorPrincipal ? fmt(kpis.proveedorPrincipal.amount) : 'Sin datos',
    },
    {
      label: 'Mayor categoría',
      value: kpis.mayorCategoria ? kpis.mayorCategoria.label : '—',
      semantic: 'neutral',
      hint: kpis.mayorCategoria ? fmt(kpis.mayorCategoria.amount) : 'Sin datos',
    },
  ];

  return (
    <section aria-label="KPIs de gastos" className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {primary.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {secondary.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
    </section>
  );
}
