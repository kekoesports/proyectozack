'use client';

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import Image from 'next/image';
import Link from 'next/link';
import { CompactSorteoCard } from './CompactSorteoCard';
import { GiveawayFeatured } from './GiveawayFeatured';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getBrandBg } from '@/components/ui/brand-bg-map';
import type { BrandOption } from '@/lib/queries/giveawaysHub';
import type { GiveawayWithTalent, Talent } from '@/types';

type Creator = Talent & { giveawayCount: number };
type StatusFilter = 'active' | 'all' | 'finished';

type SorteosHubProps = {
  readonly active: readonly GiveawayWithTalent[];
  readonly finished: readonly GiveawayWithTalent[];
  readonly brands: readonly BrandOption[];
  readonly creators: readonly Creator[];
  readonly totalValue?: string;
  /** Slug del creator pre-seleccionado vía URL `?creator=<slug>`. Case-insensitive. */
  readonly initialCreatorSlug?: string;
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  active: 'Activos',
  all: 'Todos',
  finished: 'Finalizados',
};

export function SorteosHub({ active, finished, brands, creators, totalValue, initialCreatorSlug }: SorteosHubProps): React.JSX.Element {
  const trackEvent = trpc.giveaways.trackEvent.useMutation();

  // Registrar visita al hub una vez por montaje
  useEffect(() => {
    void trackEvent.mutateAsync({ action: 'view', page: 'sorteos' }).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  const [selectedBrand, setSelectedBrand]     = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<number | null>(() => {
    if (!initialCreatorSlug) return null;
    const target = initialCreatorSlug.toLowerCase();
    return creators.find((c) => c.slug.toLowerCase() === target)?.id ?? null;
  });
  const [status, setStatus]                   = useState<StatusFilter>('active');

  const all = useMemo(() => [...active, ...finished], [active, finished]);

  const filtered = useMemo(() => {
    const pool = status === 'active' ? active : status === 'finished' ? finished : all;
    return pool.filter(
      (g) =>
        (selectedBrand === null   || g.brandName    === selectedBrand) &&
        (selectedCreator === null || g.talent.id === selectedCreator),
    );
  }, [active, finished, all, status, selectedBrand, selectedCreator]);

  const clearFilters = () => {
    setSelectedBrand(null);
    setSelectedCreator(null);
    setStatus('active');
  };

  const hasFilters = selectedBrand !== null || selectedCreator !== null || status !== 'active';

  const poolSize = (s: StatusFilter) =>
    s === 'active' ? active.length : s === 'finished' ? finished.length : all.length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5 lg:py-6">

      {/* ── Mobile: dashboard-style stat bar ───────────────────────── */}
      <div className={`lg:hidden mb-3 grid gap-2 ${totalValue ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.03] px-2 py-1.5 flex flex-col items-center text-center">
          <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400/70">En vivo</span>
          <span className="text-[12px] font-black tabular-nums text-white/85">{active.length}</span>
        </div>
        {totalValue && (
          <div className="rounded-lg border border-sp-orange/20 bg-sp-orange/[0.03] px-2 py-1.5 flex flex-col items-center text-center">
            <span className="text-[8px] font-black uppercase tracking-wider text-sp-orange/70">Premios</span>
            <span className="text-[12px] font-black tabular-nums text-sp-orange truncate w-full">{totalValue}</span>
          </div>
        )}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-2 py-1.5 flex flex-col items-center text-center">
          <span className="text-[8px] font-black uppercase tracking-wider text-white/35">Marcas</span>
          <span className="text-[12px] font-black tabular-nums text-white/70">{brands.length}</span>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-2 py-1.5 flex flex-col items-center text-center">
          <span className="text-[8px] font-black uppercase tracking-wider text-white/35">Creators</span>
          <span className="text-[12px] font-black tabular-nums text-white/70">{creators.length}</span>
        </div>
      </div>

      {/* ── Mobile: brand chips ────────────────────────────────────── */}
      {brands.length > 0 && (
        <div className="lg:hidden mb-3 flex gap-2 overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSelectedBrand(null)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-colors ${
              selectedBrand === null
                ? 'bg-sp-orange/10 border-sp-orange/40 text-white'
                : 'bg-white/[0.03] border-white/[0.06] text-white/50'
            }`}
          >
            Todas
          </button>
          {brands.map((b) => (
            <button
              key={b.name}
              type="button"
              onClick={() => setSelectedBrand(selectedBrand === b.name ? null : b.name)}
              className={`group shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-colors ${
                selectedBrand === b.name
                  ? 'bg-sp-orange/10 border-sp-orange/40 text-white'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:border-white/15'
              }`}
            >
              {b.logo && (
                <BrandLogo
                  src={b.logo}
                  alt={b.name}
                  plate={getBrandBg(b.name)}
                  size="xs"
                  width={64}
                  height={20}
                />
              )}
              {b.name}
              <span className="text-white/30 font-bold">{b.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-6 lg:gap-8">

        {/* ── LEFT: Sticky sidebar ─────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-48 xl:w-52 shrink-0 gap-5 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-4">

          {/* Mini dashboard — stats at-a-glance */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80">En vivo</span>
              </div>
              <span className="text-[13px] font-black tabular-nums text-white/85">{active.length}</span>
            </div>
            {totalValue && (
              <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Premios</span>
                <span className="text-[13px] font-black tabular-nums text-sp-orange">{totalValue}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Marcas</span>
              <span className="text-[13px] font-black tabular-nums text-white/70">{brands.length}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Creadores</span>
              <span className="text-[13px] font-black tabular-nums text-white/70">{creators.length}</span>
            </div>
          </div>

          {/* Estado */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-2 px-1">Estado</p>
            <div className="space-y-1">
              {(['active', 'all', 'finished'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-all ${
                    status === s
                      ? 'bg-sp-orange/10 border-sp-orange/40 text-white'
                      : 'bg-white/[0.02] border-white/[0.04] text-white/45 hover:border-white/10 hover:text-white/75'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {s === 'active' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                    )}
                    {STATUS_LABELS[s]}
                  </div>
                  <span className="text-[10px] font-black tabular-nums text-white/25">{poolSize(s)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Marcas */}
          {brands.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-2 px-1">Marca</p>
              <button
                type="button"
                onClick={() => setSelectedBrand(null)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border mb-1 text-[11px] font-bold uppercase tracking-wide transition-all ${
                  selectedBrand === null
                    ? 'bg-sp-orange/10 border-sp-orange/40 text-white'
                    : 'bg-white/[0.02] border-white/[0.04] text-white/45 hover:border-white/10 hover:text-white/75'
                }`}
              >
                <span>Todas</span>
                <span className="text-[10px] font-black tabular-nums text-white/25">{all.length}</span>
              </button>
              <div className="space-y-1">
                {brands.map((b) => {
                  const isActive = selectedBrand === b.name;
                  return (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => setSelectedBrand(isActive ? null : b.name)}
                      aria-pressed={isActive}
                      className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-sp-orange/10 border-sp-orange/40 shadow-[0_0_14px_rgba(245,99,42,0.07)]'
                          : 'bg-white/[0.02] border-white/[0.04] hover:border-white/15 hover:bg-white/[0.04]'
                      }`}
                    >
                      {b.logo ? (
                        <BrandLogo
                          src={b.logo}
                          alt={b.name}
                          plate={getBrandBg(b.name)}
                          size="xs"
                          width={64}
                          height={20}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-sp-orange/20 flex items-center justify-center text-[9px] font-black text-sp-orange shrink-0">
                          {b.name.charAt(0)}
                        </div>
                      )}
                      <span className={`flex-1 text-left text-[11px] font-bold uppercase tracking-wide truncate ${isActive ? 'text-white' : 'text-white/55'}`}>
                        {b.name}
                      </span>
                      <span className={`text-[10px] font-black tabular-nums shrink-0 ${isActive ? 'text-sp-orange' : 'text-white/25'}`}>
                        {b.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Creadores */}
          {creators.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-2 px-1">Creador</p>
              <div className="flex flex-wrap gap-2">
                {/* All */}
                <button
                  type="button"
                  onClick={() => setSelectedCreator(null)}
                  title="Todos los creadores"
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-black text-white transition-all ${
                    selectedCreator === null
                      ? 'ring-2 ring-sp-orange ring-offset-1 ring-offset-[#09090f]'
                      : 'ring-1 ring-white/10 opacity-45 hover:opacity-80'
                  }`}
                  style={{ background: 'linear-gradient(135deg, #f5632a, #8b3aad)' }}
                >
                  ALL
                </button>

                {creators.map((c) => {
                  const isActive = selectedCreator === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCreator(isActive ? null : c.id)}
                      title={`${c.name} — ${c.giveawayCount} ${c.giveawayCount === 1 ? 'sorteo' : 'sorteos'}`}
                      className={`relative w-9 h-9 rounded-full overflow-hidden transition-all ${
                        isActive
                          ? 'ring-2 ring-sp-orange ring-offset-1 ring-offset-[#09090f]'
                          : 'ring-1 ring-white/10 opacity-50 hover:opacity-90'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${c.gradientC1}, ${c.gradientC2})` }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white/85 select-none">
                        {c.initials}
                      </span>
                      {c.photoUrl && (
                        <Image
                          src={c.photoUrl}
                          alt={c.name}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Name of selected creator */}
              {selectedCreator !== null && (() => {
                const creator = creators.find((c) => c.id === selectedCreator);
                return creator ? (
                  <div className="mt-2 flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold text-white/50 truncate">{creator.name}</p>
                    <Link
                      href={`/talentos/${creator.slug}`}
                      className="text-[10px] text-white/25 hover:text-sp-orange/70 transition-colors"
                    >
                      ↗
                    </Link>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Clear */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[10px] font-black uppercase tracking-wider text-sp-orange/60 hover:text-sp-orange transition-colors text-left"
            >
              × Quitar filtros
            </button>
          )}
        </aside>

        {/* ── MAIN: Grid ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Mobile: status tabs */}
          <div className="flex lg:hidden gap-1.5 mb-4 flex-wrap">
            {(['active', 'all', 'finished'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-colors ${
                  status === s
                    ? 'bg-sp-orange/10 border-sp-orange/40 text-white'
                    : 'bg-white/[0.02] border-white/[0.06] text-white/40'
                }`}
              >
                {s === 'active' && <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />}
                {STATUS_LABELS[s]}
                <span className="text-white/25 font-bold">{poolSize(s)}</span>
              </button>
            ))}
          </div>

          {/* Meta bar */}
          <div className="flex items-center gap-3 mb-4 min-h-[1.5rem]">
            <span className="text-[11px] font-bold text-white/30 tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'sorteo' : 'sorteos'}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="lg:hidden text-[10px] font-black uppercase tracking-wider text-sp-orange/60 hover:text-sp-orange transition-colors"
              >
                × Quitar filtros
              </button>
            )}
          </div>

          {/* Sorteo destacado — solo visible sin filtros, cuando el primero tiene isFeatured */}
          {!hasFilters && status === 'active' && active[0]?.isFeatured && (
            <div className="mb-5">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-sp-orange/60 mb-2.5">★ Destacado</p>
              <GiveawayFeatured giveaway={active[0]} />
            </div>
          )}

          {/* Grid — densidad marketplace (2 cols mobile, 4 cols desktop) */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3.5">
              {filtered.map((g) => (
                <CompactSorteoCard key={g.id} giveaway={g} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.07] py-20 text-center">
              {status === 'active' && active.length === 0 ? (
                <>
                  <div className="text-4xl mb-4" aria-hidden>🎁</div>
                  <p className="font-display text-2xl font-black uppercase text-white/20 mb-2">Próximamente</p>
                  <p className="text-sm text-white/25 max-w-xs mx-auto mb-6">
                    Nuevos sorteos muy pronto. Sigue a nuestros creadores para enterarte el primero.
                  </p>
                  <Link
                    href="/codigos"
                    className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-sp-orange/60 hover:text-sp-orange transition-colors"
                  >
                    ← Ver códigos de descuento
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold uppercase tracking-wider text-white/25 mb-4">
                    No hay sorteos con los filtros actuales
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-black uppercase tracking-wider text-sp-orange/70 hover:text-sp-orange transition-colors"
                  >
                    Quitar filtros
                  </button>
                </>
              )}
            </div>
          )}

          {/* Hint to see finished when browsing active */}
          {status === 'active' && finished.length > 0 && filtered.length > 0 && (
            <div className="mt-8 border-t border-white/[0.05] pt-5">
              <button
                type="button"
                onClick={() => setStatus('finished')}
                className="flex items-center gap-4 opacity-35 hover:opacity-65 transition-opacity w-full"
              >
                <h2 className="text-sm font-black uppercase tracking-[0.15em] text-white whitespace-nowrap">
                  Sorteos finalizados
                </h2>
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 shrink-0">
                  Ver {finished.length}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
