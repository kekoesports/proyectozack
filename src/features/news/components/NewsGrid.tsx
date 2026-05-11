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
    <div className="flex flex-wrap justify-center gap-5 md:gap-6 items-start">
      {filtered.map((p) => (
        <div
          key={p.slug}
          className="w-full sm:w-[calc(50%-0.625rem)] md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
        >
          <NewsCard post={p} tone={tone} />
        </div>
      ))}
    </div>
  );
}
