import type { NominasKpis } from '@/lib/queries/financeDashboard/nominasCreadores';

interface Props {
  readonly kpis: NominasKpis;
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
 * KPIs principales de la sección Nóminas y creadores.
 * Diferenciación explícita entre coste interno (nóminas + SS/autónomos)
 * y coste externo (pagos a talentos).
 */
export function NominasKpisBlock({ kpis }: Props): React.ReactElement {
  const primary: readonly Kpi[] = [
    {
      label: 'Total nóminas',
      value: fmt(kpis.totalNominas),
      semantic: 'neutral',
      hint: `${kpis.totalNominasCount} nómina${kpis.totalNominasCount === 1 ? '' : 's'} (nomina_socio)`,
    },
    {
      label: 'SS / autónomos',
      value: fmt(kpis.totalSeguridadSocial),
      semantic: 'neutral',
      hint: `${kpis.totalSeguridadSocialCount} recibo${kpis.totalSeguridadSocialCount === 1 ? '' : 's'}`,
    },
    {
      label: 'Pagado a talentos',
      value: fmt(kpis.totalTalentos),
      semantic: kpis.totalTalentos > 0 ? 'positive' : 'neutral',
      hint: `${kpis.totalTalentosCount} pago${kpis.totalTalentosCount === 1 ? '' : 's'} (pago_talento)`,
    },
    {
      label: 'Pendiente talentos',
      value: fmt(kpis.pendienteTalentos),
      semantic: kpis.pendienteTalentos > 0 ? 'attention' : 'positive',
      hint: kpis.pendienteTalentosCount > 0
        ? `${kpis.pendienteTalentosCount} pago${kpis.pendienteTalentosCount === 1 ? '' : 's'} sin liquidar`
        : 'Sin pendientes',
    },
    {
      label: 'Coste total personas',
      value: fmt(kpis.costeTotalPersonas),
      semantic: 'neutral',
      hint: 'Nóminas + SS/autónomos + talentos',
    },
  ];

  const secondary: readonly Kpi[] = [
    {
      label: 'Coste talento / ingresos',
      value: kpis.costeTalentoSobreIngresos !== null
        ? `${kpis.costeTalentoSobreIngresos}%`
        : '—',
      semantic: kpis.costeTalentoSobreIngresos === null ? 'neutral'
        : kpis.costeTalentoSobreIngresos > 60 ? 'negative'
        : kpis.costeTalentoSobreIngresos > 40 ? 'attention'
        : 'positive',
      hint: kpis.costeTalentoSobreIngresos !== null
        ? 'Pagos a talentos ÷ facturado del período'
        : 'Sin ingresos en el período',
    },
    {
      label: 'Top talento por coste',
      value: kpis.topTalentoPorCoste?.name ?? '—',
      semantic: 'neutral',
      hint: kpis.topTalentoPorCoste ? fmt(kpis.topTalentoPorCoste.amount) : 'Sin pagos registrados',
    },
    {
      label: 'Campañas con pendientes',
      value: `${kpis.campanasConPagosPendientes}`,
      semantic: kpis.campanasConPagosPendientes > 0 ? 'attention' : 'positive',
      hint: kpis.campanasConPagosPendientes > 0
        ? 'Campañas con talentos sin liquidar'
        : 'Todas las campañas al día',
    },
  ];

  return (
    <section aria-label="KPIs de nóminas y creadores" className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {primary.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {secondary.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
    </section>
  );
}
