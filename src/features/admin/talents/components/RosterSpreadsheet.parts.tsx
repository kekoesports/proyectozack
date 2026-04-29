'use client';

import type { AdminRosterRow, GrowthData } from '@/lib/queries/talents';
import { parseFollowers } from '@/lib/utils/format';
import { platformMatchesKey } from '@/lib/utils/platform';

// ── Sort types ───────────────────────────────────────────────────────

export type SortField = 'name' | 'game' | 'total' | 'growth-yt' | 'growth-tw' | string; // string for platform keys
export type SortDir = 'asc' | 'desc';
export type SortState = { field: SortField; dir: SortDir };

// ── Helpers ──────────────────────────────────────────────────────────

export function getFollowersForPlatform(creator: AdminRosterRow, platformKey: string): number {
  const social = creator.socials.find((s) => platformMatchesKey(s.platform, platformKey));
  if (!social) return 0;
  return parseFollowers(social.followersDisplay);
}

export function getGrowthPct(growth: GrowthData[], platform: string): number | null {
  const g = growth.find((item) => item.platform === platform);
  return g?.growthPct ?? null;
}

export function GrowthCell({ growth, platform }: { growth: GrowthData[]; platform: string }): React.ReactElement {
  const g = growth.find((item) => item.platform === platform);
  if (!g || g.growthPct === null) {
    return (
      <td className="px-3 py-2.5 text-center text-[11px] text-sp-admin-muted/25 tabular-nums">--</td>
    );
  }
  const positive = g.growthPct > 0;
  const neutral = g.growthPct === 0;
  return (
    <td
      className={`px-3 py-2.5 text-center text-[11px] font-semibold tabular-nums ${
        neutral ? 'text-sp-admin-muted' : positive ? 'text-emerald-400' : 'text-red-400'
      }`}
    >
      {positive ? '+' : ''}{g.growthPct.toFixed(1)}%
    </td>
  );
}

// ── Sortable Table Header ────────────────────────────────────────────

type ThProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  sortable?: boolean;
  field?: string;
  sort?: SortState;
  onSort?: (field: SortField) => void;
  indicator?: (field: SortField) => string | null;
};

export function Th({ children, className = '', style, sortable, field, sort, onSort, indicator }: ThProps): React.ReactElement {
  const base = `px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted whitespace-nowrap ${className}`;

  if (!sortable || !field || !onSort) {
    return <th className={base} style={style}>{children}</th>;
  }

  const isActive = sort?.field === field;
  const arrow = indicator?.(field);

  return (
    <th className={base} style={style}>
      <button
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-0.5 transition-colors ${
          isActive ? 'text-sp-admin-text' : 'hover:text-sp-admin-text'
        }`}
      >
        {children}
        {arrow && <span className="text-sp-admin-accent">{arrow}</span>}
      </button>
    </th>
  );
}
