'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';
import { TALENT_VERTICAL_LABELS, TALENT_VERTICALS } from '@/lib/schemas/talentBusiness';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';
import {
  PLATFORM_LABELS,
  TalentCard,
  type TalentStatus,
} from './InfluencerCardsView.parts';

// ── Props ────────────────────────────────────────────────────────────

type Props = {
  readonly creators: readonly AdminRosterRow[];
  readonly verticalsByTalent: Readonly<Record<number, readonly TalentVertical[]>>;
};

// ── Main component ───────────────────────────────────────────────────

/**
 * Vista en cards del roster de talents con foto, plataformas y verticales para el listado del admin.
 *
 * @kind client
 * @feature admin/talents
 * @route /admin/talents
 * @example
 * ```tsx
 * <InfluencerCardsView creators={creators} verticalsByTalent={verticalsByTalent} />
 * ```
 */
export function InfluencerCardsView({ creators, verticalsByTalent }: Props): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TalentStatus | 'all'>('all');
  const [verticalFilter, setVerticalFilter] = useState<TalentVertical | ''>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');

  const platforms = useMemo(() => {
    const set = new Set<string>();
    for (const c of creators) for (const s of c.socials) set.add(s.platform);
    return [...set].sort();
  }, [creators]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return creators.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (verticalFilter) {
        const vs = verticalsByTalent[c.id] ?? [];
        if (!vs.includes(verticalFilter)) return false;
      }
      if (platformFilter && !c.socials.some((s) => s.platform === platformFilter)) return false;
      return true;
    });
  }, [creators, search, statusFilter, verticalFilter, platformFilter, verticalsByTalent]);

  const counts = useMemo(() => {
    let active = 0, available = 0, inactive = 0;
    for (const c of creators) {
      if (c.status === 'active') active++;
      else if (c.status === 'available') available++;
      else if (c.status === 'inactive') inactive++;
    }
    return { active, available, inactive };
  }, [creators]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sp-admin-card border border-sp-admin-border p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="min-w-[220px] flex-1 rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TalentStatus | 'all')}
          className="rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text"
        >
          <option value="all">Todos ({creators.length})</option>
          <option value="active">Activos ({counts.active})</option>
          <option value="available">Disponibles ({counts.available})</option>
          <option value="inactive">Inactivos ({counts.inactive})</option>
        </select>

        <select
          value={verticalFilter}
          onChange={(e) => setVerticalFilter(e.target.value as TalentVertical | '')}
          className="rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text"
        >
          <option value="">Todos los sectores</option>
          {TALENT_VERTICALS.map((v) => (
            <option key={v} value={v}>{TALENT_VERTICAL_LABELS[v]}</option>
          ))}
        </select>

        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text"
        >
          <option value="">Todas plataformas</option>
          {platforms.map((p) => (
            <option key={p} value={p}>{PLATFORM_LABELS[p] ?? p}</option>
          ))}
        </select>

        <span className="text-xs text-sp-admin-muted tabular-nums ml-auto">
          {filtered.length} / {creators.length}
        </span>
      </div>

      {/* Grid / Empty state */}
      {filtered.length === 0 ? (
        creators.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="Sin talentos"
            description="Importa talentos para empezar"
            action={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                Importar
              </button>
            }
          />
        ) : (
          <EmptyState
            variant="no-results"
            title="Sin resultados"
            description="Prueba con otros filtros"
          />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <TalentCard
              key={c.id}
              creator={c}
              verticals={verticalsByTalent[c.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
