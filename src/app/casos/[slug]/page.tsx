import type { Metadata } from 'next';
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
  const caseStudy = await getCaseBySlug(slug);
  if (!caseStudy) return {};

  const description =
    truncateMetaDescription(caseStudy.excerpt || caseStudy.body[0]?.paragraph) ?? caseStudy.title;
  const title = `${caseStudy.brandName} × SocialPro — Caso de Éxito`;
  const hasImage = !!caseStudy.heroImageUrl;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `/casos/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/casos/${slug}`),
      images: hasImage ? [{ url: caseStudy.heroImageUrl!, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: hasImage ? [caseStudy.heroImageUrl!] : undefined,
    },
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const caseStudy = await getCaseBySlug(slug);
  if (!caseStudy) notFound();

  const metrics = [
    { label: 'Alcance', value: caseStudy.reach },
    { label: 'Engagement', value: caseStudy.engagementRate },
    { label: 'Conversiones', value: caseStudy.conversions },
    { label: 'ROI', value: caseStudy.roiMultiplier },
  ].filter((m) => m.value);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Casos de Éxito', url: absoluteUrl('/#casos') },
    { name: caseStudy.brandName, url: absoluteUrl(`/casos/${slug}`) },
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: caseStudy.title,
    author: { '@type': 'Organization', name: 'SocialPro' },
    publisher: { '@type': 'Organization', name: 'SocialPro' },
    description: caseStudy.excerpt || caseStudy.body[0]?.paragraph || '',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ── Hero (dark) ── */}
      <section className="bg-sp-black pt-32 pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Back link */}
          <Link
            href="/#casos"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-8"
          >
            <span aria-hidden="true">&larr;</span> Volver a casos
          </Link>

          {/* Brand logo / name */}
          <div className="mb-6">
            {caseStudy.logoUrl ? (
              <Image
                src={caseStudy.logoUrl}
                alt={caseStudy.brandName}
                width={120}
                height={48}
                className="object-contain max-h-12 brightness-0 invert"
              />
            ) : (
              <div className="font-display text-4xl font-black gradient-text">
                {caseStudy.brandName}
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight mb-4">
            {caseStudy.title}
          </h1>

          {caseStudy.excerpt && (
            <p className="text-lg text-white/60 leading-relaxed max-w-2xl mb-10">
              {caseStudy.excerpt}
            </p>
          )}

          {/* Metrics grid */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 text-center"
                >
                  <div className="font-display text-2xl md:text-3xl font-black gradient-text mb-1">
                    {m.value}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    {m.label}
                  </div>
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
          {caseStudy.creators.length > 0 && (
            <div className="mb-10">
              <SectionTag>Creadores participantes</SectionTag>
              <div className="flex flex-wrap gap-2 mt-2">
                {caseStudy.creators.map((c) => (
                  <span
                    key={c.id}
                    className="text-sm px-3 py-1.5 rounded-full bg-sp-off text-sp-dark font-medium"
                  >
                    {c.creatorName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Body paragraphs */}
          <div className="space-y-5 text-base text-sp-muted leading-relaxed mb-10">
            {caseStudy.body.map((p) => (
              <p key={p.id}>{p.paragraph}</p>
            ))}
          </div>

          {/* Tags */}
          {caseStudy.tags.length > 0 && (
            <div className="border-t border-sp-border pt-8">
              <div className="flex flex-wrap gap-2">
                {caseStudy.tags.map((t) => (
                  <span
                    key={t.id}
                    className="text-xs px-3 py-1.5 rounded-full bg-sp-off text-sp-muted font-semibold uppercase tracking-wide"
                  >
                    {t.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA / back */}
          <div className="mt-12 text-center">
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
