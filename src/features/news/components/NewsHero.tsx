import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { deriveNewsCategory, formatNewsDate, readingMinutes } from '@/lib/utils/news';

// Altura fija del hero en desktop: 560px
// Dos secundarias stacked con gap-4: (560 - 16) / 2 = 272px cada una

/**
 * Hero editorial — imagen fondo completo, overlay gradient, texto bottom-left.
 * Altura fija 560px desktop. Estilo portal esports premium (HLTV/Dexerto).
 */
export function NewsHeroCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);
  const reading = readingMinutes(post.bodyMd);

  return (
    <article className="relative group rounded-2xl overflow-hidden h-[380px] md:h-[480px] lg:h-[560px] hover:ring-1 hover:ring-white/15 transition-all">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>

      {/* Imagen — fondo completo */}
      {post.coverUrl ? (
        <Image
          src={post.coverUrl}
          alt=""
          fill
          priority
          sizes="(min-width:1024px) 62vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
      )}

      {/* Gradient overlay — pesado en el bottom para legibilidad */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 30%, rgba(0,0,0,0.72) 62%, rgba(0,0,0,0.95) 100%)',
        }}
      />

      {/* Badge categoría */}
      <div className="absolute top-4 left-4 z-10">
        <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-[0.22em] rounded-full px-2.5 py-1 border backdrop-blur-sm ${cat.bg} ${cat.text} ${cat.border}`}>
          {cat.label}
        </span>
      </div>

      {/* Texto — bottom-left superpuesto */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7 z-10">
        <h2
          className="font-display font-black uppercase tracking-tight leading-[0.92] mb-3 line-clamp-2"
          style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.6rem)',
            background: 'linear-gradient(135deg, #f5632a 0%, #e03070 55%, #c42880 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {post.title}
        </h2>
        <p className="text-[13px] text-white/65 leading-snug line-clamp-2 mb-4 max-w-2xl hidden md:block">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <span className="font-semibold text-white/55 uppercase tracking-wider">{post.author}</span>
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
 * Secondary card — imagen fondo, overlay, texto overlay bottom.
 * Altura fija ~272px (la mitad del hero menos el gap).
 */
export function NewsSecondaryCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);

  return (
    <article className="relative group rounded-xl overflow-hidden h-[180px] md:h-[220px] lg:h-[272px] hover:ring-1 hover:ring-white/15 transition-all flex-1">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>

      {post.coverUrl ? (
        <Image
          src={post.coverUrl}
          alt=""
          fill
          sizes="(min-width:1024px) 30vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
      )}

      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.92) 100%)' }}
      />

      <div className="absolute top-3 left-3 z-10">
        <span className={`inline-flex items-center text-[8px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border backdrop-blur-sm ${cat.bg} ${cat.text} ${cat.border}`}>
          {cat.label}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10">
        <h3 className="font-display font-black uppercase text-white tracking-tight leading-[1.05] line-clamp-2 text-[14px] md:text-[15px]">
          {post.title}
        </h3>
        <time dateTime={post.publishedAt?.toISOString() ?? ''} className="text-[9px] text-white/35 tabular-nums uppercase tracking-wider mt-1.5 block">
          {date}
        </time>
      </div>
    </article>
  );
}

/**
 * Mini-card para el grid de 4 debajo del hero.
 */
export function NewsMiniCard({ post }: { readonly post: PostWithTalents }) {
  const cat = deriveNewsCategory(post.slug, post.title);
  const date = formatNewsDate(post.publishedAt);

  return (
    <article className="relative group rounded-xl overflow-hidden h-[160px] md:h-[180px] hover:ring-1 hover:ring-white/15 transition-all">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title}>
        <span className="sr-only">{post.title}</span>
      </Link>
      {post.coverUrl ? (
        <Image src={post.coverUrl} alt="" fill sizes="(min-width:1024px) 18vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] to-sp-black" />
      )}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.0) 20%, rgba(0,0,0,0.9) 100%)' }} />
      <div className="absolute top-2 left-2 z-10">
        <span className={`inline-flex items-center text-[7px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 border ${cat.bg} ${cat.text} ${cat.border}`}>
          {cat.label.slice(0, 5)}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <h3 className="font-display font-black uppercase text-white text-[12px] md:text-[13px] tracking-tight leading-[1.1] line-clamp-2">
          {post.title}
        </h3>
        <time className="text-[8px] text-white/30 uppercase tracking-wider mt-1 block">{date}</time>
      </div>
    </article>
  );
}
