import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getTalentSlugs, getTalentBySlug } from '@/lib/queries/talents';
import { getCodesByTalent } from '@/lib/queries/creatorCodes';
import { getActiveGiveaways, getFinishedGiveaways } from '@/lib/queries/giveaways';
import { getWinnersByTalent } from '@/lib/queries/giveawayWinners';
import { WinnersList } from '@/features/giveaways/components/WinnersList';
import { HeroSponsorCard } from '@/features/giveaways/components/HeroSponsorCard';
import { CodesExpandable } from '@/features/giveaways/components/CodesExpandable';
import { GiveawayFeatured } from '@/features/giveaways/components/GiveawayFeatured';
import { GiveawayRow } from '@/features/giveaways/components/GiveawayRow';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { absoluteUrl, schemaImageUrl } from '@/lib/site-url';
import { truncateMetaDescription } from '@/lib/utils/text';
import { TalentLiveWidget } from '@/features/giveaways/components/TalentLiveWidget';
import { generateEventSchema } from '@/lib/schema';
import { Cs2LabCard } from '@/components/cs2-lab/Cs2LabCard';
import { TalentSeoSection, generateTalentFaqs } from '@/features/giveaways/components/TalentSeoSection';
import { countryFlagEmoji, getFlagImageUrl } from '@/lib/flag-images';
import { TalentViewTracker } from '@/components/tracking/TalentViewTracker';
import type { CreatorCodeWithTalent, GiveawayWithTalent, Talent } from '@/types';

