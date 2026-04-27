import type { StatsRollup } from '@/lib/queries/stats';
import type { ReactElement } from 'react';
import { KpiCards } from './KpiCards';
import { StatsTableRow } from './StatsTableRow';

type Props = {
  readonly data: StatsRollup;
  readonly title?: string;
};

/**
 * Vista pública por token con KPIs y tabla de plataformas para un talent.
 *
 * @kind server
 * @feature talent-stats-public
 * @route /stats/[token]
 * @example
 * ```tsx
 * <StatsView data={data} title="Stats — @creator" />
 * ```
 */
export function StatsView({ data, title = 'Stats' }: Props): ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">{title}</h1>
        <p className="text-sm text-sp-admin-muted mt-1">{data.channelCount} canales</p>
      </div>

      <KpiCards data={data} />

      <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted w-10">#</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">Canal</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted w-24">Idioma</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted text-right w-28">Reach</th>
                <th
                  className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted text-right w-24"
                  title="Avg concurrent viewers (Twitch, last 30d)"
                >
                  Avg CCV
                </th>
                <th aria-label="Video" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sp-admin-border/60">
              {data.rows.map((row, i) => (
                <StatsTableRow key={row.id} row={row} index={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
