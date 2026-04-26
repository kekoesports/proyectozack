'use client';

import { motion, type Variants } from 'motion/react';
import { CodeCard } from './CodeCard';
import type { CreatorCodeWithTalent } from '@/types';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type FeaturedCodesSectionProps = {
  readonly codes: readonly CreatorCodeWithTalent[];
};

export function FeaturedCodesSection({ codes }: FeaturedCodesSectionProps): React.JSX.Element | null {
  if (codes.length === 0) return null;

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full text-white text-[11px] shrink-0"
          style={{ background: 'linear-gradient(135deg, #f5632a, #c42880)' }}
          aria-hidden
        >
          ★
        </div>
        <div>
          <h2 className="text-lg font-black uppercase tracking-[0.18em] text-white leading-none gw-section-title">
            Mejores recompensas
          </h2>
          <p className="text-[10px] text-white/30 mt-0.5 font-bold uppercase tracking-wider">
            Códigos recomendados ahora mismo
          </p>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={`grid gap-4 ${
          codes.length === 1
            ? 'grid-cols-1 sm:max-w-sm'
            : codes.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
        }`}
      >
        {codes.map((c) => (
          <motion.div key={c.id} variants={item}>
            <CodeCard code={c} featured />
          </motion.div>
        ))}
      </motion.div>

      {/* Divider to regular section */}
      <div className="mt-10 flex items-center gap-4">
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20">Todos los códigos</span>
        <div className="flex-1 h-px bg-white/[0.05]" />
      </div>
    </section>
  );
}
