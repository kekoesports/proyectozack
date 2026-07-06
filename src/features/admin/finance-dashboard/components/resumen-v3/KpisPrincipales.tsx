import type { FinanzasResumenV2 } from '@/types/finanzasResumen';

interface Props {
  readonly resumen: FinanzasResumenV2;
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

type Semantic = 'positive' | 'negative' | 'attention' | 'neutral';

interface Kpi {
  readonly label: string;
  readonly value: number;
  readonly semantic: Semantic;
  readonly hint?: string;
}

const COLORS: Record<Semantic, { readonly bar: string; readonly text: string }> = {
  positive:  { bar: '#16a34a', text: '#16a34a' },
  negative:  { bar: '#ef4444', text: '#ef4444' },
  attention: { bar: '#f59e0b', text: '#f59e0b' },
  neutral:   { bar: '#6b7280', text: '#111827' },
};

function KpiCard({ kpi }: { kpi: Kpi }): React.ReactElement {
  const c = COLORS[kpi.semantic];
  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-border overflow-hidden">
      <div className="h-[3px]" style={{ background: c.bar }} />
      <div className="px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sp-admin-muted leading-none">
          {kpi.label}
        </p>
        <p className="text-[19px] font-bold tabular-nums mt-2 leading-none" style={{ color: c.text }}>
          {fmt(kpi.value)}
        </p>
        {kpi.hint ? (
          <p className="text-[10px] font-medium text-sp-admin-muted mt-1.5 leading-tight">{kpi.hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * KPIs principales del Resumen v3. 9 tarjetas canónicas ordenadas para
 * lectura ejecutiva:
 *
 *   fila 1: facturado · cobrado · pendiente cobro · gastado · pendiente pago
 *   fila 2: nóminas · costes directos · margen bruto · resultado estimado
 *
 * Semántica de color: verde=positivo, ámbar=atención, rojo=negativo,
 * gris=neutro. Nunca inventa datos — todos vienen del resumen v2.
 */
export function KpisPrincipales({ resumen }: Props): React.ReactElement {
  const gastadoTotal =
    resumen.costesDirectos.total +
    resumen.nominas.total +
    resumen.impuestos.total +
    resumen.operativos.total;

  const pendientePagoTotal =
    resumen.pendientes.pagosTalento.total + resumen.pendientes.pagosOperativo.total;

  const margenBrutoTotal = resumen.margenBruto.cobrado + resumen.margenBruto.pendiente;
  const resultado = resumen.resultado.operativo;

  const primary: readonly Kpi[] = [
    {
      label: 'Facturado',
      value: resumen.ingresos.facturados,
      semantic: 'neutral',
      hint: 'Facturas emitidas del período (sin importe cobrado todavía)',
    },
    {
      label: 'Cobrado',
      value: resumen.ingresos.cobrados,
      semantic: resumen.ingresos.cobrados > 0 ? 'positive' : 'neutral',
      hint: 'Dinero realmente recibido (pagos aplicados)',
    },
    {
      label: 'Pendiente cobro',
      value: resumen.ingresos.pendientes,
      semantic: resumen.ingresos.pendientes > 0 ? 'attention' : 'positive',
      hint: 'Facturas emitidas sin cobrar',
    },
    {
      label: 'Gastado',
      value: gastadoTotal,
      semantic: 'neutral',
      hint: 'Total gastos registrados (todas las categorías)',
    },
    {
      label: 'Pendiente pago',
      value: pendientePagoTotal,
      semantic: pendientePagoTotal > 0 ? 'attention' : 'positive',
      hint: 'Talentos + operativos sin pagar',
    },
  ];

  const secondary: readonly Kpi[] = [
    {
      label: 'Nóminas',
      value: resumen.nominas.total,
      semantic: 'neutral',
      hint: `${resumen.nominas.count} entrada${resumen.nominas.count === 1 ? '' : 's'}`,
    },
    {
      label: 'Costes directos',
      value: resumen.costesDirectos.total,
      semantic: 'neutral',
      hint: 'Pagos a talentos + producción',
    },
    {
      label: 'Margen bruto',
      value: margenBrutoTotal,
      semantic: margenBrutoTotal >= 0 ? 'positive' : 'negative',
      hint: 'Facturado − costes directos (cobrado + pendiente)',
    },
    {
      label: 'Resultado estimado',
      value: resultado,
      semantic: resultado > 0 ? 'positive' : resultado < 0 ? 'negative' : 'neutral',
      hint: 'Margen cobrado − nóminas − impuestos − operativos',
    },
  ];

  return (
    <section aria-label="KPIs principales" className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {primary.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {secondary.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
    </section>
  );
}
