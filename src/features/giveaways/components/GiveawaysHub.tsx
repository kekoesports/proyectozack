'use client';

import { useState, useMemo } from 'react';
import { motion, type Variants } from 'motion/react';
import { CreatorsSidebar } from './CreatorsSidebar';
import { BrandsSidebar } from './BrandsSidebar';
import { CodeCard } from './CodeCard';
import { GiveawaySidebarPanel } from './GiveawaySidebarPanel';
import { FiltersBar, type CategoryValue, type SortOption } from './FiltersBar';
import type { BrandOption } from '@/lib/queries/giveawaysHub';
import type { GiveawayWithTalent, CreatorCodeWithTalent, Talent } from '@/types';

type Creator = Talent & { giveawayCount: number; codeCount: number };

type GiveawaysHubProps = {
  readonly active: readonly GiveawayWithTalent[];
  readonly finished: readonly GiveawayWithTalent[];
  readonly codes: readonly CreatorCodeWithTalent[];
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

/**
 * Orquestador del hub principal de giveaways: combina filtros, secciones y sidebars.
 *
 * @kind client
 * @feature giveaways
 * @route /giveaways
 * @example
 * ```tsx
 * <GiveawaysHub initialData={data} />
 * ```
 */
export function GiveawaysHub({
  active,
  finished: _finished,
  codes,
  creators,
  brands,
}: GiveawaysHubProps): React.JSX.Element {
  const [selectedCreator, setSelectedCreator] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>(null);
  const [sort, setSort] = useState<SortOption>('recommended');

  const hasFilters = selectedCreator !== null || selectedBrand !== null || selectedCategory !== null;

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
