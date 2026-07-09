import type { LedgerKpis } from '@/features/libro-mayor/normalizer/kpis';
import type { LedgerMetadata } from '@/features/libro-mayor/parser/types';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type CardTone = 'positive' | 'neutral' | 'warning' | 'danger';

const TONE_CLASS: Record<CardTone, string> = {
  positive: 'text-emerald-400',
  neutral: 'text-sp-admin-text',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

function Card({
  label,
  value,
  tone,
  hint,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: CardTone;
  readonly hint?: string;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">{label}</p>
      <p className={`mt-2 font-display text-2xl font-black tabular-nums ${TONE_CLASS[tone]}`}>
        {EUR.format(value)}
      </p>
      {hint ? (
        <p className="mt-1 text-[10px] uppercase tracking-wider text-sp-admin-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type Props = {
  readonly metadata: LedgerMetadata;
  readonly kpis: LedgerKpis;
};

export function LedgerSummary({ metadata, kpis }: Props): React.ReactElement {
  const resultadoTone: CardTone = kpis.resultadoContable >= 0 ? 'positive' : 'danger';
  const cajaTone: CardTone = kpis.cajaTotal < 0 ? 'danger' : kpis.cajaTotal < 5000 ? 'warning' : 'positive';
  const partidasTone: CardTone = kpis.partidas555Count > 0 ? 'danger' : 'neutral';

  return (
    <section aria-label="Resumen contable" className="space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-sp-admin-fg">Resumen contable</h2>
          <p className="text-xs text-sp-admin-muted">
            {metadata.empresa} · Período {metadata.periodoFrom} → {metadata.periodoTo}
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-wider text-sp-admin-muted">
          Extracción: {metadata.fecha}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Ingresos del periodo" value={kpis.ingresos} tone="positive" hint="705 + 755 + 769 + 778" />
        <Card label="Gastos del periodo" value={kpis.gastos} tone="warning" hint="623 + 629 + 640 + 662 + 678" />
        <Card label="Resultado contable" value={kpis.resultadoContable} tone={resultadoTone} hint="Aproximación operativa" />
        <Card label="Caja total" value={kpis.cajaTotal} tone={cajaTone} hint="570 + 572" />
        <Card label="Clientes pendientes" value={kpis.clientesPendientes} tone={kpis.clientesPendientes > 0 ? 'warning' : 'neutral'} hint="430 saldo deudor" />
        <Card label="Proveedores pendientes" value={kpis.proveedoresPendientes} tone={kpis.proveedoresPendientes > 0 ? 'warning' : 'neutral'} hint="410 saldo acreedor" />
        <Card label="Nóminas pendientes" value={kpis.nominasPendientes} tone={kpis.nominasPendientes > 0 ? 'warning' : 'neutral'} hint="465 devengadas no pagadas" />
        <Card
          label="Partidas pendientes 555"
          value={kpis.partidas555Saldo}
          tone={partidasTone}
          hint={`${kpis.partidas555Count} movimiento${kpis.partidas555Count === 1 ? '' : 's'} sin clasificar`}
        />
      </div>
    </section>
  );
}
