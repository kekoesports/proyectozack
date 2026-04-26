'use client';

import type { BrandOption } from '@/lib/queries/giveawaysHub';

const CATEGORIES = [
  { value: null as null, label: 'Todos' },
  { value: 'casino' as const, label: 'Casino' },
  { value: 'apuestas' as const, label: 'Apuestas' },
  { value: 'skins_cs2' as const, label: 'CS2' },
  { value: 'otros' as const, label: 'Otros' },
] as const;

const SORT_OPTIONS = [
  { value: 'recommended' as const, label: 'Recomendados' },
  { value: 'newest' as const, label: 'Más recientes' },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]['value'];
export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

type FiltersBarProps = {
  readonly category: CategoryValue;
  readonly sort: SortOption;
  readonly selectedBrand: string | null;
  readonly brands: readonly BrandOption[];
  readonly totalCount: number;
  readonly hasFilters: boolean;
  readonly onCategoryAction: (c: CategoryValue) => void;
  readonly onSortAction: (s: SortOption) => void;
  readonly onBrandAction: (b: string | null) => void;
  readonly onClearAction: () => void;
};

export function FiltersBar({
  category,
  sort,
  selectedBrand,
  brands,
  totalCount,
  hasFilters,
  onCategoryAction,
  onSortAction,
  onBrandAction,
  onClearAction,
}: FiltersBarProps): React.JSX.Element {
  return (
    <div className="sticky top-14 z-30 -mx-4 px-4 lg:-mx-6 lg:px-6 py-3 mb-6 border-b border-white/[0.05] bg-[#09090f]/85 backdrop-blur-md">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Category chips — horizontal scroll on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
          {CATEGORIES.map((cat) => (
            <button
              key={String(cat.value)}
              type="button"
              onClick={() => onCategoryAction(cat.value)}
              aria-pressed={category === cat.value}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
                category === cat.value
                  ? 'bg-sp-orange/15 border border-sp-orange/40 text-white'
                  : 'bg-white/[0.03] border border-white/[0.06] text-white/45 hover:border-white/18 hover:text-white/70'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-4 w-px bg-white/[0.08] mx-0.5 shrink-0" />

        {/* Brand dropdown */}
        {brands.length > 0 && (
          <select
            value={selectedBrand ?? ''}
            onChange={(e) => onBrandAction(e.target.value || null)}
            aria-label="Filtrar por marca"
            className="shrink-0 bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/50 hover:border-white/18 transition-colors cursor-pointer max-w-[130px]"
          >
            <option value="">Marca</option>
            {brands.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name} ({b.count})
              </option>
            ))}
          </select>
        )}

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => onSortAction(e.target.value as SortOption)}
          aria-label="Ordenar por"
          className="shrink-0 bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/50 hover:border-white/18 transition-colors cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Right side: clear + count */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          {hasFilters && (
            <button
              type="button"
              onClick={onClearAction}
              className="text-[10px] font-black uppercase tracking-wider text-sp-orange/60 hover:text-sp-orange transition-colors"
            >
              × Quitar
            </button>
          )}
          <span className="text-[10px] font-bold text-white/25 tabular-nums">
            {totalCount} {totalCount === 1 ? 'código' : 'códigos'}
          </span>
        </div>
      </div>
    </div>
  );
}
