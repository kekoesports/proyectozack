import type { IngresosKpis } from '@/lib/queries/financeDashboard/ingresos';

interface Props {
  readonly kpis: IngresosKpis;
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
 * KPIs propios de la sección Ingresos.
 *
 * Distinción explícita entre "Facturado" (importe emitido) y "Cobrado"
 * (pagos aplicados). Cuando `invoice_payments = 0` el cobrado será 0 y
 * el aviso `BankDataWarning` (upstream) contextualiza el dato.
 */
export function IngresosKpisBlock({ kpis }: Props): React.ReactElement {
  const primary: readonly Kpi[] = [
    {
      label: 'Facturado total',
      value: fmt(kpis.facturadoTotal),
      semantic: 'neutral',
      hint: 'Importe emitido en el período (interno + emitidas)',
    },
    {
      label: 'Cobrado total',
      value: fmt(kpis.cobradoTotal),
      semantic: kpis.cobradoTotal > 0 ? 'positive' : 'neutral',
      hint: 'Pagos aplicados desde conciliación',
    },
    {
      label: 'Pendiente de cobro',
      value: fmt(kpis.pendienteCobro),
      semantic: kpis.pendienteCobro > 0 ? 'attention' : 'positive',
      hint: `${kpis.facturasPendientes} factura${kpis.facturasPendientes === 1 ? '' : 's'} viva${kpis.facturasPendientes === 1 ? '' : 's'}`,
    },
    {
      label: 'Vencido',
      value: fmt(kpis.vencido),
      semantic: kpis.vencido > 0 ? 'negative' : 'positive',
      hint: 'Pendiente con vencimiento pasado',
    },
    {
      label: 'Por vencer',
      value: fmt(kpis.porVencer),
      semantic: 'attention',
      hint: 'Pendiente aún dentro de plazo',
    },
  ];

  const secondary: readonly Kpi[] = [
    {
      label: 'Promedio días de cobro',
      value: kpis.promedioDiasCobro !== null ? `${kpis.promedioDiasCobro} días` : '—',
      semantic: kpis.promedioDiasCobro === null
        ? 'neutral'
        : kpis.promedioDiasCobro > 60 ? 'negative'
        : kpis.promedioDiasCobro > 30 ? 'attention'
        : 'positive',
      hint: 'Promedio en las facturas vencidas',
    },
    {
      label: 'Cliente con mayor deuda',
      value: kpis.clienteMayorDeuda
        ? kpis.clienteMayorDeuda.name
        : 'Sin deuda',
      semantic: kpis.clienteMayorDeuda ? 'attention' : 'positive',
      hint: kpis.clienteMayorDeuda
        ? fmt(kpis.clienteMayorDeuda.amount)
        : 'Todas las facturas al día',
    },
    {
      label: 'Facturas pendientes',
      value: `${kpis.facturasPendientes}`,
      semantic: kpis.facturasPendientes > 0 ? 'attention' : 'positive',
      hint: 'Nº total viviendo aging',
    },
  ];

  return (
    <section aria-label="KPIs de ingresos" className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {primary.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {secondary.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
    </section>
  );
}
