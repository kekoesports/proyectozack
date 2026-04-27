'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import * as m from 'motion/react-client';
import { AnimatePresence } from 'motion/react';
import type { PortfolioItem } from '@/types';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { DURATION, EASE, STAGGER } from '@/lib/animation';

type PortfolioGridProps = {
  readonly items: PortfolioItem[];
}

const FILTERS = [
  { key: 'all', label: 'Todo' },
  { key: 'thumb', label: 'Thumbnails' },
  { key: 'campaign', label: 'Campañas' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

/** Deduplicate items by imageUrl so the same image never appears twice */
function dedupeByImage(items: PortfolioItem[]): PortfolioItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.imageUrl) return true;
    if (seen.has(item.imageUrl)) return false;
    seen.add(item.imageUrl);
    return true;
  });
}

export function PortfolioGrid({ items }: PortfolioGridProps): React.JSX.Element {
  const [filter, setFilter] = useState<FilterKey>('all');

  const uniqueItems = useMemo(() => dedupeByImage(items), [items]);
  const visible = filter === 'all' ? uniqueItems : uniqueItems.filter((i) => i.type === filter);

  return (
    <>
      <FilterTabs instanceId="portfolio-filter" tabs={FILTERS} active={filter} onChange={setFilter} />

      {/*
        Grid is a plain div: the previous m.div used `initial="hidden"` +
        `whileInView` without any matching `variants`, so it produced no
        visible animation but DID leave the subtree at opacity 0 if the
        IntersectionObserver never fired (root cause of the landing-page
        "black void" bug). Each item still animates individually via the
        AnimatePresence children below.
      */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {visible.map((item, index) => (
            <m.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: DURATION.base, ease: EASE.out, delay: index * STAGGER.tight }}
              className="group relative rounded-2xl overflow-hidden bg-sp-bg2 aspect-video"
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sp-muted text-sm font-medium">{item.type}</span>
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <div className="px-3 pt-6 pb-3">
                  <p className="text-white text-xs font-bold leading-tight line-clamp-2">{item.title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{item.creatorName}</p>
                  {item.views && (
                    <p className="text-sp-orange text-xs font-semibold mt-1">{item.views}</p>
                  )}
                </div>
              </div>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
