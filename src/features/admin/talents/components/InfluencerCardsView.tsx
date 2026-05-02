'use client';

import { useCallback, useMemo, useState } from 'react';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';
import { TALENT_VERTICAL_LABELS, TALENT_VERTICALS } from '@/lib/schemas/talentBusiness';
import { AddTalentModal } from './AddTalentModal';
import { exportTalentsToExcel } from './TalentExport';
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

export function InfluencerCardsView({ creators, verticalsByTalent }: Props): React.ReactElement {
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<TalentStatus | 'all'>('all');
  const [verticalFilter, setVerticalFilter] = useState<TalentVertical | ''>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sortBy, setSortBy]               = useState<'default' | 'deals'>('default');
  const [showAdd, setShowAdd]             = useState(false);
  const [selectMode, setSelectMode]       = useState(false);
  const [selectedIds, setSelectedIds]     = useState<Set<number>>(new Set());

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, []);

  const platforms = useMemo(() => {
    const set = new Set<string>();
    for (const c of creators) for (const s of c.socials) set.add(s.platform);
    return [...set].sort();
  }, [creators]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const c of creators) if (c.creatorCountry) set.add(c.creatorCountry.toUpperCase());
    return [...set].sort();
  }, [creators]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = creators.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (verticalFilter) {
        const vs = verticalsByTalent[c.id] ?? [];
        if (!vs.includes(verticalFilter)) return false;
      }
      if (platformFilter && !c.socials.some((s) => s.platform === platformFilter)) return false;
      if (countryFilter && (c.creatorCountry ?? '').toUpperCase() !== countryFilter) return false;
      return true;
    });
    if (sortBy === 'deals') {
      return [...list].sort((a, b) => (b.activeDealsCount ?? 0) - (a.activeDealsCount ?? 0));
    }
    return list;
  }, [creators, search, statusFilter, verticalFilter, platformFilter, countryFilter, verticalsByTalent, sortBy]);

  const counts = useMemo(() => {
    let active = 0, available = 0, inactive = 0;
    for (const c of creators) {
      if (c.status === 'active') active++;
      else if (c.status === 'available') available++;
      else if (c.status === 'inactive') inactive++;
    }
    return { active, available, inactive };
  }, [creators]);

  const handleExport = useCallback(() => {
    const toExport = selectedIds.size > 0
      ? creators.filter((c) => selectedIds.has(c.id))
      : filtered;
    exportTalentsToExcel(toExport, verticalsByTalent);
  }, [selectedIds, creators, filtered, verticalsByTalent]);

  const INPUT_CLS = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

  return (
    <div className="space-y-4">
      {/* KPIs de estado — clicables como filtros */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Activos',     value: counts.active + counts.available, color: '#16a34a', filter: 'active' as TalentStatus },
          { label: 'Inactivos',   value: counts.inactive,                  color: '#72728a', filter: 'inactive' as TalentStatus },
          { label: 'Total',       value: creators.length,                  color: '#f5632a', filter: 'all' as const },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatusFilter(s.filter === 'all' ? 'all' : (statusFilter === s.filter ? 'all' : s.filter as TalentStatus | 'all'))}
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

      {/* Filtros + acciones */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filtros principales — siempre visibles */}
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

        {/* Filtros secundarios — se expanden con el botón */}
        {showMoreFilters && (
          <>
            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className={INPUT_CLS}>
              <option value="">Todas las plataformas</option>
              {platforms.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p] ?? p}</option>)}
            </select>
            {countries.length > 0 && (
              <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className={INPUT_CLS}>
                <option value="">Todos los países</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </>
        )}

        {/* Botón más filtros */}
        <button
          type="button"
          onClick={() => setShowMoreFilters((v) => !v)}
          className={`h-8 px-3 rounded-lg border text-[12px] transition-colors flex items-center gap-1 ${
            showMoreFilters || platformFilter || countryFilter
              ? 'border-sp-admin-accent/40 bg-sp-admin-accent/8 text-sp-admin-accent font-semibold'
              : 'border-sp-admin-border text-sp-admin-muted hover:bg-sp-admin-hover'
          }`}
        >
          {showMoreFilters ? '− Menos' : '+ Más filtros'}
          {(platformFilter || countryFilter) && !showMoreFilters && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-sp-admin-accent" />
          )}
        </button>

        <span className="text-[11px] text-sp-admin-muted tabular-nums">{filtered.length} de {creators.length}</span>

        {/* Sort por tratos */}
        <button
          type="button"
          onClick={() => setSortBy((v) => v === 'deals' ? 'default' : 'deals')}
          className={`h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
            sortBy === 'deals'
              ? 'border-sp-admin-accent/50 bg-sp-admin-accent/8 text-sp-admin-accent font-semibold'
              : 'border-sp-admin-border text-sp-admin-muted hover:bg-sp-admin-hover'
          }`}
          title={sortBy === 'deals' ? 'Quitar orden por tratos' : 'Ordenar por más tratos activos'}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M2 10V6M5 10V2M8 10V5M11 10V8"/>
          </svg>
          Más tratos
        </button>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 ml-auto">
          {selectMode && (
            <>
              <span className="text-[11px] text-sp-admin-muted">{selectedIds.size} sel.</span>
              <button
                type="button"
                onClick={handleExport}
                className="h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors"
              >
                Exportar
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors"
              >
                Cancelar
              </button>
            </>
          )}
          {!selectMode && (
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors"
              title="Seleccionar para exportar"
            >
              Seleccionar
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors flex items-center gap-1"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Añadir talento
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        creators.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="Sin talentos"
            description="Importa talentos para empezar"
            action={
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                + Añadir talento
              </button>
            }
          />
        ) : (
          <EmptyState variant="no-results" title="Sin resultados" description="Prueba con otros filtros" />
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((c) => (
            <TalentCard
              key={c.id}
              creator={c}
              verticals={verticalsByTalent[c.id] ?? []}
              selectMode={selectMode}
              selected={selectedIds.has(c.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {showAdd && <AddTalentModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
