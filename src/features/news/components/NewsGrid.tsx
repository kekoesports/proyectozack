import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, type NewsCategorySlug } from '@/lib/utils/news';
import { NewsCard } from './NewsCard';

type Tone = 'dark' | 'paper';

type Props = {
  readonly posts: readonly PostWithTalents[];
  readonly activeCategory?: NewsCategorySlug | null;
  readonly tone?: Tone;
};

export function NewsGrid({ posts, activeCategory, tone = 'dark' }: Props) {
  const filtered = activeCategory
    ? posts.filter((p) => deriveNewsCategory(p.slug, p.title).slug === activeCategory)
    : posts;

  if (filtered.length === 0) {
    const emptyClass =
      tone === 'paper'
        ? 'rounded-2xl border border-dashed border-black/10 bg-black/[0.02] py-14 text-center'
        : 'rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-14 text-center';
    const textClass = tone === 'paper' ? 'text-sm text-black/55' : 'text-sm text-white/55';
    return (
      <div className={emptyClass}>
        <p className={textClass}>
          Aún no hay noticias en esta categoría. Vuelve pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 items-start">
      {filtered.map((p) => (
        <NewsCard key={p.slug} post={p} tone={tone} />
      ))}
    </div>
  );
}
