'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { PostListItem } from '@/lib/queries/posts';
import { deriveCategory } from '@/lib/utils/blog';
import { BlogCard } from './BlogCard';
import { FeaturedBlogCard } from './FeaturedBlogCard';

type Category = { key: string; label: string };

const CATEGORIES: readonly Category[] = [
  { key: 'todos',      label: 'Todos' },
  { key: 'caso-exito', label: 'Casos de éxito' },
  { key: 'guia',       label: 'Guías' },
  { key: 'igaming',    label: 'iGaming' },
  { key: 'tendencias', label: 'Tendencias' },
  { key: 'youtube',    label: 'YouTube' },
  { key: 'esports',    label: 'Esports/CS2' },
] as const;

type Props = { posts: PostListItem[] };

export function BlogContent({ posts }: Props) {
  const searchParams = useSearchParams();
  const activeCat = searchParams.get('cat') ?? 'todos';

  const sorted = [...posts].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));

  const filtered =
    activeCat === 'todos'
      ? sorted
      : sorted.filter((p) => deriveCategory(p.slug, p.title).slug === activeCat);

  const featured = filtered[0] ?? null;
  const rest     = filtered.slice(1);

  function catHref(key: string): string {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'todos') params.delete('cat');
    else params.set('cat', key);
    const qs = params.toString();
    return qs ? `/blog?${qs}` : '/blog';
  }

  return (
    <section className="bg-white py-6 md:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 md:space-y-8">

        {/* ── Category filter chips ──────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ key, label }) => {
            const isActive = activeCat === key;
            return (
              <Link
                key={key}
                href={catHref(key)}
                scroll={false}
                className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] border transition-colors ${
                  isActive
                    ? 'bg-sp-orange/15 border-sp-orange/50 text-sp-orange'
                    : 'bg-sp-off border-sp-border text-sp-muted hover:border-sp-orange/30 hover:text-sp-dark'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* ── Posts ───────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-2xl font-black uppercase text-sp-muted">
              No hay artículos en esta categoría todavía.
            </p>
          </div>
        ) : (
          <>
            {featured != null && <FeaturedBlogCard post={featured} />}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
