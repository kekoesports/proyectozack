import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Image from 'next/image';
import Link from 'next/link';
import { getAllActiveGiveaways, getAllFinishedGiveaways, extractUniqueBrands } from '@/lib/queries/giveawaysHub';
import { getAllCodes } from '@/lib/queries/creatorCodes';
import { getAllTalents } from '@/lib/queries/talents';
import { getRecentWinners } from '@/lib/queries/giveawayWinners';
import { WinnersList } from '@/features/giveaways/components/WinnersList';
import { GiveawaysHub } from '@/features/giveaways/components/GiveawaysHub';
import { generateGiveawayListSchema, generateCodeListSchema } from '@/lib/schema';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { ResponsibleGamingFooter } from '@/components/ui/ResponsibleGamingFooter';

export const metadata: Metadata = {
  title: 'Códigos y Recompensas Gaming — SocialPro',
  description:
    'Todos los códigos activos de tus creadores favoritos de casino, apuestas y CS2. Sorteos y recompensas exclusivas.',
  alternates: { canonical: '/codigos' },
  openGraph: {
    title: 'Códigos y Sorteos Gaming — SocialPro',
    description: 'Códigos activos, sorteos en vivo y recompensas exclusivas de los mejores creadores de CS2, casino e iGaming.',
    url: absoluteUrl('/codigos'),
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'SocialPro — Códigos y Sorteos Gaming' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Códigos y Sorteos Gaming — SocialPro',
    description: 'Códigos activos, sorteos en vivo y recompensas exclusivas de los mejores creadores de CS2, casino e iGaming.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

export const revalidate = 3600;

export default async function GiveawaysPage(): Promise<React.JSX.Element> {
  const [active, finished, codes, talents, recentWinners] = await Promise.all([
    getAllActiveGiveaways(),
    getAllFinishedGiveaways(),
    getAllCodes(),
    getAllTalents(),
    getRecentWinners(6),
  ]);

  const allGiveaways = [...active, ...finished];
  const brands = extractUniqueBrands(allGiveaways, codes);

  const codeCountMap = new Map<number, number>();
  for (const c of codes) {
    codeCountMap.set(c.talentId, (codeCountMap.get(c.talentId) ?? 0) + 1);
  }
  const giveawayCountMap = new Map<number, number>();
  for (const g of allGiveaways) {
    giveawayCountMap.set(g.talentId, (giveawayCountMap.get(g.talentId) ?? 0) + 1);
  }
  const creatorIds = new Set([...codeCountMap.keys(), ...giveawayCountMap.keys()]);
  const creators = talents
    .filter((t) => creatorIds.has(t.id))
    .map((t) => ({
      ...t,
      codeCount: codeCountMap.get(t.id) ?? 0,
      giveawayCount: giveawayCountMap.get(t.id) ?? 0,
    }));

  const eventListSchema = active.length > 0
    ? generateGiveawayListSchema(active, SITE_URL, 'Sorteos activos en SocialPro')
    : null;
  const offerListSchema = codes.length > 0
    ? generateCodeListSchema(codes, SITE_URL, 'Códigos activos en SocialPro')
    : null;

  return (
    <>
      {eventListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(eventListSchema) }} />
      )}
      {offerListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(offerListSchema) }} />
      )}
      <h1 className="sr-only">Códigos y Recompensas Gaming — SocialPro</h1>

      {/* Live ticker */}
      {active.length > 0 && (
        <div className="bg-sp-grad overflow-hidden">
          <div className="gw-sp-ticker-track whitespace-nowrap">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="inline-flex items-center gap-6 px-6">
                {active.map((g) => (
                  <a
                    key={`${i}-${g.id}`}
                    href={g.redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/90 hover:text-white transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                    {g.title}{g.value ? ` — ${g.value}` : ''}
                  </a>
                ))}
                <span className="text-[11px] font-black uppercase tracking-wider text-white/50">
                  LIVE GIVEAWAYS
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#09090f]/92 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logos/2.png"
              alt="SocialPro"
              width={120}
              height={32}
              className="h-7 w-auto object-contain brightness-0 invert"
              priority
            />
            <span className="text-white/15">|</span>
            <span className="font-display text-sm font-bold uppercase tracking-[0.15em] text-white/40">
              Sorteos & Códigos
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 hidden sm:inline">
              {codes.length} códigos · {creators.length} creadores
            </span>
            {active.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sp-orange animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sp-orange/70">
                  {active.length} en vivo
                </span>
              </div>
            )}
            <Link
              href="/sorteos"
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-sp-orange/80 transition-colors border border-white/[0.06] hover:border-sp-orange/30 rounded-full px-3 py-1"
            >
              🎁 Sorteos
            </Link>
          </div>
        </div>
      </header>

      {/* SocialPro brand ticker — sticky debajo del header, siempre visible */}
      <div className="sticky top-14 z-40 overflow-hidden bg-[#09090f]/80 backdrop-blur-sm border-b border-white/[0.03]">
        <div className="gw-sp-ticker-track whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="inline-flex items-center gap-5 px-6 py-2">
              <span className="text-[9px] font-black uppercase tracking-[0.45em] text-white/22">SOCIALPRO</span>
              <span className="text-sp-orange/25 text-[8px]" aria-hidden>◆</span>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/16">SORTEOS</span>
              <span className="text-sp-orange/20 text-[8px]" aria-hidden>◆</span>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/16">CÓDIGOS</span>
              <span className="text-sp-orange/20 text-[8px]" aria-hidden>◆</span>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/16">RECOMPENSAS GAMING</span>
              <span className="text-sp-orange/25 text-[8px]" aria-hidden>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main hub — codes visible immediately */}
      <GiveawaysHub
        active={active}
        finished={finished}
        codes={codes}
        creators={creators}
        brands={brands}
      />

      {/* Widget últimos ganadores */}
      {recentWinners.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-12 border-t border-white/[0.04]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-black uppercase text-white tracking-tight">
              Últimos ganadores
            </h2>
            <Link href="/ganadores" className="text-[10px] font-bold text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors">
              Ver todos →
            </Link>
          </div>
          <WinnersList winners={recentWinners} variant="compact" />
        </section>
      )}

      {/* Footer */}
      {/* Spacer for mobile sticky CTA */}
      <div className="h-16 lg:hidden" aria-hidden />
      <div className="border-t border-white/[0.04] py-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/15 font-bold">
          Powered by SocialPro
        </p>
      </div>
      <ResponsibleGamingFooter />

      {/* ── Sticky CTA — mobile only ──────────────────────────────────────── */}
      {/* Desktop has the giveaways sidebar; on mobile it's hidden. This bar
          surfaces the key action at thumb reach. */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="bg-[#09090f]/96 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3 flex items-center gap-3">
          {active.length > 0 ? (
            <>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-sp-orange animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-sp-orange/80">
                  {active.length === 1 ? '1 sorteo' : `${active.length} sorteos`}
                </span>
              </div>
              <Link
                href="/sorteos"
                className="flex-1 text-center py-2.5 rounded-xl font-black text-sm uppercase tracking-wide text-white"
                style={{ background: 'linear-gradient(90deg,#f5632a,#8b3aad)' }}
              >
                Ver sorteos en vivo →
              </Link>
            </>
          ) : (
            <a
              href="#codigos"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white/50 border border-white/[0.07] hover:text-white/70 transition-colors"
            >
              <span className="text-sp-orange/60">◆</span>
              {codes.length} código{codes.length !== 1 ? 's' : ''} disponible{codes.length !== 1 ? 's' : ''}
            </a>
          )}
        </div>
      </div>
    </>
  );
}
