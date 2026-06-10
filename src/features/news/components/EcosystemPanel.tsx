import Link from 'next/link';
import Image from 'next/image';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import type { EcosystemRelations } from '@/lib/news/ecosystem';
import { formatNewsDate } from '@/lib/utils/news';

type Props = {
  readonly slug: string;
  readonly ecosystem: EcosystemRelations;
};

export function EcosystemPanel({ slug, ecosystem }: Props) {
  const { creators, tags, relatedPosts, channelTelegram } = ecosystem;

  const hasAnyContent =
    creators.length > 0 ||
    tags.length > 0 ||
    relatedPosts.length > 0 ||
    channelTelegram !== null;

  if (!hasAnyContent) return null;

  return (
    <section
      aria-label="Relacionado en el ecosistema SocialPro"
      className="border-t border-white/[0.06] bg-sp-black"
    >
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">
          Ecosistema relacionado
        </p>
        <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-[1.0] mb-8 md:mb-10">
          Sigue el hilo en SocialPro
        </h2>

        <div
          className={`grid gap-8 lg:gap-10 ${
            creators.length > 0 || channelTelegram !== null
              ? 'lg:grid-cols-[1.4fr_1fr]'
              : ''
          }`}
        >
          <div className="space-y-6">
            {relatedPosts.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/45 mb-4">
                  Más sobre los mismos temas
                </p>
                <ul className="space-y-3">
                  {relatedPosts.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/news/${p.slug}`}
                        className="group flex gap-4 bg-[#0c1016] border border-white/[0.06] rounded-xl p-3 hover:border-white/15 hover:bg-[#10151d] transition-colors"
                      >
                        <div className="relative flex-none w-24 h-16 rounded-lg overflow-hidden bg-sp-black">
                          {p.coverUrl ? (
                            <Image
                              src={p.coverUrl}
                              alt=""
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-sp-black via-sp-dark to-sp-black" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="font-display font-black uppercase text-white text-sm leading-[1.15] tracking-tight line-clamp-2 group-hover:text-white/95 mb-1">
                            {p.title}
                          </h3>
                          <time
                            dateTime={p.publishedAt?.toISOString() ?? ''}
                            className="text-[10px] uppercase tracking-wider text-white/35 tabular-nums"
                          >
                            {formatNewsDate(p.publishedAt)}
                          </time>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {tags.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/45 mb-3">
                  Tags
                </p>
                <ul className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/news?tag=${encodeURIComponent(t.slug)}`}
                        className="inline-block px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-[11px] font-medium text-white/70 hover:bg-white/[0.07] hover:text-white hover:border-white/25 transition-colors"
                      >
                        #{t.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {creators.length > 0 || channelTelegram !== null ? (
          <aside className="space-y-5">
            {creators.length > 0 ? (
              <div className="bg-[#0c1016] border border-white/[0.06] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-4">
                  Creators mencionados
                </p>
                <ul className="space-y-3">
                  {creators.map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/talentos/${t.slug}`}
                        className="group flex items-center gap-3"
                      >
                        <div className="relative flex-none w-10 h-10 rounded-full overflow-hidden bg-sp-black ring-1 ring-white/10">
                          {t.photoUrl ? (
                            <Image
                              src={t.photoUrl}
                              alt={t.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div
                              className="absolute inset-0 flex items-center justify-center font-display font-black text-white text-[11px]"
                              style={{
                                background: `linear-gradient(135deg, ${t.gradientC1}, ${t.gradientC2})`,
                              }}
                            >
                              {t.initials}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-black text-white text-sm leading-none group-hover:text-white/95 truncate">
                            {t.name}
                          </div>
                          <div className="text-[11px] text-white/40 mt-0.5 uppercase tracking-wider truncate">
                            {t.role} · {t.platform}
                          </div>
                        </div>
                        <span aria-hidden className="text-white/35 group-hover:text-white/85 group-hover:translate-x-0.5 transition-all">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {creators.length > 0 ? (
              <div className="bg-[#0c1016] border border-white/[0.06] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40 mb-1">
                  Trabaja con ellos
                </p>
                <p className="text-sm font-bold text-white leading-snug mb-3">
                  ¿Tu marca encaja con este roster?
                </p>
                <p className="text-[12px] text-white/50 leading-relaxed mb-4">
                  Cuéntanos tu campaña y te preparamos una propuesta en 24h.
                </p>
                <TrackedCtaLink
                  href="/contacto?type=brand"
                  ctaId={`news_ecosystem_${slug}_brand_cta`}
                  className="inline-flex items-center justify-center w-full gap-2 bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-xs px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                >
                  Solicitar propuesta
                  <span aria-hidden>→</span>
                </TrackedCtaLink>
              </div>
            ) : null}

            {channelTelegram ? (
              <div className="relative bg-[#0c1016] border border-white/[0.07] rounded-2xl p-5 overflow-hidden">
                <div
                  aria-hidden
                  className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at center, rgba(245,99,42,0.20), rgba(224,48,112,0.10) 40%, transparent 70%)',
                    filter: 'blur(40px)',
                  }}
                />
                <div className="relative flex items-center gap-3 mb-3">
                  <Image
                    src="/images/apuesta-segura-cs2/badge.png"
                    alt=""
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full ring-1 ring-white/10 object-cover"
                  />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange leading-none">
                      Canal oficial
                    </p>
                    <div className="font-display font-black text-white text-sm mt-1.5 leading-none">
                      {channelTelegram.label}
                    </div>
                  </div>
                </div>
                <p className="relative text-[12px] text-white/55 leading-relaxed mb-4">
                  Análisis competitivo CS2 · picks publicadas en abierto · comunidad gratuita.
                </p>
                <TrackedCtaLink
                  href={channelTelegram.url}
                  ctaId={`news_ecosystem_${slug}_telegram`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative inline-flex items-center justify-center w-full gap-2 bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-xs px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                >
                  Entrar al canal
                  <span aria-hidden>→</span>
                </TrackedCtaLink>
              </div>
            ) : null}
          </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
