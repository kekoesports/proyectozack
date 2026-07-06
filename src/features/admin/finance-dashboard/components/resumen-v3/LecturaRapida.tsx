import type { FinanzasResumenV2 } from '@/types/finanzasResumen';

interface Props {
  readonly resumen: FinanzasResumenV2;
  readonly unclassifiedExpensesCount: number;
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function fmt(n: number): string { return EUR.format(n); }

interface Insight {
  readonly kind: 'positive' | 'warning' | 'neutral';
  readonly text: string;
}

function computeInsights({ resumen, unclassifiedExpensesCount }: Props): readonly Insight[] {
  const insights: Insight[] = [];
  const facturado = resumen.ingresos.facturados;
  const cobrado = resumen.ingresos.cobrados;
  const pendienteCobro = resumen.ingresos.pendientes;
  const costesDirectos = resumen.costesDirectos.total;
  const margenBrutoCobrado = resumen.margenBruto.cobrado;
  const margenBrutoPendiente = resumen.margenBruto.pendiente;
  const nominas = resumen.nominas.total;
  const impuestos = resumen.impuestos.total;
  const operativos = resumen.operativos.total;
  const resultado = resumen.resultado.operativo;
  const pagosTalentoPendientes = resumen.pendientes.pagosTalento.total;
  const pagosOperativoPendientes = resumen.pendientes.pagosOperativo.total;

  if (facturado > 0 && resultado > 0) {
    insights.push({ kind: 'positive', text: `En el período seleccionado has facturado ${fmt(facturado)} y el resultado operativo estimado es de ${fmt(resultado)}.` });
  } else if (facturado > 0 && resultado < 0) {
    insights.push({ kind: 'warning', text: `Estás gastando más de lo cobrado: facturado ${fmt(facturado)}, resultado operativo ${fmt(resultado)}.` });
  } else if (facturado === 0) {
    insights.push({ kind: 'neutral', text: 'Todavía no hay facturación registrada en el período seleccionado.' });
  }

  if (facturado > 0 && costesDirectos > 0) {
    const pct = Math.round((costesDirectos / facturado) * 100);
    insights.push({ kind: pct >= 60 ? 'warning' : 'neutral', text: `Los costes directos representan el ${pct}% de lo facturado (${fmt(costesDirectos)}).` });
  }

  if (margenBrutoPendiente !== 0) {
    insights.push({ kind: margenBrutoPendiente > 0 ? 'neutral' : 'warning', text: `Margen bruto pendiente estimado: ${fmt(margenBrutoPendiente)}.` });
  }

  const gastosEstructura = nominas + impuestos + operativos;
  if (gastosEstructura > 0 && margenBrutoCobrado > 0) {
    const cobertura = Math.round((margenBrutoCobrado / gastosEstructura) * 100);
    insights.push({ kind: cobertura >= 100 ? 'positive' : 'warning', text: `El margen bruto cobrado cubre el ${cobertura}% de la estructura de nóminas + impuestos + operativos (${fmt(gastosEstructura)}).` });
  }

  if (pendienteCobro > 0) {
    insights.push({ kind: 'warning', text: `Tienes ${fmt(pendienteCobro)} pendiente de cobrar en facturas emitidas.` });
  }

  const pagosPendientes = pagosTalentoPendientes + pagosOperativoPendientes;
  if (pagosPendientes > 0) {
    insights.push({ kind: 'warning', text: `Tienes ${fmt(pagosPendientes)} pendiente de pagar (${fmt(pagosTalentoPendientes)} a talentos + ${fmt(pagosOperativoPendientes)} operativos).` });
  }

  if (unclassifiedExpensesCount > 0) {
    insights.push({ kind: 'warning', text: `${unclassifiedExpensesCount} gasto${unclassifiedExpensesCount === 1 ? '' : 's'} sin clasificar — clasifícalos para que el reparto por categoría sea correcto.` });
  }

  if (facturado > 0 && cobrado > 0) {
    const pct = Math.round((cobrado / facturado) * 100);
    insights.push({ kind: pct >= 80 ? 'positive' : pct >= 50 ? 'neutral' : 'warning', text: `Has cobrado ${fmt(cobrado)} de ${fmt(facturado)} facturados (${pct}%).` });
  }

  return insights;
}

/**
 * Bloque "Lectura rápida" — texto en lenguaje natural derivado de KPIs.
 * Sin invenciones: cada línea es una lectura directa de un dato real.
 * Estado vacío honesto cuando no hay facturación.
 */
export function LecturaRapida(props: Props): React.ReactElement {
  const insights = computeInsights(props);
  const dotColor = (kind: Insight['kind']): string =>
    kind === 'positive' ? 'bg-emerald-500'
    : kind === 'warning' ? 'bg-amber-500'
    : 'bg-slate-400';

  return (
    <section aria-labelledby="lectura-rapida-title" className="rounded-2xl border border-sp-border bg-sp-admin-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>💡</span>
        <h2 id="lectura-rapida-title" className="text-sm font-bold text-sp-admin-fg">Lectura rápida</h2>
      </div>
      {insights.length === 0 ? (
        <p className="text-sm text-sp-admin-muted italic">
          Sin datos suficientes para una lectura. Registra facturas o importa un extracto bancario para empezar.
        </p>
      ) : (
        <ul className="space-y-2">
          {insights.map((i, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-sp-admin-fg leading-snug">
              <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${dotColor(i.kind)}`} aria-hidden />
              <span>{i.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
