'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { NEWS_CATEGORY_SLUGS, getNewsCategory } from '@/lib/utils/news';

export function NewsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = searchParams.get('cat');

  function setCat(cat: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (cat) next.set('cat', cat);
    else next.delete('cat');
    const href = `${pathname}${next.toString() ? `?${next.toString()}` : ''}`;
    startTransition(() => router.replace(href, { scroll: false }));
  }

  const items: ReadonlyArray<{ slug: string | null; label: string; accent?: string }> = [
    { slug: null, label: 'Todos' },
    ...NEWS_CATEGORY_SLUGS.map((s) => {
      const c = getNewsCategory(s);
      return { slug: c.slug, label: c.label, accent: c.accent };
    }),
  ];

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${isPending ? 'opacity-70' : ''}`}
      role="tablist"
      aria-label="Filtrar por categoría"
    >
      {items.map(({ slug, label, accent }) => {
        const active = (slug ?? null) === (current ?? null);
        return (
          <button
            key={slug ?? 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setCat(slug)}
            className={`group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              active
                ? 'bg-white text-sp-black border border-white'
                : 'border border-white/10 text-white/65 hover:text-white hover:border-white/25 bg-white/[0.02]'
            }`}
          >
            {accent ? (
              <span
                aria-hidden
                className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-sp-orange' : accent} transition-colors`}
              />
            ) : null}
            {label}
          </button>
        );
      })}
    </div>
  );
}
