import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTalentSlugs, getTalentBySlug } from '@/lib/queries/talents';
import { getActiveGiveaways, getFinishedGiveaways } from '@/lib/queries/giveaways';
import { CreatorHero } from '@/features/creator-codes/components/CreatorHero';
import { GiveawayGrid } from '@/features/creator-codes/components/GiveawayGrid';
import { absoluteUrl } from '@/lib/site-url';

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

  const title = `${talent.name} — Giveaways | SocialPro`;
  const description = `Sorteos activos de ${talent.name}`;

  const active = await getActiveGiveaways(talent.id);
  const ogImage = active[0]?.imageUrl ?? talent.photoUrl;

  return {
    title,
    description,
    alternates: { canonical: `/creadores/${slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/creadores/${slug}`),
      images: ogImage
        ? [{ url: ogImage, width: 600, height: 600 }]
        : [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : [absoluteUrl('/og-default.jpg')],
    },
  };
}

function computeTotalValue(giveaways: { value: string | null }[]): string {
  let total = 0;
  for (const g of giveaways) {
    if (!g.value) continue;
    const num = parseFloat(g.value.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(num)) total += num;
  }
  return total.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + '\u20AC';
}

export default async function CreadorPage({ params }: PageProps) {
  const { slug } = await params;
  const talent = await getTalentBySlug(slug);
  if (!talent) notFound();

  const [active, finished] = await Promise.all([
    getActiveGiveaways(talent.id),
    getFinishedGiveaways(talent.id),
  ]);

  const allGiveaways = [...active, ...finished];
  const totalValue = computeTotalValue(allGiveaways);

  return (
    <>
      {/* Ticker marquee */}
      {active.length > 0 && (
        <div className="bg-[#C3FC00] overflow-hidden">
          <div className="gw-ticker-track whitespace-nowrap">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="inline-flex items-center gap-6 px-6">
                {active.map((g) => (
                  <span key={`${i}-${g.id}`} className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-black/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-black/30 animate-pulse" />
                    {g.title} — {g.value}
                  </span>
                ))}
                <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-black/50">
                  LIVE GIVEAWAYS
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-[#050507]/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-black text-xs uppercase tracking-[0.2em] text-white/50">
            {talent.name}
          </span>
          {active.length > 0 && (
            <a
              href="#giveaways"
              className="px-5 py-1.5 rounded-full bg-[#C3FC00] text-black text-[11px] font-black uppercase tracking-[0.15em] hover:shadow-[0_0_20px_rgba(195,252,0,0.4)] hover:bg-[#d4ff33] transition-all giveaway-btn-glow"
            >
              Giveaways
            </a>
          )}
        </div>
      </header>

      <CreatorHero talent={talent} />

      {/* Stats bar */}
      {allGiveaways.length > 0 && (
        <div className="border-y border-white/[0.04] bg-white/[0.01]">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <p className="text-2xl font-black text-[#C3FC00] gw-value-shimmer">{active.length}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mt-0.5">Activos</p>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-2xl font-black text-[#C3FC00] gw-value-shimmer">{totalValue}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mt-0.5">En premios</p>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-2xl font-black text-[#C3FC00] gw-value-shimmer">{finished.length}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mt-0.5">Entregados</p>
            </div>
          </div>
        </div>
      )}

      {/* Giveaways content */}
      <div id="giveaways" className="max-w-5xl mx-auto px-6 pb-20 pt-10 space-y-12">
        {active.length === 0 && finished.length === 0 ? (
          <div className="text-center py-20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-16 h-16 mx-auto mb-4 text-white/10">
              <rect x="2" y="6" width="20" height="12" rx="3" />
              <circle cx="9" cy="12" r="2" />
              <circle cx="15" cy="10" r="1" />
              <circle cx="15" cy="14" r="1" />
              <circle cx="17" cy="12" r="1" />
              <circle cx="13" cy="12" r="1" />
            </svg>
            <p className="text-lg font-bold uppercase tracking-wider text-white/30">
              No hay sorteos activos
            </p>
            <p className="text-sm text-white/20 mt-2">Vuelve pronto</p>
          </div>
        ) : (
          <>
            <GiveawayGrid giveaways={active} title="Sorteos Activos" />
            <GiveawayGrid giveaways={finished} title="Finalizados" />
          </>
        )}
      </div>

      {/* Footer badge */}
      <div className="border-t border-white/[0.04] py-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/15 font-bold">
          Powered by SocialPro
        </p>
      </div>
    </>
  );
}
