import { AR_AGING_BUCKET_LABELS, type ArAgingBucket } from '@/types/arAging';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function bucketColor(key: ArAgingBucket['key']): string {
  switch (key) {
    case 'por_vencer': return 'bg-emerald-500/60';
    case '0-30':      return 'bg-amber-500/70';
    case '31-60':     return 'bg-orange-500/70';
    case '61-90':     return 'bg-red-500/70';
    case '+90':       return 'bg-red-600/80';
  }
}

function bucketTextColor(key: ArAgingBucket['key']): string {
  switch (key) {
    case 'por_vencer': return 'text-emerald-400';
    case '0-30':      return 'text-amber-400';
    case '31-60':     return 'text-orange-400';
    case '61-90':     return 'text-red-400';
    case '+90':       return 'text-red-400';
  }
}

type Props = {
  readonly buckets: readonly ArAgingBucket[];
};

export function ArAgingBuckets({ buckets }: Props): React.ReactElement {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card px-5 py-8 text-center text-sm text-sp-admin-muted">
        No hay cobros pendientes con los filtros aplicados
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-sp-admin-muted">
        Antigüedad del pendiente
      </p>
      <div className="space-y-3">
        {buckets.map((b) => {
          const label = AR_AGING_BUCKET_LABELS[b.key];
          const pctLabel = `${b.pct.toFixed(0)}%`;
          const countLabel = b.count === 1 ? '1 factura' : `${b.count} facturas`;
          return (
            <div key={b.key}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-sm text-sp-admin-fg">
                  {label}
                  <span className="ml-2 text-xs text-sp-admin-muted">· {countLabel}</span>
                </span>
                <span className={`tabular-nums text-sm ${bucketTextColor(b.key)}`}>
                  {EUR.format(b.amount)} <span className="text-sp-admin-muted">· {pctLabel}</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sp-admin-border">
                <div
                  className={`h-full rounded-full ${bucketColor(b.key)}`}
                  style={{ width: `${Math.min(b.pct, 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
