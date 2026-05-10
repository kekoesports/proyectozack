import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, type NewsCategorySlug } from '@/lib/utils/news';
import { NewsCard } from './NewsCard';

type Props = {
  readonly posts: readonly PostWithTalents[];
  readonly activeCategory?: NewsCategorySlug | null;
};

export function NewsGrid({ posts, activeCategory }: Props) {
  const filtered = activeCategory
    ? posts.filter((p) => deriveNewsCategory(p.slug, p.title).slug === activeCategory)
    : posts;

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-14 text-center">
        <p className="text-sm text-white/55">
          Aún no hay noticias en esta categoría. Vuelve pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
      {filtered.map((p) => (
        <NewsCard key={p.slug} post={p} />
      ))}
    </div>
  );
}
