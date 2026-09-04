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
import { TalentGiveawaysContent } from '@/features/giveaways/components/TalentGiveawaysContent';
import { TalentProfileIcon } from '@/features/giveaways/components/TalentProfileIcon';
import { absoluteUrl } from '@/lib/site-url';
import { buildTalentImageAlt, buildTalentMetaDescription, buildTalentSearchTitle } from '@/lib/talentSeo';
import { TalentLiveWidget } from '@/features/giveaways/components/TalentLiveWidget';
import { generateEventSchema } from '@/lib/schema';
import { Cs2LabCard } from '@/components/cs2-lab/Cs2LabCard';
import { TalentSeoSection } from '@/features/giveaways/components/TalentSeoSection';
import { countryFlagEmoji, getFlagImageUrl } from '@/lib/flag-images';
import { getCountryLabel } from '@/lib/countries';
import { TalentViewTracker } from '@/components/tracking/TalentViewTracker';
import { getExternalGiveawaysForCreator } from '@/lib/queries/externalGiveaways';
import { buildTalentStructuredData, toTalentBase } from '@/features/giveaways/talent-profile-data';
import type { CreatorCodeWithTalent, GiveawayWithTalent } from '@/types';

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
  const title = buildTalentSearchTitle(talent);
  const description = buildTalentMetaDescription(talent);
  const ogAlt = buildTalentImageAlt(talent);
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

