'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { CreatorsSidebar } from './CreatorsSidebar';
import { BrandsSidebar } from './BrandsSidebar';
import { FeaturedCodesSection } from './FeaturedCodesSection';
import { CodeCard } from './CodeCard';
import { GiveawayHubCard } from './GiveawayHubCard';
import { GiveawaySidebarPanel } from './GiveawaySidebarPanel';
import { GiveawaySection } from './GiveawaySection';
import { FiltersBar, type CategoryValue, type SortOption } from './FiltersBar';
import type { BrandOption } from '@/lib/queries/giveawaysHub';
import type { GiveawayWithTalent, CreatorCodeWithTalent, Talent } from '@/types';

type Creator = Talent & { giveawayCount: number; codeCount: number };

type GiveawaysHubProps = {
  readonly active: readonly GiveawayWithTalent[];
  readonly finished: readonly GiveawayWithTalent[];
  readonly codes: readonly CreatorCodeWithTalent[];
  readonly featuredCodes: readonly CreatorCodeWithTalent[];
  readonly creators: readonly Creator[];
  readonly brands: readonly BrandOption[];
};

const gridContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const gridItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function GiveawaysHub({
  active,
  finished,
  codes,
  featuredCodes,
  creators,
  brands,
}: GiveawaysHubProps): React.JSX.Element {
  const [selectedCreator, setSelectedCreator] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>(null);
  const [sort, setSort] = useState<SortOption>('recommended');
  const [showGiveaways, setShowGiveaways] = useState(false);

  const noFilters = selectedCreator === null && selectedBrand === null && selectedCategory === null;
  const hasFilters = !noFilters;

  const clearFilters = () => {
    setSelectedCreator(null);
    setSelectedBrand(null);
    setSelectedCategory(null);
  };

  const filteredCodes = useMemo(() => {
    let result = codes.filter(
      (c) =>
        (selectedCreator === null || c.talentId === selectedCreator) &&
        (selectedBrand === null || c.brandName === selectedBrand) &&
        (selectedCategory === null || c.category === selectedCategory),
    );
    if (sort === 'newest') {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return result;
  }, [codes, selectedCreator, selectedBrand, selectedCategory, sort]);

  const filteredFinished = useMemo(
    () =>
      finished.filter(
        (g) =>
          (selectedCreator === null || g.talentId === selectedCreator) &&
          (selectedBrand === null || g.brandName === selectedBrand),
      ),
    [finished, selectedCreator, selectedBrand],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

        {/* LEFT: Creator sidebar */}
        <CreatorsSidebar
          creators={creators}
          selected={selectedCreator}
          onSelectAction={setSelectedCreator}
        />

        {/* CENTER */}
        <div className="flex-1 min-w-0">
          {/* Mobile brand chips */}
          <div className="lg:hidden mb-4">
            <BrandsSidebar
              brands={brands}
              selected={selectedBrand}
              onSelectAction={setSelectedBrand}
              variant="chips"
            />
          </div>

          {/* Featured codes carousel */}
          {noFilters && <FeaturedCodesSection codes={featuredCodes} />}

          {/* Filters */}
          <FiltersBar
            category={selectedCategory}
            sort={sort}
            selectedBrand={selectedBrand}
            brands={brands}
            totalCount={filteredCodes.length}
            hasFilters={hasFilters}
            activeGiveawaysCount={active.length}
            onCategoryAction={setSelectedCategory}
            onSortAction={setSort}
            onBrandAction={setSelectedBrand}
            onClearAction={clearFilters}
          />

          {/* ── Sorteos activos — banner + desplegable ── */}
          {active.length > 0 && (
            <div className="mb-5">
              {/* Banner CTA */}
              <button
                type="button"
                onClick={() => setShowGiveaways((v) => !v)}
                className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl bg-sp-grad text-white gw-sp-btn-glow transition-all hover:opacity-90 group"
              >
                <span className="text-lg shrink-0" aria-hidden>🎁</span>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] font-black uppercase tracking-[0.12em] leading-none">
                    Sorteos activos
                  </p>
                  <p className="text-[10px] font-bold text-white/70 mt-0.5 leading-none">
                    {active.length} {active.length === 1 ? 'sorteo en directo' : 'sorteos en directo'} — participa ahora
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="h-2 w-2 rounded-full bg-white/60 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-white/80">
                    {showGiveaways ? 'Cerrar ↑' : 'Ver ↓'}
                  </span>
                </div>
              </button>

              {/* Desplegable con las cards */}
              <AnimatePresence>
                {showGiveaways && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {active.map((g) => (
                        <GiveawayHubCard key={g.id} giveaway={g} />
                      ))}
                    </div>
                    {filteredFinished.length > 0 && (
                      <details className="group mt-4 border-t border-white/[0.06] pt-4">
                        <summary className="cursor-pointer flex items-center gap-2 list-none text-[10px] font-black uppercase tracking-wider text-white/25 hover:text-white/50 transition-colors">
                          <span className="group-open:hidden">▶ Sorteos finalizados ({filteredFinished.length})</span>
                          <span className="hidden group-open:inline">▼ Sorteos finalizados ({filteredFinished.length})</span>
                        </summary>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {filteredFinished.map((g) => (
                            <GiveawayHubCard key={g.id} giveaway={g} />
                          ))}
                        </div>
                      </details>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Code grid */}
          <section id="codigos">
            {filteredCodes.length > 0 ? (
              <motion.div
                variants={gridContainer}
                initial="hidden"
                animate="show"
                key={`${selectedCreator}-${selectedBrand}-${selectedCategory}-${sort}`}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filteredCodes.map((c) => (
                  <motion.div key={c.id} variants={gridItem}>
                    <CodeCard code={c} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.07] py-16 text-center">
                <p className="text-sm font-bold uppercase tracking-wider text-white/25">
                  No hay códigos con los filtros actuales
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 text-[11px] font-black uppercase tracking-wider text-sp-orange/70 hover:text-sp-orange transition-colors"
                  >
                    Quitar filtros
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: sidebar — marcas arriba, sorteos abajo */}
        <aside className="hidden lg:flex flex-col w-48 xl:w-52 shrink-0 gap-6">
          <BrandsSidebar
            brands={brands}
            selected={selectedBrand}
            onSelectAction={setSelectedBrand}
            variant="column"
          />
          <GiveawaySidebarPanel giveaways={active} />
        </aside>

      </div>
    </div>
  );
}
