import type { ArAgingKpis } from '@/types/arAging';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type Accent = 'income' | 'warn' | 'neutral' | 'expense';

type KpiCardProps = {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly accent: Accent;
};

function KpiCard({ label, value, hint, accent }: KpiCardProps): React.ReactElement {
  const border =
    accent === 'income' ? 'border-emerald-500/40'
    : accent === 'warn' ? 'border-amber-500/40'
    : accent === 'expense' ? 'border-red-500/40'
    : 'border-sp-admin-border';
  const dot =
    accent === 'income' ? 'bg-emerald-500'
    : accent === 'warn' ? 'bg-amber-500'
    : accent === 'expense' ? 'bg-red-500'
    : 'bg-sp-admin-muted';
  const valueColor =
    accent === 'income' ? 'text-emerald-400'
    : accent === 'warn' ? 'text-amber-400'
    : accent === 'expense' ? 'text-red-400'
    : 'text-sp-admin-fg';

  return (
    <div className={`flex flex-col gap-2 rounded-xl border ${border} bg-sp-admin-card p-5`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sp-admin-muted">
          {label}
        </span>
      </div>
      <span className={`text-3xl font-black tabular-nums ${valueColor}`}>{value}</span>
      {hint && <span className="text-[11px] text-sp-admin-muted">{hint}</span>}
    </div>
  );
}

type Props = {
  readonly kpis: ArAgingKpis;
};

export function ArAgingKPIs({ kpis }: Props): React.ReactElement {
  const topBrandValue = kpis.topDebtorBrand
    ? EUR.format(kpis.topDebtorBrand.amount)
    : '—';
  const topBrandHint = kpis.topDebtorBrand?.name ?? 'Sin marca principal';

  const avgLabel =
    kpis.avgDaysOverdue !== null
      ? `${kpis.avgDaysOverdue} d`
      : '—';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        label="Total pendiente de cobrar"
        value={EUR.format(kpis.totalPending)}
        hint="Saldo vivo total"
        accent="income"
      />
      <KpiCard
        label="Total vencido"
        value={kpis.totalOverdue > 0 ? EUR.format(kpis.totalOverdue) : 'Al día'}
        hint="Facturas con fecha vencida"
        accent={kpis.totalOverdue > 0 ? 'expense' : 'neutral'}
      />
      <KpiCard
        label="Facturas vencidas"
        value={String(kpis.overdueCount)}
        hint="Número de facturas fuera de plazo"
        accent={kpis.overdueCount > 0 ? 'expense' : 'neutral'}
      />
      <KpiCard
        label="Pendiente por vencer"
        value={EUR.format(kpis.pendingNotYetDue)}
        hint="Aún dentro del plazo"
        accent={kpis.pendingNotYetDue > 0 ? 'warn' : 'neutral'}
      />
      <KpiCard
        label="Mayor deuda por marca"
        value={topBrandValue}
        hint={topBrandHint}
        accent={kpis.topDebtorBrand ? 'warn' : 'neutral'}
      />
      <KpiCard
        label="Promedio días de retraso"
        value={avgLabel}
        hint="Solo entre facturas vencidas"
        accent={
          kpis.avgDaysOverdue !== null && kpis.avgDaysOverdue > 30 ? 'expense'
          : kpis.avgDaysOverdue !== null && kpis.avgDaysOverdue > 0 ? 'warn'
          : 'neutral'
        }
      />
    </div>
  );
}