export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getTalentSlugs();
  return slugs.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const talent = await getTalentBySlug(slug);
  if (!talent) return {};
  const roleLabel = talent.role.charAt(0).toUpperCase() + talent.role.slice(1).toLowerCase();
  // seoTitle / seoDescription solo se usan si el contenido está aprobado o viene de edición manual
  const seoApproved = talent.seoBioStatus === 'approved' || !!talent.seoBioManual?.trim();
  const title = (seoApproved && talent.seoTitle?.trim())
    || `${talent.name} — ${roleLabel} de ${talent.game} | SocialPro`;
  const metaSocial = talent.socials.find((s) => s.platform === talent.platform) ?? talent.socials[0];
  const metaFollowers = metaSocial?.followersDisplay && metaSocial.followersDisplay !== '-'
    ? metaSocial.followersDisplay : null;
  const platformLabel = talent.platform === 'twitch' ? 'Twitch' : 'YouTube';
  const descFallback = `${talent.name} — ${talent.role.toLowerCase()} de ${talent.game}${talent.creatorCountry ? `, ${talent.creatorCountry}` : ''}${metaFollowers ? `, ${metaFollowers} seguidores en ${platformLabel}` : ''}. Gestionado por SocialPro.`;
  const description = (seoApproved && talent.seoDescription?.trim())
    || truncateMetaDescription(talent.bio || undefined)
    || descFallback;
  const ogAlt = `${talent.name} — ${talent.role.toLowerCase()} de ${talent.game} en ${platformLabel}${talent.creatorCountry ? `, ${talent.creatorCountry}` : ''} | SocialPro`;
  return {
    title,
    description,
    alternates: { canonical: `/talentos/${slug}` },
    robots: talent.isPublished === false ? { index: false, follow: true } : undefined,
    openGraph: {
      title, description,
      url: absoluteUrl(`/talentos/${slug}`),
      type: 'profile',
      images: [{ url: absoluteUrl(`/api/og-image/talent-img?slug=${slug}`), width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: 'summary_large_image', title, description,
      images: [absoluteUrl(`/api/og-image/talent-img?slug=${slug}`)],
    },
  };
}

function toTalentBase(t: Talent & Record<string, unknown>): Talent {
  return {
    id: t.id, slug: t.slug, name: t.name, role: t.role, role2: t.role2 ?? null, game: t.game,
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
    featuredLive: t.featuredLive, excludeFromLive: t.excludeFromLive, featuredFallback: t.featuredFallback,
    bioLong: t.bioLong, highlights: t.highlights,
    seoBioGenerated: t.seoBioGenerated, seoBioManual: t.seoBioManual,
    seoBioStatus: t.seoBioStatus, seoTitle: t.seoTitle,
    seoDescription: t.seoDescription, seoKeywords: t.seoKeywords,
    isPublished: t.isPublished, showInRoster: t.showInRoster,
  };
}

function PlatformIcon({ platform }: { platform: string }): React.ReactElement {
  const cls = 'w-3 h-3 shrink-0';
  if (platform === 'twitch')    return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>;
  if (platform === 'youtube')   return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>;
  if (platform === 'instagram') return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>;
  if (platform === 'tiktok')    return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>;
  if (platform === 'kick')      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3zm9.75 4.5H9v9h3.75v-3l2.25 3H18l-3-4.5L18 7.5h-3l-2.25 3z"/></svg>;
  return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 6v6l4 2"/></svg>;
}

export default async function TalentPage({ params }: PageProps) {
  const { slug } = await params;
  const talent = await getTalentBySlug(slug);
  if (!talent) notFound();

  const [codes, active, finished, winners] = await Promise.all([
    getCodesByTalent(talent.id),
    getActiveGiveaways(talent.id),
    getFinishedGiveaways(talent.id),
    getWinnersByTalent(talent.id, 5),
  ]);

  // No hacer notFound aunque no haya contenido — mostramos el perfil igualmente

  const base                                        = toTalentBase(talent);
  const codesWithTalent: CreatorCodeWithTalent[]    = codes.map((c) => ({ ...c, talent: base }));
  const activeWithTalent: GiveawayWithTalent[]      = active.map((g) => ({ ...g, talent: base }));
  const finishedWithTalent: GiveawayWithTalent[]    = finished.map((g) => ({ ...g, talent: base }));
  const heroCode       = codesWithTalent.find((c) => c.isFeatured) ?? null;
  const secondaryCodes = heroCode ? codesWithTalent.filter((c) => c.id !== heroCode.id) : codesWithTalent;
  const featuredGiveaway = activeWithTalent[0] ?? null;
  const restGiveaways    = activeWithTalent.slice(1);
  const mainSocial       = talent.socials.find((s) => s.platform === talent.platform) ?? talent.socials[0];
  const heroPlatform     = talent.platform === 'twitch' ? 'Twitch' : 'YouTube';
  const photoAltParts    = [talent.name, `streamer de ${heroPlatform}`];
  if (talent.creatorCountry) photoAltParts.push(talent.creatorCountry);
  if (mainSocial?.followersDisplay && mainSocial.followersDisplay !== '-') photoAltParts.push(`${mainSocial.followersDisplay} seguidores`);
  const photoAlt         = photoAltParts.join(', ');
  const bioSnippet       = talent.bio?.trim()
    ? talent.bio.trim().slice(0, 120) + (talent.bio.trim().length > 120 ? '…' : '')
    : null;
  const tags = talent.tags.slice(0, 4);
  const talentFlagUrl = talent.creatorCountry ? getFlagImageUrl(talent.creatorCountry) : null;
  const isCs2Talent =
    /cs[: ]?2|counter[- ]?strike/i.test(talent.game) ||
    talent.tags.some((t) => /cs[: ]?2|counter[- ]?strike/i.test(t.tag));

  const parseFollowers = (d: string): number => {
    const c = d.trim();
    if (/[Mm]$/i.test(c)) return Math.round(parseFloat(c) * 1_000_000);
    if (/[Kk]$/i.test(c)) return Math.round(parseFloat(c) * 1_000);
    return parseInt(c.replace(/[.,\s]/g, ''), 10) || 0;
  };

  const personSchema = {
    '@type': 'Person',
    '@id': absoluteUrl(`/talentos/${slug}`),
    name: talent.name,
    jobTitle: talent.role,
    url: absoluteUrl(`/talentos/${slug}`),
    ...(talent.bio || talent.bioLong ? { description: (talent.bio ?? talent.bioLong ?? '').trim().slice(0, 500) } : {}),
    ...(schemaImageUrl(talent.photoUrl) ? { image: schemaImageUrl(talent.photoUrl) } : {}),
    ...(talent.tags.length > 0 ? { knowsAbout: talent.tags.map((t) => t.tag) } : {}),
    ...((() => {
      const stats = talent.socials
        .filter((s) => s.followersDisplay && s.followersDisplay !== '-')
        .map((s) => ({ '@type': 'InteractionCounter', interactionType: 'https://schema.org/FollowAction', userInteractionCount: parseFollowers(s.followersDisplay), name: s.platform }));
      return stats.length > 0 ? { interactionStatistic: stats } : {};
    })()),
    worksFor: { '@type': 'Organization', '@id': absoluteUrl('/#organization') },
    sameAs: talent.socials.filter((s) => s.profileUrl).map((s) => s.profileUrl),
  };

  // FAQPage schema — generado dinámicamente desde datos del talento
  const talentFaqs = generateTalentFaqs({
    name: talent.name, role: talent.role, game: talent.game, platform: talent.platform,
    bioLong: talent.bioLong, tags: talent.tags, socials: talent.socials,
    topGeos: talent.topGeos as { country: string; pct: number }[] | null,
    audienceLanguage: talent.audienceLanguage, creatorCountry: talent.creatorCountry,
  });
  const faqPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: talentFaqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  // ProfilePage wrapper — provides better entity understanding for Googlebot
  const profilePageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': absoluteUrl(`/talentos/${slug}#profilepage`),
    url: absoluteUrl(`/talentos/${slug}`),
    name: `${talent.name} — ${[talent.role, talent.game].filter(Boolean).join(' · ')} | SocialPro`,
    inLanguage: 'es',
    dateModified: talent.updatedAt.toISOString(),
    isPartOf: { '@type': 'WebSite', '@id': absoluteUrl('/#website') },
    mainEntity: personSchema,
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Talentos', url: absoluteUrl('/talentos') },
    { name: talent.name, url: absoluteUrl(`/talentos/${slug}`) },
  ]);

  return (
    <div className="min-h-screen relative overflow-x-hidden"
      style={{ background: `radial-gradient(ellipse 80% 35% at 50% 0%, ${talent.gradientC1}0d 0%, transparent 45%)` }}>
      <TalentViewTracker talentId={talent.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(profilePageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      {activeWithTalent.map((g) => (
        <script key={g.id} type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(generateEventSchema(g, absoluteUrl(''))) }}
        />
      ))}

      {/* Laterales ambientales */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-1/4 w-72 h-72 rounded-full blur-[80px] opacity-[0.07]" style={{ background: talent.gradientC1 }} />
        <div className="absolute -left-20 bottom-1/3 w-48 h-48 rounded-full blur-[60px] opacity-[0.04]" style={{ background: talent.gradientC2 }} />
        <div className="absolute -right-32 top-1/3 w-72 h-72 rounded-full blur-[80px] opacity-[0.07]" style={{ background: talent.gradientC2 }} />
        <div className="absolute -right-20 top-2/3 w-56 h-56 rounded-full blur-[70px] opacity-[0.04]" style={{ background: talent.gradientC1 }} />
      </div>

      <header className="sticky top-0 z-50 bg-sp-black/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/giveaways" className="flex items-center gap-2 group">
            <span className="text-white/40 group-hover:text-white/80 transition-colors text-[11px] font-bold uppercase tracking-[0.15em]">← SocialPro Códigos</span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Perfil de creador</span>
        </div>
      </header>

      {/* Hero premium */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute inset-0" style={{ background: `radial-gradient(70% 100% at 25% 0%, ${talent.gradientC1}38 0%, transparent 55%), radial-gradient(50% 80% at 75% 100%, ${talent.gradientC2}20 0%, transparent 55%)` }} />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: '28px 28px' }} />
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${talent.gradientC1}80, ${talent.gradientC2}60, transparent)` }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">

            {/* Identidad */}
            <div className="flex items-start gap-5 sm:gap-6 flex-1 min-w-0">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="absolute -inset-3 rounded-2xl opacity-30 blur-xl" style={{ background: `linear-gradient(135deg, ${talent.gradientC1}, ${talent.gradientC2})` }} aria-hidden />
                <div className="absolute -inset-[2.5px] rounded-2xl" style={{ background: `linear-gradient(135deg, ${talent.gradientC1}, ${talent.gradientC2}, ${talent.gradientC1})` }} aria-hidden />
                <div className="relative w-[88px] h-[88px] sm:w-[108px] sm:h-[108px] rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
                  style={{ background: `linear-gradient(135deg, ${talent.gradientC1}, ${talent.gradientC2})` }}>
                  {talent.photoUrl
                    ? <Image src={talent.photoUrl} alt={photoAlt} fill sizes="108px" className="object-cover" priority />
                    : <div className="w-full h-full flex items-center justify-center font-display text-3xl font-black text-white/90">{talent.initials}</div>
                  }
                  <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]" aria-hidden />
                </div>
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="font-display text-2xl sm:text-[2rem] font-black uppercase tracking-tight text-white leading-none">{talent.name}</h1>
                  {talent.creatorCountry && (
                    <span aria-label={`País: ${talent.creatorCountry}`}>
                      {talentFlagUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={talentFlagUrl}
                          alt={talent.creatorCountry}
                          title={talent.creatorCountry}
                          className="w-5 h-5 rounded-sm object-cover drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] inline-block"
                        />
                      ) : (
                        <span
                          className="text-xl leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                          title={talent.creatorCountry}
                        >
                          {countryFlagEmoji(talent.creatorCountry)}
                        </span>
                      )}
                    </span>
                  )}
                  {activeWithTalent.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                      style={{ background: 'rgba(195,252,0,0.12)', border: '1px solid rgba(195,252,0,0.25)', color: '#C3FC00' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                      {activeWithTalent.length} live
                    </span>
                  )}
                  {codesWithTalent.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-bold text-white/50 tabular-nums">
                      {codesWithTalent.length} {codesWithTalent.length === 1 ? 'código' : 'códigos'}
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-2.5" style={{ color: `${talent.gradientC1}cc` }}>
                  {[talent.role, talent.role2, talent.game].filter(Boolean).join(' · ')}
                </p>

                {bioSnippet && <p className="text-[12px] text-white/40 leading-snug mb-3 max-w-sm hidden sm:block">{bioSnippet}</p>}

                <div className="flex flex-wrap gap-2 mb-3">
                  {talent.socials.map((s) => (
                    s.profileUrl ? (
                      <a key={s.id} href={s.profileUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.05] hover:border-white/25 hover:bg-white/[0.09] transition-all">
                        <span style={{ color: s.hexColor ?? 'white' }}><PlatformIcon platform={s.platform} /></span>
                        <span className="text-[11px] font-bold tabular-nums text-white/80">{s.followersDisplay}</span>
                        <span className="text-[9px] uppercase tracking-wider text-white/35">{s.platform}</span>
                      </a>
                    ) : (
                      <div key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                        <span style={{ color: s.hexColor ?? 'currentColor' }}><PlatformIcon platform={s.platform} /></span>
                        <span className="text-[11px] font-bold tabular-nums text-white/35">{s.followersDisplay}</span>
                      </div>
                    )
                  ))}
                  {mainSocial?.profileUrl && (
                    <a href={mainSocial.profileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-black uppercase tracking-wider gw-sp-btn-glow"
                      style={{ background: `linear-gradient(135deg, ${talent.gradientC1}, ${talent.gradientC2})` }}>
                      Seguir en {mainSocial.platform} →
                    </a>
                  )}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tags.map((t) => (
                      <span key={t.tag} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.07] text-[10px] font-bold uppercase tracking-wider text-white/30">
                        #{t.tag}
                      </span>
                    ))}
                  </div>
                )}

              </div>
            </div>

            {/* Preview rewards desktop */}
            {(codesWithTalent.length > 0 || activeWithTalent.length > 0) && (
              <div className="hidden lg:flex flex-col gap-2 w-[200px] shrink-0">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mb-1">Recompensas activas</p>
                {activeWithTalent.length > 0 && (
                  <a href="#sorteos" className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#C3FC00]/15 bg-[#C3FC00]/[0.06] hover:bg-[#C3FC00]/[0.10] transition-colors">
                    <span className="w-2 h-2 rounded-full bg-[#C3FC00] animate-pulse shrink-0" aria-hidden />
                    <span className="text-[11px] font-black text-[#C3FC00]">{activeWithTalent.length} sorteo{activeWithTalent.length > 1 ? 's' : ''} live</span>
                  </a>
                )}
                {codesWithTalent.slice(0, 4).map((c) => {
                  const inner = (
                    <>
                      {c.brandLogo ? (
                        <Image src={c.brandLogo} alt={c.brandName} width={24} height={16} className="object-contain max-h-4 max-w-[24px]" />
                      ) : (
                        <div className="w-6 h-4 rounded flex items-center justify-center text-[7px] font-black text-white/40 bg-white/[0.04]">
                          {c.brandName.slice(0, 3).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-white/60 truncate">{c.brandName}</p>
                        {c.description && <p className="text-[9px] text-white/30 truncate leading-tight">{c.description.slice(0, 22)}</p>}
                      </div>
                      {c.isFeatured && <span className="text-[8px] text-sp-orange/70 shrink-0">★</span>}
                    </>
                  );
                  const baseCls = `flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors ${c.isFeatured ? 'border-white/15 bg-white/[0.06]' : 'border-white/[0.06] bg-white/[0.02]'}`;
                  return c.ctaUrl ? (
                    <a key={c.id} href={c.ctaUrl} target="_blank" rel="noopener noreferrer"
                      className={`${baseCls} hover:bg-white/[0.10]`}>
                      {inner}
                    </a>
                  ) : (
                    <div key={c.id} className={`${baseCls} opacity-40 cursor-not-allowed`} title="URL no disponible">
                      {inner}
                    </div>
                  );
                })}
                {codesWithTalent.length > 4 && (
                  <p className="text-[9px] text-white/20 font-bold uppercase tracking-wider text-center">+{codesWithTalent.length - 4} más</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${talent.gradientC1}40, ${talent.gradientC2}30, transparent)` }} aria-hidden />
      </section>

      {/* ── Franja CTA colaboración ── */}
      <div className="relative z-10 border-y border-white/[0.06]"
        style={{ background: `linear-gradient(90deg, ${talent.gradientC1}18 0%, transparent 40%, ${talent.gradientC2}12 100%)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black text-white text-[14px] sm:text-[15px]">
              ¿Quieres hacer una campaña con <span style={{ color: talent.gradientC1 }}>{talent.name}</span>?
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">SocialPro gestiona la colaboración de principio a fin.</p>
          </div>
          <a
            href={`/contacto?type=brand&talent=${encodeURIComponent(talent.name)}`}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-[12px] uppercase tracking-[0.12em] text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-[1.03] hover:shadow-[0_4px_28px_rgba(0,0,0,0.4)] transition-all duration-200"
            style={{ background: `linear-gradient(135deg, ${talent.gradientC1}, ${talent.gradientC2})` }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Trabajar con {talent.name} →
          </a>
        </div>
      </div>

      {/* Layout principal */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Strip LIVE — mobile only, solo si está en directo */}
        <div className="lg:hidden">
          <TalentLiveWidget
            slug={slug}
            talentName={talent.name}
            talentPhotoUrl={talent.photoUrl}
            gradientC1={talent.gradientC1}
            gradientC2={talent.gradientC2}
            variant="strip"
          />
        </div>

        <div className="flex gap-8 items-start">

          {/* Contenido principal */}
          <div className="flex-1 min-w-0 space-y-10">

          {codesWithTalent.length > 0 && (
              <section className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                  Códigos de {talent.name} · {codesWithTalent.length} activos
                </p>
                {heroCode && <HeroSponsorCard code={heroCode} />}
                {secondaryCodes.length > 0 && (
                  <CodesExpandable codes={secondaryCodes} label={heroCode ? 'Más códigos' : `Códigos de ${talent.name}`} />
                )}
              </section>
            )}

            {activeWithTalent.length > 0 && (
              <section id="sorteos" className="space-y-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Sorteos activos</p>
                    <span className="flex items-center gap-1 text-[9px] font-black text-[#C3FC00]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                      {activeWithTalent.length} live
                    </span>
                  </div>
                  <Link
                    href={`/sorteos?creator=${talent.slug}`}
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/35 hover:text-sp-orange transition-colors"
                    aria-label={`Ver todos los sorteos de ${talent.name}`}
                  >
                    Ver todos en sorteos
                    <span aria-hidden>→</span>
                  </Link>
                </div>
                {featuredGiveaway && <GiveawayFeatured giveaway={featuredGiveaway} />}
                {restGiveaways.length > 0 && (
                  <div className="space-y-2">
                    {restGiveaways.map((g) => <GiveawayRow key={g.id} giveaway={g} />)}
                  </div>
                )}
              </section>
            )}

            {/* Últimos ganadores */}
            {winners.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                    Últimos ganadores con {talent.name}
                  </p>
                  <Link href="/ganadores" className="text-[9px] font-bold text-white/25 hover:text-white/50 uppercase tracking-wider transition-colors">
                    Ver todos →
                  </Link>
                </div>
                <WinnersList winners={winners} variant="compact" />
              </section>
            )}

          {/* Estado vacío si no hay códigos ni sorteos */}
            {codesWithTalent.length === 0 && activeWithTalent.length === 0 && finishedWithTalent.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <p className="text-sm font-bold text-white/30 uppercase tracking-wider">Próximamente</p>
                <p className="text-xs text-white/20 mt-1">No hay códigos ni sorteos activos de momento</p>
                <a
                  href={`/contacto?type=brand&talent=${encodeURIComponent(talent.name)}`}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white/60 border border-white/10 hover:border-white/25 hover:text-white transition-all"
                >
                  Contactar para colaborar →
                </a>
              </div>
            )}

          {/* Finalizados en mobile */}
            {finishedWithTalent.length > 0 && (
              <details className="lg:hidden group border-t border-white/[0.06] pt-6">
                <summary className="cursor-pointer list-none flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Finalizados · {finishedWithTalent.length}</p>
                  <span className="text-[10px] font-bold text-white/20 group-open:hidden">Mostrar ▸</span>
                  <span className="text-[10px] font-bold text-white/20 hidden group-open:inline">Ocultar ▴</span>
                </summary>
                <div className="space-y-2">
                  {finishedWithTalent.map((g) => <GiveawayRow key={g.id} giveaway={g} finished />)}
                </div>
              </details>
            )}
          </div>

          {/* Sidebar desktop */}
          <aside className="hidden lg:flex flex-col gap-4 w-[220px] xl:w-[240px] shrink-0">
            <div className="sticky top-20 flex flex-col gap-4">

              {/* Widget LIVE */}
              <TalentLiveWidget
                slug={slug}
                talentName={talent.name}
                talentPhotoUrl={talent.photoUrl}
                gradientC1={talent.gradientC1}
                gradientC2={talent.gradientC2}
                variant="sidebar"
              />

              {/* Historial */}
              {finishedWithTalent.length > 0 && (
              <div>
                <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mb-3">
                  Historial · {finishedWithTalent.length}
                </h2>
                <div className="space-y-1.5">
                  {finishedWithTalent.slice(0, 8).map((g) => (
                    <a key={g.id} href={g.redirectUrl} target="_blank" rel="noopener noreferrer"
                      className="group/item flex items-center gap-2.5 p-2 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all">
                      <div className="relative w-8 h-8 shrink-0 rounded bg-white/[0.03]">
                        {g.imageUrl
                          // eslint-disable-next-line @next/next/no-img-element -- 32px thumbnail de logo externo; Image requeriría allowlist dinámica de dominios
                          ? <img src={g.imageUrl} alt={g.title} className="w-full h-full object-contain p-0.5 opacity-50 group-hover/item:opacity-80 transition-opacity" />
                          : <div className="w-full h-full flex items-center justify-center text-white/15 text-[8px] font-black">?</div>
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-wider text-white/20 truncate">{g.brandName}</p>
                        <p className="text-[10px] font-semibold text-white/40 truncate leading-tight">{g.title}</p>
                      </div>
                    </a>
                  ))}
                  {finishedWithTalent.length > 8 && (
                    <p className="text-[9px] text-white/15 text-center pt-1 font-bold uppercase tracking-wider">+{finishedWithTalent.length - 8} más</p>
                  )}
                </div>
              </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ── Sección SEO — audiencia, bio extendida, FAQ, enlazado interno ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <TalentSeoSection talent={{
          name:             talent.name,
          role:             talent.role,
          game:             talent.game,
          platform:         talent.platform,
          seoBioManual:     talent.seoBioManual,
          seoBioGenerated:  talent.seoBioGenerated,
          seoBioStatus:     talent.seoBioStatus,
          bioLong:          talent.bioLong,
          highlights:       talent.highlights,
          tags:             talent.tags,
          socials:          talent.socials,
          topGeos:          talent.topGeos as { country: string; pct: number }[] | null,
          audienceLanguage: talent.audienceLanguage,
          creatorCountry:   talent.creatorCountry,
        }} />
      </div>

      {isCs2Talent ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <Cs2LabCard variant="compact" ctaId="talent_profile_cs2_lab" />
        </div>
      ) : null}

      <div className="border-t border-white/[0.04] py-6 text-center">
        <Link href="/giveaways" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/20 hover:text-white/50 font-bold transition-colors">
          ← Ver todos los creadores en SocialPro
        </Link>
      </div>
    </div>
  );
}
