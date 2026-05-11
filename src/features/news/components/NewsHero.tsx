import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate, readingMinutes } from '@/lib/utils/news';
import { derivePostRegionBadge } from '@/lib/utils/news-roles';

/**
 * Card protagonista del hub de noticias — estilo portal editorial.
 * Título en gradiente naranja/rosa, imagen protagonista, sin wrapper propio.
 */
export function NewsHeroCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const reading = readingMinutes(post.bodyMd);

  return (
    <article className="relative group rounded-2xl overflow-hidden h-full min-h-[420px] lg:min-h-[500px]">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>

      {/* Imagen — fondo completo */}
      <div className="absolute inset-0">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt=""
            fill
            priority
            sizes="(min-width:1024px) 55vw, 100vw"
            className="object-cover brightness-[0.65] transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
        )}
        {/* Gradiente — bottom 70%, más suave arriba para ver la imagen */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,7,10,0.15) 0%, rgba(5,7,10,0.45) 30%, rgba(5,7,10,0.82) 65%, rgba(5,7,10,0.97) 100%)',
          }}
        />
        {/* Gradiente lateral izquierdo sutil */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-2/3 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, rgba(5,7,10,0.3) 0%, transparent 100%)' }}
        />
      </div>

      {/* Contenido */}
      <div className="relative h-full flex flex-col justify-end p-5 md:p-7">
        {/* Badge categoría */}
        <div className="mb-3">
          <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-[0.22em] rounded-full px-2.5 py-1 border backdrop-blur-sm ${cat.bg} ${cat.text} ${cat.border}`}>
            {cat.label}
          </span>
        </div>

        {/* Título en gradiente editorial — el elemento protagonista */}
        <h2
          className="font-display font-black uppercase tracking-tight leading-[0.92] mb-3"
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            background: 'linear-gradient(135deg, #f5632a 0%, #e03070 50%, #c42880 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {post.title}
        </h2>

        {/* Excerpt */}
        <p className="text-[13px] text-white/65 leading-snug mb-4 line-clamp-2">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <span className="font-semibold uppercase tracking-wider text-white/55">{post.author}</span>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/25" />
          <time dateTime={post.publishedAt?.toISOString() ?? ''} className="tabular-nums">{date}</time>
          <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-white/25" />
          <span>{reading} min</span>
        </div>
      </div>
    </article>
  );
}

/**
 * Card secundaria — dos estilos según posición:
 * - index 0: imagen prominente (cover card)
 * - index 1: más text-forward, imagen más oscura
 */
export function NewsSecondaryCard({ post, index = 0 }: { readonly post: PostWithTalents; readonly index?: number }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const region = derivePostRegionBadge(post.talentAvatars.map((t) => t.country));
  const isBottom = index === 1;

  return (
    <article className={`relative group rounded-xl overflow-hidden flex-1 min-h-[190px] ${isBottom ? 'border border-white/[0.08] bg-[#0c1016]' : ''}`}>
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>

      {/* Imagen */}
      <div className="absolute inset-0">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt=""
            fill
            sizes="(min-width:1024px) 22vw, 100vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${isBottom ? 'brightness-[0.4] saturate-[0.6]' : 'brightness-[0.6]'}`}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
        )}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isBottom
              ? 'linear-gradient(180deg, rgba(5,7,10,0.55) 0%, rgba(5,7,10,0.95) 60%, rgb(5,7,10) 100%)'
              : 'linear-gradient(180deg, rgba(5,7,10,0.1) 0%, rgba(5,7,10,0.7) 50%, rgba(5,7,10,0.97) 100%)',
          }}
        />
      </div>

      {/* Contenido */}
      <div className="relative h-full flex flex-col justify-end p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cat.accent}`} aria-hidden />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">{cat.label}</span>
          {region ? (
            <>
              <span aria-hidden className="text-white/15">·</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">{region}</span>
            </>
          ) : null}
        </div>
        <h3 className="font-display font-black uppercase text-white tracking-tight leading-[1.05] line-clamp-2 mb-1.5"
          style={{ fontSize: isBottom ? '1rem' : '1.1rem' }}>
          {post.title}
        </h3>
        <time dateTime={post.publishedAt?.toISOString() ?? ''} className="text-[9px] text-white/35 tabular-nums uppercase tracking-wider">
          {date}
        </time>
      </div>
    </article>
  );
}