export default async function TalentPage({ params }: PageProps) {
  const { slug } = await params;
  const talent = await getTalentBySlug(slug);
  if (!talent) notFound();

  const [codes, active, finished, winners, externalSections] = await Promise.all([
    getCodesByTalent(talent.id),
    getActiveGiveaways(talent.id),
    getFinishedGiveaways(talent.id),
    getWinnersByTalent(talent.id, 5),
    getExternalGiveawaysForCreator(talent.slug),
  ]);

  // No hacer notFound aunque no haya contenido — mostramos el perfil igualmente

  const base                                        = toTalentBase(talent);
  const codesWithTalent: CreatorCodeWithTalent[]    = codes.map((c) => ({ ...c, talent: base }));
  const activeWithTalent: GiveawayWithTalent[]      = active.map((g) => ({ ...g, talent: base }));
  const finishedWithTalent: GiveawayWithTalent[]    = finished.map((g) => ({ ...g, talent: base }));
  const heroCode       = codesWithTalent.find((c) => c.isFeatured) ?? null;
  const secondaryCodes = heroCode ? codesWithTalent.filter((c) => c.id !== heroCode.id) : codesWithTalent;
  const externalActiveCount = externalSections.status === 'ok' ? externalSections.active.length : 0;
  const activeGiveawayCount = activeWithTalent.length + externalActiveCount;
  const mainSocial       = talent.socials.find((s) => s.platform === talent.platform) ?? talent.socials[0];
  const photoAlt         = buildTalentImageAlt(talent);
  const bioSnippet       = talent.bio?.trim()
    ? talent.bio.trim().slice(0, 120) + (talent.bio.trim().length > 120 ? '…' : '')
    : null;
  const tags = talent.tags.slice(0, 4);
  const talentFlagUrl    = talent.creatorCountry ? getFlagImageUrl(talent.creatorCountry) : null;
  const talentCountryName = talent.creatorCountry
    ? (getCountryLabel(talent.creatorCountry) ?? talent.creatorCountry)
    : null;
  const isCs2Talent =
    /cs[: ]?2|counter[- ]?strike/i.test(talent.game) ||
    talent.tags.some((t) => /cs[: ]?2|counter[- ]?strike/i.test(t.tag));

  const { profilePageJsonLd, faqPageJsonLd, breadcrumbJsonLd } = buildTalentStructuredData(talent);

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
          <Link href="/talentos" className="flex items-center gap-2 group">
            <span className="text-white/40 group-hover:text-white/80 transition-colors text-[11px] font-bold uppercase tracking-[0.15em]">← Todos los creadores</span>
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
                  {talent.creatorCountry && talentCountryName && (
                    <span aria-label={`Bandera de ${talentCountryName}`}>
                      {talentFlagUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={talentFlagUrl}
                          alt={`Bandera de ${talentCountryName}`}
                          title={talentCountryName}
                          className="w-5 h-5 rounded-sm object-cover drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] inline-block"
                        />
                      ) : (
                        <span
                          className="text-xl leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                          title={talentCountryName}
                        >
                          {countryFlagEmoji(talent.creatorCountry)}
                        </span>
                      )}
                    </span>
                  )}
                  {activeGiveawayCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                      style={{ background: 'rgba(195,252,0,0.12)', border: '1px solid rgba(195,252,0,0.25)', color: '#C3FC00' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                      {activeGiveawayCount} live
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
                        <span style={{ color: s.hexColor ?? 'white' }}><TalentProfileIcon platform={s.platform} /></span>
                        <span className="text-[11px] font-bold tabular-nums text-white/80">{s.followersDisplay}</span>
                        <span className="text-[9px] uppercase tracking-wider text-white/35">{s.platform}</span>
                      </a>
                    ) : (
                      <div key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                        <span style={{ color: s.hexColor ?? 'currentColor' }}><TalentProfileIcon platform={s.platform} /></span>
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
            {(codesWithTalent.length > 0 || activeGiveawayCount > 0) && (
              <div className="hidden lg:flex flex-col gap-2 w-[200px] shrink-0">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mb-1">Recompensas activas</p>
                {activeGiveawayCount > 0 && (
                  <a href="#sorteos" className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#C3FC00]/15 bg-[#C3FC00]/[0.06] hover:bg-[#C3FC00]/[0.10] transition-colors">
                    <span className="w-2 h-2 rounded-full bg-[#C3FC00] animate-pulse shrink-0" aria-hidden />
                    <span className="text-[11px] font-black text-[#C3FC00]">{activeGiveawayCount} sorteo{activeGiveawayCount > 1 ? 's' : ''} live</span>
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
            talentImageAlt={photoAlt}
            gradientC1={talent.gradientC1}
            gradientC2={talent.gradientC2}
            variant="strip"
          />
        </div>

        <div className="flex gap-8 items-start">

          {/* Contenido principal */}
          <div className="flex-1 min-w-0 space-y-10">

          {codesWithTalent.length > 0 && (
              <section className="space-y-4" aria-labelledby="codes-heading">
                <h2 id="codes-heading" className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                  Códigos de {talent.name} · {codesWithTalent.length} activos
                </h2>
                {heroCode && <HeroSponsorCard code={heroCode} />}
                {secondaryCodes.length > 0 && (
                  <CodesExpandable codes={secondaryCodes} label={heroCode ? 'Más códigos' : `Códigos de ${talent.name}`} />
                )}
              </section>
            )}

            <TalentGiveawaysContent
              talentName={talent.name}
              talentSlug={talent.slug}
              hasCodes={codesWithTalent.length > 0}
              active={activeWithTalent}
              finished={finishedWithTalent}
              externalSections={externalSections}
            />

            {/* Últimos ganadores */}
            {winners.length > 0 && (
              <section className="space-y-4" aria-labelledby="winners-heading">
                <div className="flex items-center justify-between">
                  <h2 id="winners-heading" className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                    Últimos ganadores con {talent.name}
                  </h2>
                  <Link href="/ganadores" className="text-[9px] font-bold text-white/25 hover:text-white/50 uppercase tracking-wider transition-colors">
                    Ver todos →
                  </Link>
                </div>
                <WinnersList winners={winners} variant="compact" />
              </section>
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
                talentImageAlt={photoAlt}
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
        <Link href="/talentos" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/20 hover:text-white/50 font-bold transition-colors">
          ← Ver todos los creadores
        </Link>
      </div>
    </div>
  );
}
