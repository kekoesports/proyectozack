import type { Metadata } from 'next';
import Image from 'next/image';
import { getAllActiveGiveaways, getAllFinishedGiveaways, extractUniqueBrands } from '@/lib/queries/giveawaysHub';
import { getAllCodes, getFeaturedCodes } from '@/lib/queries/creatorCodes';
import { getTopWinners, getRecentWinners } from '@/lib/queries/giveawayWinners';
import { getAllTalents } from '@/lib/queries/talents';
import { GiveawaysHub } from '@/components/giveaways/GiveawaysHub';
import { StatsBar } from '@/components/giveaways/StatsBar';

export const metadata: Metadata = {
  title: 'Sorteos y Códigos Gaming',
  description:
    'Sorteos activos y códigos de descuento de tus streamers favoritos. Participa en giveaways gaming con SocialPro.',
  alternates: {
    canonical: '/giveaways',
  },
};

export const revalidate = 3600;

function computeTotalValue(giveaways: { value: string | null }[]): string {
  let total = 0;
  for (const g of giveaways) {
    if (!g.value) continue;
    const num = parseFloat(g.value.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(num)) total += num;
  }
  return total.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + '\u20AC';
}

export default async function GiveawaysPage() {
  const [active, finished, codes, featuredCodes, talents, topWinnersData, recentWinnersData] = await Promise.all([
    getAllActiveGiveaways(),
    getAllFinishedGiveaways(),
    getAllCodes(),
    getFeaturedCodes(),
    getAllTalents(),
    getTopWinners(),
    getRecentWinners(),
  ]);

  const allGiveaways = [...active, ...finished];
  const brands = extractUniqueBrands(allGiveaways, codes);
  const totalValue = computeTotalValue(allGiveaways);

  // Build creators list with giveaway counts
  const creatorMap = new Map<number, number>();
  for (const g of allGiveaways) {
    creatorMap.set(g.talentId, (creatorMap.get(g.talentId) ?? 0) + 1);
  }
  // Also count codes
  for (const c of codes) {
    creatorMap.set(c.talentId, (creatorMap.get(c.talentId) ?? 0));
  }

  const creators = talents
    .filter((t) => creatorMap.has(t.id))
    .map((t) => ({ ...t, giveawayCount: creatorMap.get(t.id) ?? 0 }));

  return (
    <>
      <h1 className="sr-only">Sorteos y Códigos Gaming</h1>
      {/* Ticker marquee — SP themed */}
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
                <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/60">
                  LIVE GIVEAWAYS
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-sp-black/90 backdrop-blur-xl border-b border-white/[0.04]">
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
            <span className="text-white/20">|</span>
            <span className="font-display text-sm font-bold uppercase tracking-[0.15em] text-white/50">
              Códigos & Sorteos
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              {active.length} activos
            </span>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <StatsBar activeCount={active.length} totalValue={totalValue} finishedCount={finished.length} codesCount={codes.length} />

      {/* Hub */}
      <GiveawaysHub
        active={active}
        finished={finished}
        codes={codes}
        featuredCodes={featuredCodes}
        creators={creators}
        brands={brands}
        topWinners={topWinnersData}
        recentWinners={recentWinnersData}
      />

      {/* Footer */}
      <div className="border-t border-white/[0.04] py-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/15 font-bold">
          Powered by SocialPro
        </p>
      </div>
    </>
  );
}
