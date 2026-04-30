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

  const INPUT_CLS = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50';

  return (
    <div className="space-y-4">
      {/* KPIs de estado — clicables como filtros */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Activos',     value: counts.active,    color: '#16a34a', filter: 'active' as TalentStatus },
          { label: 'Disponibles', value: counts.available, color: '#5b9bd5', filter: 'available' as TalentStatus },
          { label: 'Inactivos',   value: counts.inactive,  color: '#72728a', filter: 'inactive' as TalentStatus },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s.filter ? 'all' : s.filter)}
            className={`rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden text-left hover:shadow-md transition-shadow ${statusFilter === s.filter ? 'ring-1 ring-sp-admin-accent/40' : ''}`}
          >
            <div className="h-[2px]" style={{ background: s.color }} />
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{s.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar influencer…"
          className={`${INPUT_CLS} flex-1 min-w-[180px]`}
        />
        <select value={verticalFilter} onChange={(e) => setVerticalFilter(e.target.value as TalentVertical | '')} className={INPUT_CLS}>
          <option value="">Todos los sectores</option>
          {TALENT_VERTICALS.map((v) => <option key={v} value={v}>{TALENT_VERTICAL_LABELS[v]}</option>)}
        </select>
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className={INPUT_CLS}>
          <option value="">Todas las plataformas</option>
          {platforms.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p] ?? p}</option>)}
        </select>
        <span className="text-[11px] text-sp-admin-muted tabular-nums ml-auto">{filtered.length} de {creators.length}</span>
      </div>

      {/* Grid — más columnas para cards más pequeñas */}
      {filtered.length === 0 ? (
        creators.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="Sin talentos"
            description="Importa talentos para empezar"
            action={
              <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer">
                Importar
              </button>
            }
          />
        ) : (
          <EmptyState variant="no-results" title="Sin resultados" description="Prueba con otros filtros" />
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((c) => (
            <TalentCard key={c.id} creator={c} verticals={verticalsByTalent[c.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
