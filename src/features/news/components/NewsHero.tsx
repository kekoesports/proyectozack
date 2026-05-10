import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate, readingMinutes } from '@/lib/utils/news';

type Props = {
  readonly featured: PostWithTalents;
  readonly trending: readonly PostWithTalents[];
};

export function NewsHero({ featured, trending }: Props) {
  const featCat = deriveNewsCategory(featured.slug, featured.title);
  const featDate = formatNewsDate(featured.publishedAt);
  const featReading = readingMinutes(featured.bodyMd);

  return (
    <section className="relative bg-sp-black border-b border-white/[0.06] overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full pointer-events-none opacity-70"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245,99,42,0.12), rgba(196,40,128,0.06) 40%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 right-1/4 w-[420px] h-[420px] rounded-full pointer-events-none opacity-50"
        style={{
          background:
            'radial-gradient(circle at center, rgba(139,58,173,0.14), transparent 70%)',
          filter: 'blur(70px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-12 pb-14 md:pt-16 md:pb-20">
        <div className="flex items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">
              SocialPro News
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-black uppercase text-white tracking-tight leading-[0.95]">
              Esports y CS2,<br className="hidden md:block" />
              <span className="bg-sp-grad bg-clip-text text-transparent">contado por dentro</span>
            </h1>
          </div>
          <Link
            href="/blog"
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45 hover:text-white/85 transition-colors whitespace-nowrap"
          >
            ¿Caso de éxito? Ver Blog →
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 lg:gap-8">
          <article className="relative group bg-[#0c1016] border border-white/[0.07] rounded-3xl overflow-hidden hover:border-white/15 transition-colors">
            <Link
              href={`/news/${featured.slug}`}
              className="absolute inset-0 z-10"
              aria-label={featured.title}
            >
              <span className="sr-only">{featured.title}</span>
            </Link>
            <div className="relative aspect-[5/4] sm:aspect-[16/10] lg:aspect-[16/10] bg-sp-black overflow-hidden">
              {featured.coverUrl ? (
                <Image
                  src={featured.coverUrl}
                  alt=""
                  fill
                  priority
                  sizes="(min-width:1024px) 60vw, 100vw"
                  className="object-cover saturate-[0.88] brightness-[0.85] sm:saturate-100 sm:brightness-100 transition-transform duration-700 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-sp-black via-sp-dark to-sp-black" />
              )}
              {/* Bottom gradient — más intenso en mobile para fundir el cover con la copy */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-3/4 sm:h-2/3 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 0%, rgba(10,11,16,0.65) 35%, rgba(10,11,16,0.95) 75%, rgba(10,11,16,1) 100%)',
                }}
              />
              {/* Side fade — solo mobile, suaviza bordes y baja sensación de banner */}
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-12 sm:hidden pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(10,11,16,0.6) 0%, transparent 100%)',
                }}
              />
              <div
                aria-hidden
                className="absolute inset-y-0 right-0 w-12 sm:hidden pointer-events-none"
                style={{
                  background:
                    'linear-gradient(270deg, rgba(10,11,16,0.6) 0%, transparent 100%)',
                }}
              />
              <span
                className={`absolute top-4 left-4 inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1.5 border ${featCat.bg} ${featCat.text} ${featCat.border} backdrop-blur`}
              >
                {featCat.label}
              </span>
            </div>
            <div className="absolute bottom-0 inset-x-0 p-5 md:p-7">
              <h2 className="font-display text-2xl md:text-4xl font-black uppercase text-white tracking-tight leading-[1.0] mb-3 max-w-3xl">
                {featured.title}
              </h2>
              <p className="hidden md:block text-sm md:text-base text-white/65 leading-relaxed mb-4 max-w-2xl line-clamp-2">
                {featured.excerpt}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <span className="uppercase tracking-wider">{featured.author}</span>
                <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/30" />
                <time dateTime={featured.publishedAt?.toISOString() ?? ''} className="tabular-nums">
                  {featDate}
                </time>
                <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/30" />
                <span>{featReading} min</span>
              </div>
            </div>
          </article>

          <aside className="flex flex-col gap-3 lg:gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35 mb-1">
              Trending ahora
            </p>
            {trending.map((p, i) => {
              const cat = deriveNewsCategory(p.slug, p.title);
              const date = formatNewsDate(p.publishedAt);
              return (
                <article
                  key={p.slug}
                  className="relative group flex gap-3 bg-[#0c1016] border border-white/[0.06] rounded-xl overflow-hidden p-3 hover:border-white/15 hover:bg-[#10151d] transition-colors"
                >
                  <Link
                    href={`/news/${p.slug}`}
                    className="absolute inset-0 z-10"
                    aria-label={p.title}
                  >
                    <span className="sr-only">{p.title}</span>
                  </Link>
                  <div className="relative flex-none w-24 h-20 sm:w-28 sm:h-20 rounded-lg overflow-hidden bg-sp-black">
                    {p.coverUrl ? (
                      <Image
                        src={p.coverUrl}
                        alt=""
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-sp-black to-sp-dark" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${cat.accent}`}
                          aria-hidden
                        />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">
                          {cat.label}
                        </span>
                        <span aria-hidden className="text-white/15">·</span>
                        <span className="text-[10px] tabular-nums text-white/35">
                          0{i + 1}
                        </span>
                      </div>
                      <h3 className="font-display font-black uppercase text-white text-sm leading-[1.15] tracking-tight line-clamp-2 group-hover:text-white/95">
                        {p.title}
                      </h3>
                    </div>
                    <time
                      dateTime={p.publishedAt?.toISOString() ?? ''}
                      className="text-[10px] text-white/35 tabular-nums uppercase tracking-wider mt-1.5"
                    >
                      {date}
                    </time>
                  </div>
                </article>
              );
            })}
          </aside>
        </div>
      </div>
    </section>
  );
}
