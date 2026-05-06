import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getTalentSlugs, getTalentBySlug } from '@/lib/queries/talents';
import { getCodesByTalent } from '@/lib/queries/creatorCodes';
import { getActiveGiveaways, getFinishedGiveaways } from '@/lib/queries/giveaways';
import { SectionTag } from '@/components/ui/SectionTag';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { HeroSponsorCard } from '@/features/giveaways/components/HeroSponsorCard';
import { CodesExpandable } from '@/features/giveaways/components/CodesExpandable';
import { GiveawayFeatured } from '@/features/giveaways/components/GiveawayFeatured';
import { GiveawayRow } from '@/features/giveaways/components/GiveawayRow';
import { gradientStyle } from '@/lib/utils/gradient';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { absoluteUrl } from '@/lib/site-url';
import { truncateMetaDescription } from '@/lib/utils/text';
import type { CreatorCodeWithTalent, GiveawayWithTalent, Talent } from '@/types';

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

function toTalentBase(t: Talent & Record<string, unknown>): Talent {
  return {
    id: t.id, slug: t.slug, name: t.name, role: t.role, game: t.game,
    platform: t.platform, status: t.status, bio: t.bio,
    gradientC1: t.gradientC1, gradientC2: t.gradientC2,
    initials: t.initials, photoUrl: t.photoUrl, sortOrder: t.sortOrder,
    visibility: t.visibility, topGeos: t.topGeos,
    audienceLanguage: t.audienceLanguage, creatorCountry: t.creatorCountry,
    audienceStatus: t.audienceStatus, lastStatsUpdateAt: t.lastStatsUpdateAt,
    updatedAt: t.updatedAt, cnmcStatus: t.cnmcStatus,
    cnmcRegisteredAt: t.cnmcRegisteredAt, cnmcNotes: t.cnmcNotes,
    hasRcInsurance: t.hasRcInsurance, taxType: t.taxType,
    nif: t.nif, fiscalName: t.fiscalName, fiscalAddress: t.fiscalAddress,
  };
}

export default async function TalentPage({ params }: PageProps) {
  const { slug } = await params;
  const talent = await getTalentBySlug(slug);
  if (!talent) notFound();

  const [codes, active, finished] = await Promise.all([
    getCodesByTalent(talent.id),
    getActiveGiveaways(talent.id),
    getFinishedGiveaways(talent.id),
  ]);

  const base             = toTalentBase(talent);
  const codesWithTalent: CreatorCodeWithTalent[] = codes.map((c) => ({ ...c, talent: base }));
  const activeWithTalent: GiveawayWithTalent[]    = active.map((g) => ({ ...g, talent: base }));
  const finishedWithTalent: GiveawayWithTalent[]  = finished.map((g) => ({ ...g, talent: base }));
  const heroCode       = codesWithTalent.find((c) => c.isFeatured) ?? null;
  const secondaryCodes = heroCode ? codesWithTalent.filter((c) => c.id !== heroCode.id) : codesWithTalent;
  const featuredGiveaway = activeWithTalent[0] ?? null;
  const restGiveaways    = activeWithTalent.slice(1);

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

      {/* ── Códigos y Sorteos ── */}
      {(codesWithTalent.length > 0 || activeWithTalent.length > 0 || finishedWithTalent.length > 0) && (
        <section className="bg-sp-black py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-6 space-y-10">

            {codesWithTalent.length > 0 && (
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                  Códigos de {talent.name} · {codesWithTalent.length} activos
                </p>
                {heroCode && <HeroSponsorCard code={heroCode} />}
                {secondaryCodes.length > 0 && (
                  <CodesExpandable
                    codes={secondaryCodes}
                    label={heroCode ? 'Más códigos' : `Códigos de ${talent.name}`}
                  />
                )}
              </div>
            )}

            {activeWithTalent.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Sorteos activos</p>
                  <span className="flex items-center gap-1 text-[9px] font-black text-[#C3FC00]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                    {activeWithTalent.length} live
                  </span>
                </div>
                {featuredGiveaway && <GiveawayFeatured giveaway={featuredGiveaway} />}
                {restGiveaways.length > 0 && (
                  <div className="space-y-2">
                    {restGiveaways.map((g) => <GiveawayRow key={g.id} giveaway={g} />)}
                  </div>
                )}
              </div>
            )}

            {finishedWithTalent.length > 0 && (
              <details className="group border-t border-white/[0.06] pt-6">
                <summary className="cursor-pointer list-none flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">
                    Sorteos finalizados · {finishedWithTalent.length}
                  </p>
                  <span className="text-[10px] font-bold text-white/20 group-open:hidden">Mostrar ▸</span>
                  <span className="text-[10px] font-bold text-white/20 hidden group-open:inline">Ocultar ▴</span>
                </summary>
                <div className="space-y-2">
                  {finishedWithTalent.map((g) => <GiveawayRow key={g.id} giveaway={g} finished />)}
                </div>
              </details>
            )}
          </div>
        </section>
      )}
    </>
  );
}
