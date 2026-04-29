import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getTalentSlugs, getTalentBySlug } from '@/lib/queries/talents';
import { getActiveGiveaways, getFinishedGiveaways } from '@/lib/queries/giveaways';
import { getCodesByTalent } from '@/lib/queries/creatorCodes';
import { CodeCard } from '@/features/giveaways/components/CodeCard';
import { GiveawayCarousel } from '@/features/giveaways/components/GiveawayCarousel';
import { GiveawayHubCard } from '@/features/giveaways/components/GiveawayHubCard';
import { absoluteUrl } from '@/lib/site-url';
import type { CreatorCodeWithTalent, GiveawayWithTalent, Talent } from '@/types';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await getTalentSlugs();
  return slugs.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const talent = await getTalentBySlug(slug);
  if (!talent) return {};

  const title = `${talent.name} — Códigos y sorteos | SocialPro`;
  const description = `Todos los códigos de descuento y sorteos activos de ${talent.name}. Entra y participa.`;
  const ogImage = talent.photoUrl;

  return {
    title,
    description,
    alternates: { canonical: `/c/${slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/c/${slug}`),
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

function toTalentBase(t: Talent): Talent {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    role: t.role,
    game: t.game,
    platform: t.platform,
    status: t.status,
    bio: t.bio,
    gradientC1: t.gradientC1,
    gradientC2: t.gradientC2,
    initials: t.initials,
    photoUrl: t.photoUrl,
    sortOrder: t.sortOrder,
    visibility: t.visibility,
    topGeos: t.topGeos,
    audienceLanguage: t.audienceLanguage,
    creatorCountry: t.creatorCountry,
    audienceStatus: t.audienceStatus,
    lastStatsUpdateAt: t.lastStatsUpdateAt,
    updatedAt: t.updatedAt,
    // Compliance & fiscal fields (admin-only, not exposed publicly)
    cnmcStatus: t.cnmcStatus,
    cnmcRegisteredAt: t.cnmcRegisteredAt,
    cnmcNotes: t.cnmcNotes,
    hasRcInsurance: t.hasRcInsurance,
    taxType: t.taxType,
    nif: t.nif,
    fiscalName: t.fiscalName,
    fiscalAddress: t.fiscalAddress,
  };
}

export default async function CreatorHubPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const talent = await getTalentBySlug(slug);
  if (!talent) notFound();

  const [codes, active, finished] = await Promise.all([
    getCodesByTalent(talent.id),
    getActiveGiveaways(talent.id),
    getFinishedGiveaways(talent.id),
  ]);

  if (codes.length === 0 && active.length === 0 && finished.length === 0) {
    notFound();
  }

  const base = toTalentBase(talent as unknown as Talent);
  const codesWithTalent: CreatorCodeWithTalent[] = codes.map((c) => ({ ...c, talent: base }));
  const activeWithTalent: GiveawayWithTalent[] = active.map((g) => ({ ...g, talent: base }));
  const finishedWithTalent: GiveawayWithTalent[] = finished.map((g) => ({ ...g, talent: base }));

  const mainSocial = talent.socials.find((s) => s.platform === talent.platform) ?? talent.socials[0];
  const totalFollowersLine = talent.socials
    .map((s) => `${s.followersDisplay} ${s.platform}`)
    .join(' · ');

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-sp-black/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/giveaways" className="flex items-center gap-3 group">
            <span className="text-white/40 group-hover:text-white/80 transition-colors text-xs font-bold uppercase tracking-[0.15em]">
              ← SocialPro
            </span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            Perfil de creador
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.04]">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(60% 50% at 50% 0%, ${talent.gradientC1}33 0%, transparent 70%)`,
          }}
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center gap-8">
          <div
            className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shrink-0 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
            style={{ background: `linear-gradient(135deg, ${talent.gradientC1}, ${talent.gradientC2})` }}
          >
            {talent.photoUrl ? (
              <Image
                src={talent.photoUrl}
                alt={talent.name}
                fill
                sizes="(max-width: 640px) 128px, 160px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white/90">
                {talent.initials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-sp-orange mb-2">
              {talent.role}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-black uppercase tracking-[0.02em] text-white leading-none">
              {talent.name}
            </h1>
            {totalFollowersLine && (
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.15em] text-white/50">
                {totalFollowersLine}
              </p>
            )}
            {mainSocial?.profileUrl && (
              <div className="mt-5 flex justify-center sm:justify-start">
                <a
                  href={mainSocial.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sp-grad text-white text-[11px] font-black uppercase tracking-[0.15em] gw-sp-btn-glow"
                >
                  Seguir en {mainSocial.platform}
                  <span aria-hidden>→</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
        {/* Codes — núcleo */}
        {codesWithTalent.length > 0 && (
          <section className="mb-12">
            <div className="mb-4">
              <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white/80 gw-section-title">
                Códigos de {talent.name}
              </h2>
              <p className="text-[11px] text-white/30 mt-1">
                {codesWithTalent.length} {codesWithTalent.length === 1 ? 'código' : 'códigos'} activos
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {codesWithTalent.map((c) => (
                <CodeCard key={c.id} code={c} />
              ))}
            </div>
          </section>
        )}

        {/* Active giveaways */}
        <GiveawayCarousel
          giveaways={activeWithTalent}
          title="Sorteos activos"
          subtitle={`${activeWithTalent.length} en directo`}
        />

        {/* Finished */}
        {finishedWithTalent.length > 0 && (
          <details className="group border-t border-white/[0.06] pt-6">
            <summary className="cursor-pointer flex items-center justify-between list-none">
              <div>
                <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white/50 gw-section-title">
                  Sorteos finalizados
                </h2>
                <p className="text-[11px] text-white/25 mt-1">
                  {finishedWithTalent.length} {finishedWithTalent.length === 1 ? 'sorteo terminado' : 'sorteos terminados'}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 group-open:hidden">
                Mostrar
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 hidden group-open:inline">
                Ocultar
              </span>
            </summary>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {finishedWithTalent.map((g) => (
                <GiveawayHubCard key={g.id} giveaway={g} />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.04] py-6 text-center">
        <Link
          href="/giveaways"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/25 hover:text-white/60 font-bold transition-colors"
        >
          ← Ver todos los creadores en SocialPro
        </Link>
      </div>
    </>
  );
}
