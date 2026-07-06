import type { NominasCreadoresData } from '@/lib/queries/financeDashboard/nominasCreadores';

interface Props {
  readonly data: NominasCreadoresData;
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

interface Insight {
  readonly kind: 'positive' | 'warning' | 'neutral';
  readonly text: string;
}

function computeInsights({ data }: Props): readonly Insight[] {
  const insights: Insight[] = [];
  const { kpis, nominasRows, talentosRows } = data;

  if (nominasRows.length + talentosRows.length === 0) {
    return [{ kind: 'neutral', text: 'No hay nóminas ni pagos a talentos registrados en el período.' }];
  }

  if (kpis.totalNominasCount > 0) {
    insights.push({
      kind: 'neutral',
      text: `Este período hay ${kpis.totalNominasCount} nómina${kpis.totalNominasCount === 1 ? '' : 's'} registrada${kpis.totalNominasCount === 1 ? '' : 's'} por un total de ${fmt(kpis.totalNominas)}.`,
    });
  }

  if (kpis.totalTalentos > 0) {
    insights.push({
      kind: 'neutral',
      text: `Los pagos a talentos suman ${fmt(kpis.totalTalentos)}.`,
    });
  }

  if (kpis.pendienteTalentos > 0) {
    insights.push({
      kind: 'warning',
      text: `Tienes ${kpis.pendienteTalentosCount} pago${kpis.pendienteTalentosCount === 1 ? '' : 's'} pendiente${kpis.pendienteTalentosCount === 1 ? '' : 's'} con talentos (${fmt(kpis.pendienteTalentos)}).`,
    });
  } else if (kpis.totalTalentos > 0) {
    insights.push({ kind: 'positive', text: 'No hay pagos a talentos pendientes en el período.' });
  }

  if (kpis.topTalentoPorCoste) {
    insights.push({
      kind: 'neutral',
      text: `El mayor coste de talento corresponde a ${kpis.topTalentoPorCoste.name} (${fmt(kpis.topTalentoPorCoste.amount)}).`,
    });
  }

  if (kpis.costeTalentoSobreIngresos !== null && kpis.costeTalentoSobreIngresos > 0) {
    insights.push({
      kind: kpis.costeTalentoSobreIngresos > 60 ? 'warning'
        : kpis.costeTalentoSobreIngresos > 40 ? 'neutral'
        : 'positive',
      text: `Los pagos a talentos representan el ${kpis.costeTalentoSobreIngresos}% del facturado del período.`,
    });
  }

  if (kpis.campanasConPagosPendientes > 0) {
    insights.push({
      kind: 'warning',
      text: `${kpis.campanasConPagosPendientes} campaña${kpis.campanasConPagosPendientes === 1 ? '' : 's'} tiene${kpis.campanasConPagosPendientes === 1 ? '' : 'n'} talentos sin liquidar.`,
    });
  }

  return insights;
}

/**
 * Bloque "Lectura rápida" — texto natural derivado de KPIs. Sin
 * invenciones. Estado vacío honesto cuando no hay filas.
 */
export function NominasLecturaRapida(props: Props): React.ReactElement {
  const insights = computeInsights(props);
  const dot = (k: Insight['kind']): string =>
    k === 'positive' ? 'bg-emerald-500' : k === 'warning' ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <section aria-labelledby="lectura-nominas-title" className="rounded-2xl border border-sp-border bg-sp-admin-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>💡</span>
        <h2 id="lectura-nominas-title" className="text-sm font-bold text-sp-admin-fg">
          Lectura rápida de nóminas y creadores
        </h2>
      </div>
      <ul className="space-y-2">
        {insights.map((i, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-sm text-sp-admin-fg leading-snug">
            <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${dot(i.kind)}`} aria-hidden />
            <span>{i.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
