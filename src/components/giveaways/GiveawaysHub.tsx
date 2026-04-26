'use client';

import { useState, useMemo } from 'react';
import { motion, type Variants } from 'motion/react';
import { FeaturedCodesSection } from './FeaturedCodesSection';
import { CreatorCarousel } from './CreatorCarousel';
import { FiltersBar, type CategoryValue, type SortOption } from './FiltersBar';
import { CodeCard } from './CodeCard';
import { GiveawaySection } from './GiveawaySection';
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
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
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

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-16">
      {/* Creator carousel */}
      <CreatorCarousel
        creators={creators}
        selected={selectedCreator}
        onSelectAction={setSelectedCreator}
      />

      {/* Sticky filters bar */}
      <FiltersBar
        category={selectedCategory}
        sort={sort}
        selectedBrand={selectedBrand}
        brands={brands}
        totalCount={filteredCodes.length}
        hasFilters={hasFilters}
        onCategoryAction={setSelectedCategory}
        onSortAction={setSort}
        onBrandAction={setSelectedBrand}
        onClearAction={clearFilters}
      />

      {/* Featured codes — only when no filters active */}
      {noFilters && <FeaturedCodesSection codes={featuredCodes} />}

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

      {/* Giveaways section */}
      <GiveawaySection active={filteredActive} finished={filteredFinished} />
    </div>
  );
}
