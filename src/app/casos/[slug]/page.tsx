import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getCaseSlugs, getCaseBySlug } from '@/lib/queries/cases';
import { SectionTag } from '@/components/ui/SectionTag';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { absoluteUrl } from '@/lib/site-url';
import { truncateMetaDescription } from '@/lib/utils/text';

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
      images: cs.heroImageUrl
        ? [{ url: cs.heroImageUrl, width: 1200, height: 630 }]
        : [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: cs.heroImageUrl ? [cs.heroImageUrl] : [absoluteUrl('/og-socialpro.png')],
    },
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const cs = await getCaseBySlug(slug);
  if (!cs) notFound();

  const metrics = [
    { label: 'Alcance', value: cs.reach },
    { label: 'Engagement', value: cs.engagementRate },
    { label: 'Conversiones', value: cs.conversions },
    { label: 'ROI', value: cs.roiMultiplier },
  ].filter((m) => m.value);

  const takeaways = cs.keyTakeaways
    ? cs.keyTakeaways.split('\n').map((t) => t.trim()).filter(Boolean)
    : [];

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
    ...(cs.spokespersonQuote && cs.spokespersonName
      ? {
          review: {
            '@type': 'Review',
            reviewBody: cs.spokespersonQuote,
            author: {
              '@type': 'Person',
              name: cs.spokespersonName,
              jobTitle: cs.spokespersonRole ?? undefined,
            },
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      {/* ── Hero (dark) ── */}
      <section className="bg-sp-black pt-32 pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <Link
            href="/casos"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-8"
          >
            <span aria-hidden="true">&larr;</span> Volver a casos
          </Link>

          {/* Brand + period */}
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              {cs.logoUrl ? (
                <Image
                  src={cs.logoUrl}
                  alt={cs.brandName}
                  width={120}
                  height={48}
                  className="object-contain max-h-12 brightness-0 invert"
                />
              ) : (
                <div className="font-display text-4xl font-black gradient-text">{cs.brandName}</div>
              )}
            </div>
            {cs.campaignPeriod && (
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30 border border-white/10 rounded-full px-3 py-1">
                {cs.campaignPeriod}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight mb-4">
            {cs.title}
          </h1>

          {cs.excerpt && (
            <p className="text-lg text-white/60 leading-relaxed max-w-2xl mb-10">{cs.excerpt}</p>
          )}

          {/* Metrics */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                  <div className="font-display text-2xl md:text-3xl font-black gradient-text mb-1">{m.value}</div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-white/40">{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Body (light) ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">

          {/* Creators */}
          {cs.creators.length > 0 && (
            <div className="mb-10">
              <SectionTag>Creadores participantes</SectionTag>
              <div className="flex flex-wrap gap-2 mt-2">
                {cs.creators.map((c) =>
                  c.talentSlug ? (
                    <Link
                      key={c.id}
                      href={`/talentos/${c.talentSlug}`}
                      className="text-sm px-3 py-1.5 rounded-full bg-sp-off text-sp-dark font-medium hover:bg-sp-orange/10 hover:text-sp-orange transition-colors"
                    >
                      {c.creatorName}
                    </Link>
                  ) : (
                    <span key={c.id} className="text-sm px-3 py-1.5 rounded-full bg-sp-off text-sp-dark font-medium">
                      {c.creatorName}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {/* Body paragraphs */}
          <div className="space-y-5 text-base text-sp-muted leading-relaxed mb-12">
            {cs.body.map((p) => (
              <p key={p.id}>{p.paragraph}</p>
            ))}
          </div>

          {/* Spokesperson quote */}
          {cs.spokespersonQuote && (
            <blockquote className="my-12 border-l-4 border-sp-orange pl-6">
              <p className="text-lg text-sp-dark font-medium leading-relaxed italic mb-4">
                &ldquo;{cs.spokespersonQuote}&rdquo;
              </p>
              {cs.spokespersonName && (
                <footer className="text-sm text-sp-muted not-italic">
                  <span className="font-semibold text-sp-dark">{cs.spokespersonName}</span>
                  {cs.spokespersonRole && (
                    <span className="text-sp-muted"> — {cs.spokespersonRole}</span>
                  )}
                </footer>
              )}
            </blockquote>
          )}

          {/* Key takeaways */}
          {takeaways.length > 0 && (
            <div className="bg-sp-off rounded-2xl p-8 mb-12">
              <h2 className="font-display text-lg font-black uppercase tracking-wider text-sp-dark mb-5">
                Conclusiones clave
              </h2>
              <ul className="space-y-3">
                {takeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-sp-orange shrink-0" />
                    <span className="text-sm text-sp-muted leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {cs.tags.length > 0 && (
            <div className="border-t border-sp-border pt-8 mb-12">
              <div className="flex flex-wrap gap-2">
                {cs.tags.map((t) => (
                  <span key={t.id} className="text-xs px-3 py-1.5 rounded-full bg-sp-off text-sp-muted font-semibold uppercase tracking-wide">
                    {t.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="text-center">
            <p className="text-sp-muted mb-6 text-sm">
              ¿Quieres resultados similares para tu marca? Cuéntanos tu objetivo.
            </p>
            <Link
              href="/#contacto"
              className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Hablemos de tu campaña
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
