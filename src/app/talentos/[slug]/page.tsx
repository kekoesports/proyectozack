import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getTalentSlugs, getTalentBySlug } from '@/lib/queries/talents';
import { SectionTag } from '@/components/ui/SectionTag';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { gradientStyle } from '@/lib/utils/gradient';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { absoluteUrl } from '@/lib/site-url';
import { truncateMetaDescription } from '@/lib/utils/text';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getTalentSlugs();
  return slugs.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const talent = await getTalentBySlug(slug);
  if (!talent) return {};

  const description = truncateMetaDescription(talent.bio || undefined);
  const title = `${talent.name} — ${talent.role}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/talentos/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/talentos/${slug}`),
      type: 'profile',
      images: talent.photoUrl
        ? [{ url: talent.photoUrl, width: 600, height: 600 }]
        : [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: talent.photoUrl ? [talent.photoUrl] : undefined,
    },
  };
}

export default async function TalentPage({ params }: PageProps) {
  const { slug } = await params;
  const talent = await getTalentBySlug(slug);
  if (!talent) notFound();

  const grad = gradientStyle(talent.gradientC1, talent.gradientC2);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Talentos', url: absoluteUrl('/talentos') },
    { name: talent.name, url: absoluteUrl(`/talentos/${slug}`) },
  ]);

  const parseFollowers = (display: string): number => {
    const clean = display.trim();
    if (/[Mm]$/i.test(clean)) return Math.round(parseFloat(clean) * 1_000_000);
    if (/[Kk]$/i.test(clean)) return Math.round(parseFloat(clean) * 1_000);
    return parseInt(clean.replace(/[.,\s]/g, ''), 10) || 0;
  };

  const interactionStats = talent.socials
    .filter((s) => s.followersDisplay && s.followersDisplay !== '-')
    .map((s) => ({
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/FollowAction',
      userInteractionCount: parseFollowers(s.followersDisplay),
      name: s.platform,
    }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': absoluteUrl(`/talentos/${slug}`),
    name: talent.name,
    jobTitle: talent.role,
    description: talent.bio,
    url: absoluteUrl(`/talentos/${slug}`),
    ...(talent.photoUrl ? { image: talent.photoUrl } : {}),
    ...(talent.tags.length > 0 ? { knowsAbout: talent.tags.map((t) => t.tag) } : {}),
    ...(interactionStats.length > 0 ? { interactionStatistic: interactionStats } : {}),
    worksFor: { '@type': 'Organization', name: 'SocialPro', url: absoluteUrl('/') },
    sameAs: talent.socials
      .filter((s) => s.profileUrl)
      .map((s) => s.profileUrl),
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

      {/* ── Hero (gradient + photo) ── */}
      <section className="relative pt-16 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 h-[420px] md:h-[480px]" style={{ background: grad }} />
        <div className="absolute inset-0 h-[420px] md:h-[480px] bg-black/30" />

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          {/* Back link */}
          <Link
            href="/talentos"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-8"
          >
            <span aria-hidden="true">&larr;</span> Volver a talentos
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Photo */}
            <div className="relative w-40 h-40 md:w-52 md:h-52 shrink-0 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl">
              {talent.photoUrl ? (
                <Image
                  src={talent.photoUrl}
                  alt={talent.name}
                  fill
                  sizes="(max-width: 768px) 160px, 208px"
                  className="object-cover object-top"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-4xl font-display font-black text-white/80"
                  style={{ background: grad }}
                >
                  {talent.initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-none">
                  {talent.name}
                </h1>
                <StatusBadge status={talent.status} />
              </div>
              <p className="text-lg text-white/70 mb-1">{talent.role}</p>
              <p className="text-sm text-white/50">{talent.game}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content (light) ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Bio */}
          <div className="mb-12">
            <h2 className="sr-only">{`Sobre ${talent.name}`}</h2>
            <SectionTag>{`Sobre ${talent.name}`}</SectionTag>
            <p className="text-base text-sp-muted leading-relaxed max-w-2xl">
              {talent.bio}
            </p>
          </div>

          {/* Stats grid */}
          {talent.stats.length > 0 && (
            <div className="mb-12">
              <h2 className="sr-only">Estadísticas</h2>
              <SectionTag>Estadísticas</SectionTag>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                {talent.stats.map((stat) => (
                  <div
                    key={stat.id}
                    className="rounded-xl border border-sp-border bg-sp-off p-5 text-center"
                  >
                    <div className="text-sm mb-1">{stat.icon}</div>
                    <div className="font-display text-2xl font-black text-sp-dark">
                      {stat.value}
                    </div>
                    <div className="text-xs text-sp-muted mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {talent.tags.length > 0 && (
            <div className="mb-12">
              <h2 className="sr-only">Especialidades</h2>
              <SectionTag>Especialidades</SectionTag>
              <div className="flex flex-wrap gap-2 mt-2">
                {talent.tags.map((t) => (
                  <span
                    key={t.id}
                    className="text-sm px-3 py-1.5 rounded-full bg-sp-off text-sp-dark font-medium"
                  >
                    {t.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Socials */}
          {talent.socials.length > 0 && (
            <div className="mb-12">
              <h2 className="sr-only">Redes sociales</h2>
              <SectionTag>Redes sociales</SectionTag>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {talent.socials.map((s) => (
                  <a
                    key={s.id}
                    href={s.profileUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl bg-sp-off px-5 py-4 hover:bg-sp-bg2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${s.hexColor}20` }}
                      >
                        <SocialIcon type={s.platform} color={s.hexColor} size={18} />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-sp-dark block">{s.handle}</span>
                        <span className="text-xs text-sp-muted">{s.platform}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-sp-dark">{s.followersDisplay}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="text-center pt-4">
            <Link
              href="/#contacto"
              className="inline-block text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
              style={{ background: grad }}
            >
              Contactar para colaboración
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
