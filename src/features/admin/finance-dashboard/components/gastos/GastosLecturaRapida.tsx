import type { GastosData } from '@/lib/queries/financeDashboard/gastos';

interface Props {
  readonly data: GastosData;
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

interface Insight {
  readonly kind: 'positive' | 'warning' | 'neutral';
  readonly text: string;
}

function computeInsights({ data }: Props): readonly Insight[] {
  const insights: Insight[] = [];
  const { kpis, rows, sinClasificarRows } = data;

  if (rows.length === 0) {
    return [{ kind: 'neutral', text: 'No hay gastos registrados en el período seleccionado.' }];
  }

  // 1. Sin clasificar.
  if (sinClasificarRows.length > 0) {
    insights.push({
      kind: 'warning',
      text: `Tienes ${sinClasificarRows.length} gasto${sinClasificarRows.length === 1 ? '' : 's'} sin clasificar (${fmt(kpis.sinClasificar.amount)}). Clasifícalos para que el reparto sea correcto.`,
    });
  } else {
    insights.push({ kind: 'positive', text: 'Todos los gastos del período están clasificados.' });
  }

  // 2. Ratio costes directos.
  if (kpis.gastoTotal > 0 && kpis.costesDirectos > 0) {
    const pct = Math.round((kpis.costesDirectos / kpis.gastoTotal) * 100);
    insights.push({
      kind: pct >= 60 ? 'warning' : 'neutral',
      text: `Los costes directos representan el ${pct}% del gasto total (${fmt(kpis.costesDirectos)}).`,
    });
  }

  // 3. Mayor categoría.
  if (kpis.mayorCategoria) {
    insights.push({
      kind: 'neutral',
      text: `La mayor categoría es "${kpis.mayorCategoria.label}" con ${fmt(kpis.mayorCategoria.amount)}.`,
    });
  }

  // 4. Proveedor principal.
  if (kpis.proveedorPrincipal) {
    insights.push({
      kind: 'neutral',
      text: `El proveedor principal es ${kpis.proveedorPrincipal.name} (${fmt(kpis.proveedorPrincipal.amount)}).`,
    });
  }

  // 5. Pendientes de pago.
  if (kpis.pendientePago > 0) {
    insights.push({
      kind: 'warning',
      text: `Hay ${fmt(kpis.pendientePago)} pendiente de pagar en gastos registrados.`,
    });
  }

  return insights;
}

/**
 * Bloque "Lectura rápida de gastos" — texto en lenguaje natural derivado
 * de KPIs. Sin invenciones.
 */
export function GastosLecturaRapida(props: Props): React.ReactElement {
  const insights = computeInsights(props);
  const dot = (k: Insight['kind']): string =>
    k === 'positive' ? 'bg-emerald-500' : k === 'warning' ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <section aria-labelledby="lectura-gastos-title" className="rounded-2xl border border-sp-border bg-sp-admin-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>💡</span>
        <h2 id="lectura-gastos-title" className="text-sm font-bold text-sp-admin-fg">Lectura rápida de gastos</h2>
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
