'use client';

import { useRef, useCallback } from 'react';
import { motion, type Variants } from 'motion/react';
import { CodeCard } from './CodeCard';
import type { CreatorCodeWithTalent } from '@/types';

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type FeaturedCodesSectionProps = {
  readonly codes: readonly CreatorCodeWithTalent[];
};

export function FeaturedCodesSection({ codes }: FeaturedCodesSectionProps): React.JSX.Element | null {
  if (codes.length === 0) return null;

  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  }, []);

  return (
    <section id="codigos-destacados" className="mb-12">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-white text-[12px] shrink-0 shadow-[0_0_14px_rgba(245,99,42,0.4)]"
            style={{ background: 'linear-gradient(135deg, #f5632a, #c42880)' }}
            aria-hidden
          >
            ★
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-[0.18em] text-white leading-none">
              Mejores recompensas
            </h2>
            <p className="text-[10px] text-white/30 mt-0.5 font-bold uppercase tracking-wider">
              Códigos top recomendados ahora mismo
            </p>
          </div>
        </div>
        {codes.length > 2 && (
          <div className="hidden sm:flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Anterior"
              className="h-8 w-8 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center text-lg"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Siguiente"
              className="h-8 w-8 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center text-lg"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Horizontal carousel */}
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 lg:-mx-6 lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
      >
        {codes.map((c, i) => (
          <motion.div
            key={c.id}
            className="snap-start shrink-0 w-[88%] sm:w-[46%] xl:w-[32%]"
            initial="hidden"
            animate="show"
            variants={item}
            transition={{ delay: i * 0.07 }}
          >
            <CodeCard code={c} featured />
          </motion.div>
        ))}
      </div>

      {/* Divider */}
      <div className="mt-8 flex items-center gap-4">
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20">Todos los códigos</span>
        <div className="flex-1 h-px bg-white/[0.05]" />
      </div>
    </section>
  );
}
