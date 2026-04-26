import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import { gradientStyle } from '@/lib/gradient';

type BlogCardProps = {
  post: PostWithTalents;
}

export function BlogCard({ post }: BlogCardProps) {
  const avatars = post.talentAvatars.slice(0, 4);
  const extra   = (post.talentAvatars.length ?? 0) - avatars.length;

  return (
    <Link href={`/blog/${post.slug}`} className="group block">

      {/* Imagen — sin borde exterior, con overflow para el zoom */}
      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-sp-black mb-4">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sp-dark to-sp-black" />
        )}

        {/* Gradient overlay bottom para legibilidad de avatares */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Avatares de talentos */}
        {avatars.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center">
            {avatars.map((t, i) => (
              <div
                key={t.slug}
                className="relative w-7 h-7 rounded-full border-2 border-white/70 overflow-hidden flex-shrink-0"
                style={{ marginLeft: i === 0 ? 0 : -8, zIndex: avatars.length - i, background: gradientStyle(t.gradientC1, t.gradientC2) }}
              >
                {t.photoUrl ? (
                  <Image src={t.photoUrl} alt={t.name} fill sizes="28px" className="object-cover object-top" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white">
                    {t.initials}
                  </span>
                )}
              </div>
            ))}
            {extra > 0 && (
              <div
                className="relative w-7 h-7 rounded-full border-2 border-white/70 bg-sp-dark flex items-center justify-center flex-shrink-0 text-[8px] font-black text-white"
                style={{ marginLeft: -8, zIndex: 0 }}
              >
                +{extra}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Texto */}
      <div className="px-1">
        {post.publishedAt && (
          <time dateTime={post.publishedAt.toISOString()} className="text-xs text-sp-muted tracking-wide">
            {new Date(post.publishedAt).toLocaleDateString('es-ES', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </time>
        )}
        <h2 className="font-display text-xl font-black uppercase text-sp-dark leading-tight mt-1 mb-3 line-clamp-2 group-hover:text-sp-orange transition-colors duration-200">
          {post.title}
        </h2>
        <span className="text-xs font-semibold text-sp-orange tracking-wide">
          Leer artículo →
        </span>
      </div>
    </Link>
  );
}
