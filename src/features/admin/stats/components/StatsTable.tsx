'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { GeoEditor } from './GeoEditor';
import { StatsTableRow } from '@/features/talent-stats-public/components/StatsTableRow';
import type { StatsRow } from '@/lib/queries/stats';

type SortKey = 'rank' | 'reach';
type SortDir = 'asc' | 'desc';

type Props = {
  readonly rows: StatsRow[];
};

function SortIndicator({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <span className="text-sp-admin-muted/30 ml-1">↕</span>;
  return <span className="text-sp-admin-accent ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>;
}

/**
 * Tabla de snapshots de stats por talent ordenable por rank o reach.
 * Reutiliza `StatsTableRow` del módulo público y delega edición de GEOs a `GeoEditor`.
 *
 * @kind client
 * @feature admin/stats
 * @route /admin/stats
 */
export function StatsTable({ rows }: Props): ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('reach');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const rowIndexMap = useMemo(() => new Map(rows.map((r, i) => [r.id, i])), [rows]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortKey === 'reach') {
        if (a.totalFollowers === 0 && b.totalFollowers === 0) return 0;
        if (a.totalFollowers === 0) return 1;
        if (b.totalFollowers === 0) return -1;
        const diff = b.totalFollowers - a.totalFollowers;
        return sortDir === 'desc' ? diff : -diff;
      }
      const diff = (rowIndexMap.get(a.id) ?? 0) - (rowIndexMap.get(b.id) ?? 0);
      return sortDir === 'desc' ? diff : -diff;
    });
  }, [rows, sortKey, sortDir, rowIndexMap]);

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
              <th
                className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted w-10 cursor-pointer select-none"
                onClick={() => toggleSort('rank')}
              >
                # <SortIndicator col="rank" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">Canal</th>
              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted w-24">Idioma</th>
              <th
                className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted text-right w-28 cursor-pointer select-none"
                onClick={() => toggleSort('reach')}
              >
                Reach <SortIndicator col="reach" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted text-right w-24"
                title="Avg concurrent viewers (Twitch, last 30d)"
              >
                Avg CCV
              </th>
              <th aria-label="Video" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted w-24" />
              <th aria-label="Editar geo" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sp-admin-border/60">
            {sorted.map((row, i) => (
              <StatsTableRow
                key={row.id}
                row={row}
                index={i}
                actions={
                  <GeoEditor
                    talentId={row.id}
                    talentName={row.name}
                    topGeos={row.topGeos ? [...row.topGeos] : null}
                    audienceLanguage={row.audienceLanguage}
                  />
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
