'use client';

import { motion, type Variants } from 'motion/react';
import { GiveawayCard } from './GiveawayCard';
import type { Giveaway } from '@/types';

type GiveawayGridProps = {
  giveaways: Giveaway[];
  title: string;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/**
 * Grid de giveaways del creador con un título de sección.
 *
 * @kind client
 * @feature creator-codes
 * @route /[creatorSlug]
 * @example
 * ```tsx
 * <GiveawayGrid giveaways={giveaways} title="Sorteos activos" />
 * ```
 */
export function GiveawayGrid({ giveaways, title }: GiveawayGridProps) {
  if (giveaways.length === 0) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white/60 gw-section-title">
        {title}
      </h2>
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {giveaways.map((g) => (
          <motion.div key={g.id} variants={item}>
            <GiveawayCard giveaway={g} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
