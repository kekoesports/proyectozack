import type { StatsRollup } from '@/lib/queries/stats';
import type { ReactElement } from 'react';

type Props = {
  readonly data: StatsRollup;
};

/**
 * Cards de KPIs agregados (followers, engagement, etc.) en la vista pública de stats.
 *
 * @kind server
 * @feature talent-stats-public
 * @route /stats/[token]
 * @example
 * ```tsx
 * <KpiCards data={data} />
 * ```
 */
export function KpiCards({ data }: Props): ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted mb-2">
          Audiencia total
        </p>
        <p className="font-display text-4xl font-black text-sp-admin-text tabular-nums">
          {data.totalReachFormatted}
        </p>
        <p className="text-xs text-sp-admin-muted mt-1">seguidores sumados de todos los canales</p>
      </div>

      <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted mb-2">
          Canales
        </p>
        <p className="font-display text-4xl font-black text-sp-admin-text tabular-nums">
          {data.channelCount}
        </p>
        <p className="text-xs text-sp-admin-muted mt-1">
          promedio {data.avgReachFormatted} / canal
        </p>
      </div>
    </div>
  );
}
