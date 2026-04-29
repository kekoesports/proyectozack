'use client';

import Image from 'next/image';
import { formatCompact } from '@/lib/utils/format';
import type { YouTubeChannelPreview } from '@/lib/services/youtube';

import type {
  YouTubeSearchParams,
  AvgViewsRecord,
} from '@/app/admin/(dashboard)/targets/youtube-actions';

export const YT_RED = '#FF0000';

export const DEFAULT_PARAMS: YouTubeSearchParams = {
  query: '',
  minSubscribers: 0,
  maxSubscribers: 0,
  requiresHandle: false,
  description: '',
  limit: 10,
  regionCode: '',
  relevanceLanguage: '',
};

export type YouTubeResultsTableProps = {
  results: YouTubeChannelPreview[];
  selected: Set<string>;
  avgViews: AvgViewsRecord;
  toggleOne: (channelId: string) => void;
};

export function YouTubeResultsTable({ results, selected, avgViews, toggleOne }: YouTubeResultsTableProps): React.ReactElement {
  return (
    <div className="overflow-x-auto border-t border-sp-admin-border">
      <table className="w-full text-left text-sm min-w-[600px]">
        <thead>
          <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
            <th className="px-3 py-2.5 w-8" />
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">Canal</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted w-28 text-right">Suscriptores</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted w-28 text-right">Avg. views</th>
            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">Descripción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sp-admin-border/60">
          {results.map((channel) => (
            <tr
              key={channel.channelId}
              onClick={() => toggleOne(channel.channelId)}
              className={`cursor-pointer transition-colors hover:bg-sp-admin-hover ${selected.has(channel.channelId) ? 'bg-[#FF0000]/5' : ''}`}
            >
              <td className="px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(channel.channelId)}
                  onChange={() => toggleOne(channel.channelId)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-sp-admin-border bg-sp-admin-bg accent-[#FF0000]"
                />
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  {channel.thumbnailUrl ? (
                    <Image src={channel.thumbnailUrl} alt={channel.title} width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0 bg-sp-admin-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#FF0000] flex items-center justify-center text-[10px] font-bold text-white shrink-0">YT</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] text-sp-admin-text truncate max-w-[200px]">{channel.title}</p>
                    {channel.handle && <p className="text-[11px] text-sp-admin-muted">@{channel.handle}</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-2.5 text-right text-[12px] font-semibold text-sp-admin-text tabular-nums">
                {channel.subscriberCount > 0 ? formatCompact(channel.subscriberCount) : '--'}
              </td>
              <td className="px-4 py-2.5 text-right text-[12px] tabular-nums">
                {(() => {
                  const v = avgViews[channel.channelId];
                  if (!v) return <span className="text-sp-admin-muted/40">—</span>;
                  return (
                    <span className="font-semibold text-sp-admin-text">
                      {formatCompact(v.avgViews)}
                      <span className="text-[10px] font-normal text-sp-admin-muted ml-0.5">/{v.videoCount}v</span>
                    </span>
                  );
                })()}
              </td>
              <td className="px-4 py-2.5 max-w-[300px]">
                {channel.description ? (
                  <p className="text-[11px] text-sp-admin-muted line-clamp-2 leading-relaxed">{channel.description}</p>
                ) : (
                  <span className="text-[11px] text-sp-admin-muted/25 italic">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
