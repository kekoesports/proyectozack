import type { PnLResult } from '@/lib/queries/pnl';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type CardProps = {
  readonly label: string;
  readonly value: number;
  readonly tone: 'positive' | 'neutral' | 'warning' | 'danger';
  readonly hint?: string;
  readonly formatAs?: 'currency' | 'percent';
};

const TONES: Record<CardProps['tone'], string> = {
  positive: 'text-emerald-400',
  neutral: 'text-sp-admin-text',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

function Card({ label, value, tone, hint, formatAs = 'currency' }: CardProps): React.ReactElement {
  const display = formatAs === 'percent' ? `${value.toFixed(1)}%` : EUR.format(value);
  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">{label}</p>
      <p className={`mt-2 font-display text-2xl font-black tabular-nums ${TONES[tone]}`}>
        {display}
      </p>
      {hint && <p className="mt-1 text-[10px] uppercase tracking-wider text-sp-admin-muted">{hint}</p>}
    </div>
  );
}

type Props = {
  readonly pnl: PnLResult;
};

/**
 * Cabecera del P&L con 8 KPI cards (ingresos, gastos, beneficio, márgenes...) en EUR.
 *
 * @kind server
 * @feature admin/pnl
 * @route /admin/pl
 */
export function PnLOverviewCards({ pnl }: Props): React.ReactElement {
  const margenTone = pnl.margenBruto >= 0 ? 'positive' : 'danger';
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card label="Ingresos" value={pnl.ingresos} tone="positive" />
      <Card label="Gastos" value={pnl.gastos} tone="warning" />
      <Card label="Pagos creadores" value={pnl.pagosCreadores} tone="warning" hint="Subset de gastos" />
      <Card label="Comisión agencia" value={pnl.comisionAgencia} tone={pnl.comisionAgencia >= 0 ? 'positive' : 'danger'} hint="Sobre campañas" />
      <Card label="Margen bruto" value={pnl.margenBruto} tone={margenTone} hint="Ingresos − gastos" />
      <Card label="Margen %" value={pnl.margenPct} tone={margenTone} hint="Sobre ingresos totales" formatAs="percent" />
      <Card label="Pendiente cobro" value={pnl.pendienteCobro} tone={pnl.pendienteCobro > 0 ? 'warning' : 'neutral'} />
      <Card label="Pendiente pago" value={pnl.pendientePago} tone={pnl.pendientePago > 0 ? 'warning' : 'neutral'} />
    </div>
  );
}
