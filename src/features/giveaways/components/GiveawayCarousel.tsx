'use client';

import { useRef, useCallback } from 'react';
import { GiveawayHubCard } from './GiveawayHubCard';
import type { GiveawayWithTalent } from '@/types';

type GiveawayCarouselProps = {
  readonly giveaways: readonly GiveawayWithTalent[];
  readonly title: string;
  readonly subtitle?: string;
};

/**
 * Carrusel horizontal de giveaways con título y subtítulo de sección.
 *
 * @kind client
 * @feature giveaways
 * @route /giveaways
 * @example
 * ```tsx
 * <GiveawayCarousel giveaways={giveaways} title="Activos" subtitle="Participa ya" />
 * ```
 */
export function GiveawayCarousel({ giveaways, title, subtitle }: GiveawayCarouselProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    const delta = el.clientWidth * 0.8 * (direction === 'left' ? -1 : 1);
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  if (giveaways.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white/80 gw-section-title">
            {title}
          </h2>
          {subtitle && <p className="text-[11px] text-white/30 mt-1">{subtitle}</p>}
        </div>
        {giveaways.length > 2 && (
          <div className="hidden sm:flex gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Anterior"
              className="h-9 w-9 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Siguiente"
              className="h-9 w-9 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center"
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 lg:-mx-6 lg:px-6 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {giveaways.map((g) => (
          <div key={g.id} className="snap-start shrink-0 w-[85%] sm:w-[46%] xl:w-[32%]">
            <GiveawayHubCard giveaway={g} />
          </div>
        ))}
      </div>
    </section>
  );
}
