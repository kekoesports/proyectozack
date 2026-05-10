import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate } from '@/lib/utils/news';
import { derivePostRegionBadge } from '@/lib/utils/news-roles';

type Props = {
  readonly posts: readonly PostWithTalents[];
};

/**
 * Módulo editorial ligero para la home — 3 últimas news con thumbs
 * editoriales premium. Da sensación de marca viva sin convertir la home
 * en un periódico. Compact mobile (1 col scroll), 3 cols desktop.
 *
 * Diseñado para insertarse entre secciones existentes sin romper la
 * alternancia visual de la home.
 */
export function NewsLatestModule({ posts }: Props) {
  if (posts.length === 0) return null;
  const items = posts.slice(0, 3);

  return (
    <section
      aria-label="Últimas news SocialPro"
      className="relative bg-sp-black text-white py-14 md:py-20 overflow-hidden border-t border-white/[0.04]"
    >
      <div
        aria-hidden
        className="absolute -top-24 right-0 w-[420px] h-[420px] rounded-full pointer-events-none opacity-50"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245,99,42,0.10), rgba(139,58,173,0.05) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">
              SocialPro News
            </p>
            <h2 className="font-display text-2xl md:text-4xl font-black uppercase tracking-tight leading-[0.95]">
              Última hora<br className="hidden md:block" />
              <span className="bg-sp-grad bg-clip-text text-transparent md:hidden"> en CS2 y esports</span>
              <span className="hidden md:inline bg-sp-grad bg-clip-text text-transparent">en CS2 y esports</span>
            </h2>
          </div>
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 self-start md:self-end text-[11px] font-bold uppercase tracking-wider text-white/65 hover:text-white transition-colors whitespace-nowrap border border-white/10 hover:border-white/25 rounded-full px-3.5 py-1.5"
          >
            Ver todas las news
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {items.map((p) => {
            const cat = deriveNewsCategory(p.slug, p.title);
            const date = formatNewsDate(p.publishedAt);
            const region = derivePostRegionBadge(p.talentAvatars.map((t) => t.country));
            return (
              <article
                key={p.slug}
                className="group relative bg-[#0c1016] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/15 hover:bg-[#10151d] transition-colors"
              >
                <Link
                  href={`/news/${p.slug}`}
                  className="absolute inset-0 z-10"
                  aria-label={p.title}
                >
                  <span className="sr-only">{p.title}</span>
                </Link>
                <div className="relative aspect-[16/10] bg-sp-black overflow-hidden">
                  {p.coverUrl ? (
                    <Image
                      src={p.coverUrl}
                      alt=""
                      fill
                      sizes="(min-width:1024px) 380px, (min-width:640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-sp-black via-sp-dark to-sp-black flex items-center justify-center">
                      <span className="font-display text-2xl font-black uppercase tracking-tight bg-sp-grad bg-clip-text text-transparent">
                        SocialPro News
                      </span>
                    </div>
                  )}
                  <span
                    className={`absolute top-3 left-3 inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border ${cat.bg} ${cat.text} ${cat.border} backdrop-blur`}
                  >
                    {cat.label}
                  </span>
                </div>
                <div className="relative p-5">
                  <h3 className="font-display font-black uppercase text-white text-base md:text-lg leading-[1.1] tracking-tight mb-3 line-clamp-2 group-hover:text-white/95">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-white/40">
                    <span className="uppercase tracking-wider truncate">{p.author}</span>
                    <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
                    <time
                      dateTime={p.publishedAt?.toISOString() ?? ''}
                      className="tabular-nums"
                    >
                      {date}
                    </time>
                    {region ? (
                      <>
                        <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
                        <span className="uppercase tracking-[0.18em] text-white/55 tabular-nums whitespace-nowrap">
                          {region}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
