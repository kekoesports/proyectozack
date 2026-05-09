'use client';

import type { BrandOption } from '@/lib/queries/giveawaysHub';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getBrandBg } from '@/components/ui/brand-bg-map';

type BrandsSidebarProps = {
  readonly brands: readonly BrandOption[];
  readonly selected: string | null;
  readonly onSelectAction: (brandName: string | null) => void;
  readonly variant?: 'column' | 'chips';
};

/**
 * Sidebar con listado de marcas para filtrar el hub de giveaways.
 *
 * @kind client
 * @feature giveaways
 * @route /giveaways
 * @example
 * ```tsx
 * <BrandsSidebar brands={brands} selected={selected} onSelectAction={setSelected} />
 * ```
 */
export function BrandsSidebar({
  brands,
  selected,
  onSelectAction,
  variant = 'column',
}: BrandsSidebarProps): React.JSX.Element | null {
  if (brands.length === 0) return null;

  const total = brands.reduce((sum, b) => sum + b.count, 0);

  if (variant === 'chips') {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            Filtrar por marca
          </h2>
          {selected && (
            <button
              type="button"
              onClick={() => onSelectAction(null)}
              className="text-[10px] font-bold uppercase tracking-wider text-sp-orange/70 hover:text-sp-orange"
            >
              Quitar filtro
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => onSelectAction(null)}
            aria-pressed={selected === null}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border transition-colors ${
              selected === null
                ? 'bg-sp-orange/10 border-sp-orange/40 text-white'
                : 'bg-white/[0.02] border-white/[0.06] text-white/50'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">Todas</span>
            <span className="text-[10px] font-bold text-white/30 tabular-nums">{total}</span>
          </button>
          {brands.map((b) => {
            const isActive = selected === b.name;
            return (
              <button
                key={b.name}
                type="button"
                onClick={() => onSelectAction(isActive ? null : b.name)}
                aria-pressed={isActive}
                className={`group shrink-0 flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? 'bg-sp-orange/10 border-sp-orange/40'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
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
                  <div className="h-6 w-6 rounded-full bg-sp-orange/20 flex items-center justify-center text-[9px] font-black text-sp-orange shrink-0">
                    {b.name.charAt(0)}
                  </div>
                )}
                <span className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${isActive ? 'text-white' : 'text-white/60'}`}>
                  {b.name}
                </span>
                <span className={`text-[10px] font-bold tabular-nums ${isActive ? 'text-sp-orange' : 'text-white/25'}`}>
                  {b.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-full">
      <h2 className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 px-1">
        Filtrar por marca
      </h2>

      <button
        type="button"
        onClick={() => onSelectAction(null)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border mb-2 transition-colors ${
          selected === null
            ? 'bg-sp-orange/10 border-sp-orange/40 text-white'
            : 'bg-white/[0.02] border-white/[0.04] text-white/50 hover:border-white/10 hover:text-white/80'
        }`}
      >
        <span className="text-[11px] font-black uppercase tracking-[0.1em]">Todas</span>
        <span className="text-[10px] font-bold text-white/30">{total}</span>
      </button>

      <div className="space-y-1.5">
        {brands.map((b) => {
          const isActive = selected === b.name;
          return (
            <button
              key={b.name}
              type="button"
              onClick={() => onSelectAction(isActive ? null : b.name)}
              aria-pressed={isActive}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                isActive
                  ? 'bg-sp-orange/10 border-sp-orange/40 shadow-[0_0_18px_rgba(245,99,42,0.08)]'
                  : 'bg-white/[0.02] border-white/[0.04] hover:border-white/15 hover:bg-white/[0.04]'
              }`}
            >
              {b.logo ? (
                <BrandLogo
                  src={b.logo}
                  alt={b.name}
                  plate={getBrandBg(b.name)}
                  size="sm"
                  width={96}
                  height={24}
                />
              ) : (
                <div className="h-8 w-8 rounded-md bg-sp-orange/20 flex items-center justify-center text-[11px] font-black text-sp-orange shrink-0">
                  {b.name.charAt(0)}
                </div>
              )}
              <span
                className={`flex-1 text-left text-[11px] font-bold uppercase tracking-wider truncate ${
                  isActive ? 'text-white' : 'text-white/60'
                }`}
              >
                {b.name}
              </span>
              <span
                className={`text-[10px] font-black tabular-nums ${
                  isActive ? 'text-sp-orange' : 'text-white/25'
                }`}
              >
                {b.count}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
