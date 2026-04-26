'use client';

import { useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Talent } from '@/types';

type Creator = Talent & { giveawayCount: number; codeCount: number };

type CreatorCarouselProps = {
  readonly creators: readonly Creator[];
  readonly selected: number | null;
  readonly onSelectAction: (id: number | null) => void;
};

export function CreatorCarousel({ creators, selected, onSelectAction }: CreatorCarouselProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  }, []);

  if (creators.length === 0) return null;

  const totalCodes = creators.reduce((s, c) => s + c.codeCount, 0);

  return (
    <section id="creadores" className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-black uppercase tracking-[0.18em] text-white/80">
            Explora por creador
          </h2>
          <p className="text-[10px] text-white/30 mt-0.5 font-bold uppercase tracking-wider">
            Filtra los códigos o visita su perfil
          </p>
        </div>
        {creators.length > 4 && (
          <div className="hidden sm:flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Anterior"
              className="h-7 w-7 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center text-base"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Siguiente"
              className="h-7 w-7 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center text-base"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 lg:-mx-6 lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
      >
        {/* All creators chip */}
        <button
          type="button"
          onClick={() => onSelectAction(null)}
          className={`shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border transition-all w-[100px] ${
            selected === null
              ? 'bg-sp-orange/10 border-sp-orange/30 shadow-[0_0_18px_rgba(245,99,42,0.1)]'
              : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05]'
          }`}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
            style={{ background: 'linear-gradient(135deg, #f5632a, #8b3aad)' }}
          >
            ALL
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/70 truncate w-full">Todos</p>
            <p className="text-[9px] text-white/30 tabular-nums">{totalCodes} códigos</p>
          </div>
        </button>

        {creators.map((c) => {
          const isActive = selected === c.id;
          return (
            <div key={c.id} className="relative shrink-0 w-[100px] group/creator-card">
              <button
                type="button"
                onClick={() => onSelectAction(isActive ? null : c.id)}
                aria-pressed={isActive}
                className={`w-full flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-sp-orange/10 border-sp-orange/30 shadow-[0_0_18px_rgba(245,99,42,0.1)]'
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05]'
                }`}
              >
                <div
                  className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 transition-all"
                  style={{ boxShadow: isActive ? '0 0 0 2px #f5632a' : '0 0 0 1px rgba(255,255,255,0.08)' }}
                >
                  {c.photoUrl ? (
                    <Image src={c.photoUrl} alt={c.name} fill sizes="48px" className="object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${c.gradientC1}, ${c.gradientC2})` }}
                    >
                      {c.initials}
                    </div>
                  )}
                </div>
                <div className="text-center w-full">
                  <p className={`text-[10px] font-black uppercase tracking-wide truncate w-full transition-colors ${isActive ? 'text-white' : 'text-white/65'}`}>
                    {c.name}
                  </p>
                  <p className="text-[9px] text-white/30 tabular-nums">
                    {c.codeCount} {c.codeCount === 1 ? 'código' : 'códigos'}
                  </p>
                </div>
              </button>

              {/* Ver perfil — appears on hover */}
              <Link
                href={`/c/${c.slug}`}
                title={`Ver perfil de ${c.name}`}
                className="absolute top-2 right-2 opacity-0 group-hover/creator-card:opacity-100 transition-opacity"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 border border-white/10 hover:border-sp-orange/40 hover:bg-sp-orange/20 text-white/50 hover:text-white transition-all text-[10px]">
                  ↗
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
