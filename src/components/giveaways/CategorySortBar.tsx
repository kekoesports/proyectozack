'use client';

export const CATEGORIES = [
  { value: null as null, label: 'Todos' },
  { value: 'casino' as const, label: 'Casino' },
  { value: 'apuestas' as const, label: 'Apuestas' },
  { value: 'skins_cs2' as const, label: 'Skins CS2' },
  { value: 'otros' as const, label: 'Otros' },
];

export const SORT_OPTIONS = [
  { value: 'recommended' as const, label: 'Recomendados' },
  { value: 'newest' as const, label: 'Más recientes' },
];

export type CategoryValue = (typeof CATEGORIES)[number]['value'];
export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

type CategorySortBarProps = {
  readonly category: CategoryValue;
  readonly sort: SortOption;
  readonly totalCount: number;
  readonly onCategoryAction: (c: CategoryValue) => void;
  readonly onSortAction: (s: SortOption) => void;
};

export function CategorySortBar({
  category,
  sort,
  totalCount,
  onCategoryAction,
  onSortAction,
}: CategorySortBarProps): React.JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
      {/* Category tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={String(cat.value)}
            type="button"
            onClick={() => onCategoryAction(cat.value)}
            aria-pressed={category === cat.value}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
              category === cat.value
                ? 'bg-sp-orange/15 border border-sp-orange/40 text-white'
                : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:border-white/20 hover:text-white/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sort + count */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] text-white/25 font-bold tabular-nums">
          {totalCount} {totalCount === 1 ? 'código' : 'códigos'}
        </span>
        <select
          value={sort}
          onChange={(e) => onSortAction(e.target.value as SortOption)}
          aria-label="Ordenar por"
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/60 hover:border-white/20 transition-colors cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
