'use client';

import { useState, useMemo } from 'react';
import { motion, type Variants } from 'motion/react';
import { CreatorsSidebar } from './CreatorsSidebar';
import { BrandsSidebar } from './BrandsSidebar';
import { TopWinners } from './TopWinners';
import { RecentWinners } from './RecentWinners';
import { GiveawayCarousel } from './GiveawayCarousel';
import { GiveawayHubCard } from './GiveawayHubCard';
import { CodeCard } from './CodeCard';
import { FeaturedCodesSection } from './FeaturedCodesSection';
import { CategorySortBar, type CategoryValue, type SortOption } from './CategorySortBar';
import type { BrandOption } from '@/lib/queries/giveawaysHub';
import type { GiveawayWithTalent, CreatorCodeWithTalent, GiveawayWinnerWithGiveaway, Talent } from '@/types';

type GiveawaysHubProps = {
  readonly active: readonly GiveawayWithTalent[];
  readonly finished: readonly GiveawayWithTalent[];
  readonly codes: readonly CreatorCodeWithTalent[];
  readonly featuredCodes: readonly CreatorCodeWithTalent[];
  readonly creators: readonly (Talent & { giveawayCount: number })[];
  readonly brands: readonly BrandOption[];
  readonly topWinners: readonly { winnerName: string; winnerAvatar: string | null; wins: number }[];
  readonly recentWinners: readonly GiveawayWinnerWithGiveaway[];
};

const gridContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const gridItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function GiveawaysHub({
  active,
  finished,
  codes,
  featuredCodes,
  creators,
  brands,
  topWinners,
  recentWinners,
}: GiveawaysHubProps): React.JSX.Element {
  const [selectedCreator, setSelectedCreator] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>(null);
  const [sort, setSort] = useState<SortOption>('recommended');

  const noFilters = selectedCreator === null && selectedBrand === null && selectedCategory === null;

  const filteredActive = useMemo(
    () =>
      active.filter(
        (g) =>
          (selectedCreator === null || g.talentId === selectedCreator) &&
          (selectedBrand === null || g.brandName === selectedBrand),
      ),
    [active, selectedCreator, selectedBrand],
  );

  const filteredFinished = useMemo(
    () =>
      finished.filter(
        (g) =>
          (selectedCreator === null || g.talentId === selectedCreator) &&
          (selectedBrand === null || g.brandName === selectedBrand),
      ),
    [finished, selectedCreator, selectedBrand],
  );

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

  const hasAnyResults = filteredActive.length + filteredFinished.length + filteredCodes.length > 0;

  const clearFilters = () => {
    setSelectedCreator(null);
    setSelectedBrand(null);
    setSelectedCategory(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left sidebar */}
        <CreatorsSidebar creators={[...creators]} selected={selectedCreator} onSelectAction={setSelectedCreator} />

        {/* Center */}
        <div className="flex-1 min-w-0">
          {/* Mobile-only brand filter chips */}
          <div className="lg:hidden mb-6">
            <BrandsSidebar brands={brands} selected={selectedBrand} onSelectAction={setSelectedBrand} variant="chips" />
          </div>

          {/* Sorteos activos — carousel */}
          <GiveawayCarousel
            giveaways={filteredActive}
            title="Sorteos activos"
            subtitle={`${filteredActive.length} en directo${selectedBrand ? ` · ${selectedBrand}` : ''}`}
          />

          {/* Featured codes — only when no filters active */}
          {noFilters && <FeaturedCodesSection codes={featuredCodes} />}

          {/* Codes section */}
          <section className="mb-12">
            <div className="flex items-end justify-between mb-2">
              <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white/80 gw-section-title">
                Códigos de descuento
              </h2>
            </div>

            <CategorySortBar
              category={selectedCategory}
              sort={sort}
              totalCount={filteredCodes.length}
              onCategoryAction={setSelectedCategory}
              onSortAction={setSort}
            />

            {filteredCodes.length > 0 ? (
              <motion.div
                variants={gridContainer}
                initial="hidden"
                animate="show"
                key={`codes-${selectedCreator}-${selectedBrand}-${selectedCategory}-${sort}`}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filteredCodes.map((c) => (
                  <motion.div key={c.id} variants={gridItem}>
                    <CodeCard code={c} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 py-14 text-center">
                <p className="text-sm font-bold uppercase tracking-wider text-white/30">
                  No hay códigos con los filtros actuales
                </p>
                {!noFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 text-[11px] font-bold uppercase tracking-wider text-sp-orange hover:underline"
                  >
                    Quitar filtros
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Finalizados */}
          {filteredFinished.length > 0 && (
            <details className="group border-t border-white/[0.06] pt-6">
              <summary className="cursor-pointer flex items-center justify-between list-none">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white/50 gw-section-title">
                    Sorteos finalizados
                  </h2>
                  <p className="text-[11px] text-white/25 mt-1">
                    {filteredFinished.length} {filteredFinished.length === 1 ? 'sorteo terminado' : 'sorteos terminados'}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 group-open:hidden">Mostrar</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 hidden group-open:inline">Ocultar</span>
              </summary>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
              >
                {filteredFinished.map((g) => (
                  <GiveawayHubCard key={g.id} giveaway={g} />
                ))}
              </motion.div>
            </details>
          )}

          {!hasAnyResults && (
            <div className="text-center py-20">
              <p className="text-lg font-bold uppercase tracking-wider text-white/20">
                No hay nada con los filtros actuales
              </p>
              {!noFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-[11px] font-bold uppercase tracking-wider text-sp-orange hover:underline"
                >
                  Quitar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar — desktop only */}
        <div className="hidden lg:block w-56 shrink-0 space-y-6">
          <BrandsSidebar brands={brands} selected={selectedBrand} onSelectAction={setSelectedBrand} variant="column" />
          <TopWinners winners={[...topWinners]} />
          <RecentWinners winners={[...recentWinners]} />
        </div>
      </div>
    </div>
  );
}
