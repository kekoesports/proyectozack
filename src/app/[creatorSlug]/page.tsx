import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getTalentSlugs, getTalentBySlug } from '@/lib/queries/talents';
import { getActiveGiveaways, getFinishedGiveaways } from '@/lib/queries/giveaways';
import { getCodesByTalent } from '@/lib/queries/creatorCodes';
import { HeroSponsorCard } from '@/features/giveaways/components/HeroSponsorCard';
import { CodeRowMini } from '@/features/giveaways/components/CodeRowMini';
import { GiveawayRow } from '@/features/giveaways/components/GiveawayRow';
import { absoluteUrl } from '@/lib/site-url';
import type { CreatorCodeWithTalent, GiveawayWithTalent, Talent } from '@/types';

export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ creatorSlug: string }>;
};

export async function generateStaticParams(): Promise<Array<{ creatorSlug: string }>> {
  const slugs = await getTalentSlugs();
  return slugs.map((t) => ({ creatorSlug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { creatorSlug } = await params;
  const talent = await getTalentBySlug(creatorSlug);
  if (!talent) return {};

  const title = `${talent.name} — Códigos y sorteos | SocialPro`;
  const description = `Todos los códigos de descuento y sorteos activos de ${talent.name}. Entra y participa.`;

  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: `/talentos/${creatorSlug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/${creatorSlug}`),
      images: talent.photoUrl ? [{ url: talent.photoUrl }] : undefined,
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
    featuredLive: t.featuredLive, excludeFromLive: t.excludeFromLive, featuredFallback: t.featuredFallback,
    bioLong: t.bioLong, highlights: t.highlights,
  };
}

// Platform icon — inline SVG pequeño
function PlatformIcon({ platform }: { platform: string }): React.ReactElement {
  const cls = 'w-3 h-3 shrink-0';
  if (platform === 'twitch')    return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>;
  if (platform === 'youtube')   return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>;
  if (platform === 'instagram') return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>;
  if (platform === 'tiktok')    return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>;
  if (platform === 'kick')      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3zm9.75 4.5H9v9h3.75v-3l2.25 3H18l-3-4.5L18 7.5h-3l-2.25 3z"/></svg>;
  // Genérico
  return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 6v6l4 2"/></svg>;
}

export default async function RootCreatorPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { creatorSlug } = await params;
  const talent = await getTalentBySlug(creatorSlug);
  if (!talent) notFound();

  const [codes, active, finished] = await Promise.all([
    getCodesByTalent(talent.id),
    getActiveGiveaways(talent.id),
    getFinishedGiveaways(talent.id),
  ]);

  if (codes.length === 0 && active.length === 0 && finished.length === 0) notFound();

  const base             = toTalentBase(talent);
  const codesWithTalent: CreatorCodeWithTalent[]  = codes.map((c) => ({ ...c, talent: base }));
  const activeWithTalent: GiveawayWithTalent[]     = active.map((g) => ({ ...g, talent: base }));
  const finishedWithTalent: GiveawayWithTalent[]   = finished.map((g) => ({ ...g, talent: base }));

  const mainSocial     = talent.socials.find((s) => s.platform === talent.platform) ?? talent.socials[0];
  const bioSnippet     = talent.bio?.trim()
    ? talent.bio.trim().slice(0, 120) + (talent.bio.trim().length > 120 ? '…' : '')
    : null;
  const tags           = talent.tags.slice(0, 4);
  const heroCode       = codesWithTalent.find((c) => c.isFeatured) ?? null;
  const secondaryCodes = heroCode
    ? codesWithTalent.filter((c) => c.id !== heroCode.id)
    : codesWithTalent;

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-sp-black/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/giveaways" className="flex items-center gap-2 group">
            <span className="text-white/40 group-hover:text-white/80 transition-colors text-[11px] font-bold uppercase tracking-[0.15em]">
              ← SocialPro Códigos
            </span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Perfil de creador</span>
        </div>
      </header>

      {/* ── Hero compacto ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.04]">
        <div
          className="absolute inset-0 opacity-50"
          style={{ background: `radial-gradient(70% 60% at 30% 0%, ${talent.gradientC1}28 0%, transparent 65%)` }}
          aria-hidden
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex items-start gap-5 sm:gap-6">

          {/* Avatar */}
          <div
            className="relative w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 shadow-[0_6px_24px_rgba(0,0,0,0.5)]"
            style={{ background: `linear-gradient(135deg, ${talent.gradientC1}, ${talent.gradientC2})` }}
          >
            {talent.photoUrl ? (
              <Image
                src={talent.photoUrl}
                alt={talent.name}
                fill
                sizes="80px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-black text-white/90">
                {talent.initials}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
              <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-[0.02em] text-white leading-none">
                {talent.name}
              </h1>
              {/* Contadores inline */}
              {codesWithTalent.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-bold text-white/50 tabular-nums">
                  {codesWithTalent.length} {codesWithTalent.length === 1 ? 'código' : 'códigos'}
                </span>
              )}
              {activeWithTalent.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C3FC00]/10 border border-[#C3FC00]/20 text-[10px] font-bold text-[#C3FC00] tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                  {activeWithTalent.length} live
                </span>
              )}
            </div>

            {/* Rol + categoría */}
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sp-orange/80 mb-2">
              {[talent.role, talent.game].filter(Boolean).join(' · ')}
            </p>

            {/* Bio snippet */}
            {bioSnippet && (
              <p className="text-[12px] text-white/45 leading-snug mb-3 max-w-xl hidden sm:block">
                {bioSnippet}
              </p>
            )}

            {/* Redes sociales — pills con icono + seguidores */}
            <div className="flex flex-wrap gap-2 mb-3">
              {talent.socials.map((s) => (
                s.profileUrl ? (
                  <a
                    key={s.id}
                    href={s.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07] transition-all text-white/70 hover:text-white"
                    style={s.hexColor ? { ['--platform-color' as string]: s.hexColor } : undefined}
                  >
                    <span style={{ color: s.hexColor ?? 'white' }} className="opacity-90">
                      <PlatformIcon platform={s.platform} />
                    </span>
                    <span className="text-[11px] font-bold tabular-nums">{s.followersDisplay}</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-50">{s.platform}</span>
                  </a>
                ) : (
                  <div key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/40">
                    <span style={{ color: s.hexColor ?? 'currentColor' }} className="opacity-70">
                      <PlatformIcon platform={s.platform} />
                    </span>
                    <span className="text-[11px] font-bold tabular-nums">{s.followersDisplay}</span>
                  </div>
                )
              ))}

              {/* CTA principal */}
              {mainSocial?.profileUrl && (
                <a
                  href={mainSocial.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sp-grad text-white text-[11px] font-black uppercase tracking-wider gw-sp-btn-glow"
                >
                  Seguir en {mainSocial.platform} →
                </a>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t.tag} className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-white/35">
                    #{t.tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Contenido ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Códigos */}
        {codesWithTalent.length > 0 && (
          <section className="space-y-4">
            {heroCode && <HeroSponsorCard code={heroCode} />}
            {secondaryCodes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/35">
                    {heroCode ? `Más códigos · ${secondaryCodes.length}` : `Códigos de ${talent.name} · ${codesWithTalent.length} activos`}
                  </h2>
                </div>
                <div className="space-y-1.5">
                  {secondaryCodes.map((c) => <CodeRowMini key={c.id} code={c} />)}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Sorteos activos */}
        {activeWithTalent.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                  Sorteos activos
                  <span className="flex items-center gap-1 text-[10px] font-black text-[#C3FC00]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" aria-hidden />
                    {activeWithTalent.length} en directo
                  </span>
                </h2>
                <p className="text-[10px] text-white/25 mt-0.5">Participa antes de que termine el tiempo</p>
              </div>
            </div>
            <div className="space-y-2">
              {activeWithTalent.map((g) => (
                <GiveawayRow key={g.id} giveaway={g} />
              ))}
            </div>
          </section>
        )}

        {/* Sorteos finalizados — colapsable */}
        {finishedWithTalent.length > 0 && (
          <details className="group border-t border-white/[0.06] pt-6">
            <summary className="cursor-pointer list-none flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-white/30">
                Sorteos finalizados · {finishedWithTalent.length}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/25 group-open:hidden">Mostrar</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/25 hidden group-open:inline">Ocultar</span>
            </summary>
            <div className="space-y-2">
              {finishedWithTalent.map((g) => (
                <GiveawayRow key={g.id} giveaway={g} finished />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.04] py-6 text-center">
        <Link
          href="/giveaways"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/20 hover:text-white/50 font-bold transition-colors"
        >
          ← Ver todos los creadores en SocialPro
        </Link>
      </div>
    </>
  );
}
