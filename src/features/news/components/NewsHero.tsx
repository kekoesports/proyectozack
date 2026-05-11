import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate, readingMinutes } from '@/lib/utils/news';

/**
 * Hero editorial — split horizontal: texto izquierda, imagen derecha.
 * Estilo portal competitivo: no overlay, dos zonas claras.
 */
export function NewsHeroCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const reading = readingMinutes(post.bodyMd);

  return (
    <article className="relative group rounded-2xl overflow-hidden bg-[#0c1016] border border-white/[0.07] hover:border-white/[0.14] transition-colors">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] min-h-[280px] md:min-h-[340px]">
        {/* Izquierda — texto */}
        <div className="flex flex-col justify-between p-5 md:p-7">
          <div>
            <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-[0.22em] rounded-full px-2.5 py-1 border mb-4 ${cat.bg} ${cat.text} ${cat.border}`}>
              {cat.label}
            </span>
            <h2
              className="font-display font-black uppercase tracking-tight leading-[0.92] mb-3"
              style={{
                fontSize: 'clamp(1.5rem, 2.8vw, 2.4rem)',
                background: 'linear-gradient(135deg, #f5632a 0%, #e03070 55%, #c42880 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {post.title}
            </h2>
            <p className="text-[13px] text-white/55 leading-snug line-clamp-3">
              {post.excerpt}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/35 mt-4">
            <span className="font-semibold text-white/50 uppercase tracking-wider">{post.author}</span>
            <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
            <time dateTime={post.publishedAt?.toISOString() ?? ''} className="tabular-nums">{date}</time>
            <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/20" />
            <span>{reading} min</span>
          </div>
        </div>

        {/* Derecha — imagen */}
        <div className="relative min-h-[200px] md:min-h-0 overflow-hidden">
          {post.coverUrl ? (
            <Image
              src={post.coverUrl}
              alt=""
              fill
              priority
              sizes="(min-width:1024px) 28vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
          )}
          {/* Gradiente izquierda para fundir con el texto */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-12 pointer-events-none hidden md:block"
            style={{ background: 'linear-gradient(90deg, #0c1016 0%, transparent 100%)' }}
          />
        </div>
      </div>
    </article>
  );
}

/**
 * Mini-card para el grid de 4 debajo del hero.
 * Thumbnail pequeño + categoría + título + fecha.
 */
export function NewsMiniCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);

  return (
    <article className="relative group rounded-xl overflow-hidden bg-[#0c1016] border border-white/[0.07] flex flex-col hover:border-white/[0.14] transition-colors">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden shrink-0">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt=""
            fill
            sizes="(min-width:1024px) 18vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
        )}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center text-[8px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 border ${cat.bg} ${cat.text} ${cat.border}`}>
            {cat.label.slice(0, 5)}
          </span>
        </div>
      </div>
      {/* Texto */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="font-display font-black uppercase text-white text-[13px] md:text-sm tracking-tight leading-[1.1] line-clamp-3">
          {post.title}
        </h3>
        <time dateTime={post.publishedAt?.toISOString() ?? ''} className="text-[9px] text-white/30 tabular-nums uppercase tracking-wider mt-auto pt-1">
          {date}
        </time>
      </div>
    </article>
  );
}

/**
 * Card secundaria simple — por si se necesita en otro contexto.
 */
export function NewsSecondaryCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);

  return (
    <article className="relative group rounded-xl overflow-hidden bg-[#0c1016] border border-white/[0.07] flex flex-col flex-1 hover:border-white/[0.14] transition-colors">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>
      <div className="relative aspect-[16/9] overflow-hidden shrink-0">
        {post.coverUrl ? (
          <Image src={post.coverUrl} alt="" fill sizes="(min-width:1024px) 22vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
        )}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center text-[8px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border backdrop-blur-sm ${cat.bg} ${cat.text} ${cat.border}`}>
            {cat.label}
          </span>
        </div>
      </div>
      <div className="flex flex-col flex-1 px-4 py-3">
        <h3 className="font-display font-black uppercase text-white tracking-tight leading-[1.05] line-clamp-2 text-[15px] flex-1">
          {post.title}
        </h3>
        <time dateTime={post.publishedAt?.toISOString() ?? ''} className="text-[9px] text-white/30 tabular-nums uppercase tracking-wider mt-2">
          {date}
        </time>
      </div>
    </article>
  );
}
