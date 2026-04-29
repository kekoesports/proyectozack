import { formatSocialDisplayUrl } from '@/lib/utils/format';
import type { StatsRow } from '@/lib/queries/stats';
import type { ReactElement, ReactNode } from 'react';

type Props = {
  readonly row: StatsRow;
  readonly index: number;
  readonly actions?: ReactNode;
};

/**
 * Fila de la tabla de plataformas en la vista pública de stats.
 *
 * @kind server
 * @feature talent-stats-public
 * @route /stats/[token]
 * @example
 * ```tsx
 * <StatsTableRow row={row} index={0} />
 * ```
 */
export function StatsTableRow({ row, index, actions }: Props): ReactElement {
  const profileUrl = row.socials[0]?.profileUrl ?? null;
  const channelDisplay =
    formatSocialDisplayUrl(profileUrl) ?? row.socials[0]?.handle ?? row.name;

  return (
    <tr className="hover:bg-sp-admin-hover transition-colors">
      <td className="px-4 py-3 text-xs text-sp-admin-muted tabular-nums">{index + 1}</td>
      <td className="px-4 py-3">
        <span className="font-semibold text-sp-admin-text text-[13px]">{channelDisplay}</span>
        <span className="block text-[10px] text-sp-admin-muted mt-0.5">{row.name}</span>
      </td>
      <td className="px-4 py-3 text-xs text-sp-admin-text">
        {row.audienceLanguage ?? <span className="text-sp-admin-muted/30">—</span>}
      </td>
      <td className="px-4 py-3 text-right font-display text-sm font-bold text-sp-admin-text tabular-nums">
        {row.totalFollowers > 0 ? row.totalFormatted : <span className="text-sp-admin-muted/30">—</span>}
      </td>
      <td className="px-4 py-3 text-right text-xs text-sp-admin-text tabular-nums">
        {row.avgViewers !== null && row.avgViewers > 0 ? (
          row.avgViewersFormatted
        ) : (
          <span className="text-sp-admin-muted/30">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {profileUrl ? (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sp-admin-border hover:bg-sp-admin-hover text-[11px] font-semibold text-sp-admin-text transition-colors"
          >
            <span aria-hidden>▶</span> Video
          </a>
        ) : (
          <span className="text-sp-admin-muted/30">—</span>
        )}
      </td>
      {actions !== undefined && <td className="px-4 py-3 text-right">{actions}</td>}
    </tr>
  );
}
