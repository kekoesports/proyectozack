'use client';

import { useState } from 'react';
import * as m from 'motion/react-client';
import { AnimatePresence } from 'motion/react';
import type { TalentWithRelations } from '@/types';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { TalentCard } from './TalentCard';
import { DURATION, EASE, STAGGER } from '@/lib/utils/animation';

type TalentGridProps = {
  readonly talents: TalentWithRelations[];
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'youtube', label: 'YouTube' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

/**
 * Grid filtrable de talents (Todos / Twitch / YouTube).
 *
 * @kind client
 * @feature talents-public
 */
export function TalentGrid({ talents }: TalentGridProps): React.JSX.Element {
  const [filter, setFilter] = useState<FilterKey>('all');

  const visible =
    filter === 'all' ? talents : talents.filter((t) => t.platform === filter);

  return (
    <>
      <FilterTabs instanceId="talent-filter" tabs={FILTERS} active={filter} onChange={setFilter} />

      {/* Grid: wrapper plano para no tapar el contenido en móvil con whileInView */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {visible.map((talent, index) => (
            <m.div
              key={talent.id}
              layout
              data-motion-fallback=""
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: DURATION.base,
                ease: EASE.out,
                // Cap del stagger a 8 items: evita delays >0.4s en móvil con muchas cards
                delay: Math.min(index, 8) * STAGGER.tight,
              }}
            >
              <TalentCard
                talent={talent}
                priority={index < 4}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </div>

    </>
  );
}
