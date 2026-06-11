import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getCaseSlugs, getCaseBySlug, getRelatedCases } from '@/lib/queries/cases';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { absoluteUrl } from '@/lib/site-url';
import { truncateMetaDescription } from '@/lib/utils/text';
import { getCaseConfig } from '@/features/cases/case-config';
import type { CaseCreatorWithSlug } from '@/types';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const cases = await getCaseSlugs();
  return cases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cs = await getCaseBySlug(slug);
  if (!cs) return {};

  const description =
    truncateMetaDescription(cs.excerpt || cs.body[0]?.paragraph) ?? cs.title;
  const title = `${cs.brandName} × SocialPro — Caso de Éxito`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/casos/${slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/casos/${slug}`),
      images: [{ url: absoluteUrl(`/api/og-image/case?slug=${slug}`), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(`/api/og-image/case?slug=${slug}`)],
    },
  };
}

function CreatorAvatar({ creator }: { creator: CaseCreatorWithSlug }) {
  const inner = creator.talentPhotoUrl ? (
    <Image
      src={creator.talentPhotoUrl}
      alt={creator.creatorName}
      width={72}
      height={72}
      className="w-full h-full object-cover"
    />
  ) : (
    <span className="font-display text-lg font-black text-white uppercase">
      {creator.talentInitials ?? creator.creatorName.slice(0, 2)}
    </span>
  );

  const gradientStyle =
    !creator.talentPhotoUrl && creator.talentGradientC1 && creator.talentGradientC2
      ? { background: `linear-gradient(135deg, ${creator.talentGradientC1}, ${creator.talentGradientC2})` }
      : !creator.talentPhotoUrl
      ? { background: 'linear-gradient(135deg, #f5632a, #8b3aad)' }
      : undefined;

  return (
    <div
      className="w-16 h-16 md:w-18 md:h-18 rounded-full overflow-hidden flex items-center justify-center shrink-0 mx-auto"
      style={gradientStyle}
    >
      {inner}
    </div>
  );
}

function CreatorCard({ creator }: { creator: CaseCreatorWithSlug }) {
  const content = (
    <div className="flex flex-col items-center gap-2 text-center group/card">
      <div className="relative">
        <CreatorAvatar creator={creator} />
        {creator.talentSlug && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-sp-orange border-2 border-white" />
        )}
      </div>
      <span className={`text-xs font-bold uppercase tracking-wide leading-tight ${
        creator.talentSlug ? 'text-sp-dark group-hover/card:text-sp-orange transition-colors' : 'text-sp-muted'
      }`}>
        {creator.creatorName}
      </span>
    </div>
  );

  if (creator.talentSlug) {
    return (
      <Link href={`/talentos/${creator.talentSlug}`} className="block">
        {content}
      </Link>
    );
  }
  return <div>{content}</div>;
}

function StatValue({ value }: { value: string }) {
  const isLong = value.length > 6;
  return (
    <div className={`font-display font-black gradient-text mb-1 leading-none ${
      isLong ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'
    }`}>
      {value}
    </div>
  );
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const [cs, relatedCases] = await Promise.all([
    getCaseBySlug(slug),
    getRelatedCases(slug, 3),
  ]);
  if (!cs) notFound();

  const config = getCaseConfig(slug);
  const logoUrl = config.logoUrl ?? cs.logoUrl;

  const takeaways = cs.keyTakeaways
    ? cs.keyTakeaways.split('\n').map((t) => t.trim()).filter(Boolean)
    : [];

  const ctaText = config.ctaText ?? '¿Quieres resultados similares para tu marca? Cuéntanos tu objetivo.';

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Casos de Éxito', url: absoluteUrl('/casos') },
    { name: cs.brandName, url: absoluteUrl(`/casos/${slug}`) },
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': absoluteUrl(`/casos/${slug}#article`),
    headline: cs.title,
    url: absoluteUrl(`/casos/${slug}`),
    inLanguage: 'es',
    image: cs.heroImageUrl ?? absoluteUrl('/og-socialpro.png'),
    description: cs.excerpt || cs.body[0]?.paragraph || '',
    datePublished: cs.updatedAt.toISOString(),
    dateModified: cs.updatedAt.toISOString(),
    author: { '@type': 'Organization', '@id': absoluteUrl('/#organization') },
    publisher: { '@type': 'Organization', '@id': absoluteUrl('/#organization') },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/casos/${slug}`) },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      {/* ── Hero ── */}
      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-6">
          <Link
            href="/casos"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-10"
          >
            <span aria-hidden="true">&larr;</span> Casos de éxito
          </Link>

          {/* Stats en primer plano */}
          {config.stats.length > 0 && (
            <div className={`grid gap-2 sm:gap-3 mb-10 ${config.stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
              {config.stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-4 sm:px-4 sm:py-5 text-center">
                  <StatValue value={s.value} />
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mt-1.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Logo + badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={cs.brandName}
                width={160}
                height={64}
                className="object-contain max-h-16 brightness-0 invert"
              />
            ) : (
              <div className="font-display text-4xl font-black gradient-text">{cs.brandName}</div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {config.sector && (
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-sp-orange border border-sp-orange/30 rounded-full px-3 py-1 bg-sp-orange/5">
                  {config.sector}
                </span>
              )}
              {cs.campaignPeriod && (
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30 border border-white/10 rounded-full px-3 py-1">
                  {cs.campaignPeriod}
                </span>
              )}
            </div>
          </div>

          <h1 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight mb-5">
            {cs.title}
          </h1>

          {cs.excerpt && (
            <p className="text-lg text-white/55 leading-relaxed max-w-2xl mb-8">{cs.excerpt}</p>
          )}

          {/* CTA inline en hero */}
          <Link
            href="/contacto?type=brand"
            className="inline-flex items-center gap-2 bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Hablemos de tu campaña
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ── Creadores ── */}
      {cs.creators.length > 0 && (
        <section className="bg-sp-off py-16">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sp-orange mb-2">
              Creadores activados
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-black uppercase text-sp-dark mb-10">
              {cs.creators.length} {cs.creators.length === 1 ? 'Creador' : 'Creadores'} del Roster SocialPro
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-6">
              {cs.creators.map((c) => (
                <CreatorCard key={c.id} creator={c} />
              ))}
            </div>
            {cs.creators.some((c) => c.talentSlug) && (
              <p className="mt-6 text-xs text-sp-muted">
                <span className="inline-block w-2 h-2 rounded-full bg-sp-orange mr-1.5 align-middle" />
                Creadores con perfil en el roster — haz clic para ver su ficha
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Lo que hicimos ── */}
      {config.services.length > 0 && (
        <section className="bg-white py-16 border-b border-sp-border">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sp-orange mb-2">
              Servicios
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-black uppercase text-sp-dark mb-8">
              Lo que hicimos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.services.map((s) => (
                <div key={s} className="flex items-start gap-3 bg-sp-off rounded-xl px-4 py-3.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-sp-orange shrink-0 mt-0.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-sm text-sp-dark font-medium">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── La campaña (body) ── */}
      {cs.body.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-3xl mx-auto px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sp-orange mb-2">
              La campaña
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-black uppercase text-sp-dark mb-8">
              Cómo lo ejecutamos
            </h2>
            <div className="space-y-5 text-base text-sp-muted leading-relaxed">
              {cs.body.map((p) => (
                <p key={p.id}>{p.paragraph}</p>
              ))}
            </div>

            {cs.spokespersonQuote && (
              <blockquote className="mt-12 border-l-4 border-sp-orange pl-6">
                <p className="text-lg text-sp-dark font-medium leading-relaxed italic mb-4">
                  &ldquo;{cs.spokespersonQuote}&rdquo;
                </p>
                {cs.spokespersonName && (
                  <footer className="text-sm text-sp-muted not-italic">
                    <span className="font-semibold text-sp-dark">{cs.spokespersonName}</span>
                    {cs.spokespersonRole && <span> — {cs.spokespersonRole}</span>}
                  </footer>
                )}
              </blockquote>
            )}
          </div>
        </section>
      )}

      {/* ── Por qué funcionó ── */}
      {takeaways.length > 0 && (
        <section className="bg-sp-black py-16">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sp-orange mb-2">
              Resultados
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-black uppercase text-white mb-10">
              Por qué funcionó
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {takeaways.map((t, i) => (
                <div key={i} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                  <span className="font-display text-2xl font-black gradient-text leading-none shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm text-white/70 leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Tags ── */}
      {cs.tags.length > 0 && (
        <section className="bg-white py-10 border-b border-sp-border">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-wrap gap-2">
              {cs.tags.map((t) => (
                <span key={t.id} className="text-xs px-3 py-1.5 rounded-full bg-sp-off text-sp-muted font-semibold uppercase tracking-wide border border-sp-border">
                  {t.tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Otros casos de éxito ── */}
      {relatedCases.length > 0 && (
        <section className="bg-sp-off py-16 border-b border-sp-border">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sp-orange mb-2">
              Más casos
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-black uppercase text-sp-dark mb-8">
              Otros casos de éxito
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedCases.map((r) => {
                const rConfig = getCaseConfig(r.slug);
                return (
                  <Link
                    key={r.slug}
                    href={`/casos/${r.slug}`}
                    className="group flex flex-col gap-4 bg-white rounded-2xl border border-sp-border px-6 py-5 hover:border-sp-orange/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="h-10 flex items-center">
                      {rConfig.logoUrl ? (
                        <Image
                          src={rConfig.logoUrl}
                          alt={r.brandName}
                          width={120}
                          height={40}
                          className="object-contain max-h-8 opacity-75 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <span className="font-display text-lg font-black uppercase text-sp-dark/60 group-hover:text-sp-dark transition-colors">
                          {r.brandName}
                        </span>
                      )}
                    </div>
                    {rConfig.sector && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-sp-muted">
                        {rConfig.sector}
                      </span>
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-sp-orange mt-auto inline-flex items-center gap-1">
                      Ver caso <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="bg-white py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-sp-muted mb-6 text-base leading-relaxed">{ctaText}</p>
          <Link
            href="/contacto?type=brand"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-10 py-3.5 rounded-full hover:opacity-90 transition-opacity"
          >
            Hablemos de tu campaña
          </Link>
          <div className="mt-8 pt-8 border-t border-sp-border">
            <Link
              href="/casos"
              className="text-sm text-sp-muted hover:text-sp-dark transition-colors inline-flex items-center gap-1.5"
            >
              <span aria-hidden="true">&larr;</span> Ver todos los casos de éxito
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
