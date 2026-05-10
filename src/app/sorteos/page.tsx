import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getAllActiveGiveaways, getAllFinishedGiveaways, extractUniqueBrands, extractCreators } from '@/lib/queries/giveawaysHub';
import { SorteosHub } from '@/features/giveaways/components/SorteosHub';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { generateGiveawayListSchema } from '@/lib/schema';
import { ResponsibleGamingFooter } from '@/components/ui/ResponsibleGamingFooter';
import { Cs2LabCard } from '@/components/cs2-lab/Cs2LabCard';

export const metadata: Metadata = {
  title: 'Sorteos de Skins — SocialPro',
  description:
    'Participa en los mejores sorteos de skins CS2 y recompensas gaming de tus creadores favoritos.',
  alternates: { canonical: '/sorteos' },
  openGraph: {
    title: 'Sorteos de Skins Gaming | SocialPro',
    description:
      'Participa en los mejores sorteos de skins CS2 y recompensas gaming de tus creadores favoritos.',
    url: absoluteUrl('/sorteos'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sorteos de Skins Gaming | SocialPro',
    description:
      'Skins CS2 y recompensas gaming. Sorteos gratis con tus creadores favoritos.',
    images: [absoluteUrl('/og-socialpro.png')],
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
  if (total === 0) return '';
  return total.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + '€';
}

export default async function SorteosPage(): Promise<React.JSX.Element> {
  const [active, finished] = await Promise.all([
    getAllActiveGiveaways(),
    getAllFinishedGiveaways(),
  ]);

  const allGiveaways = [...active, ...finished];
  const brands       = extractUniqueBrands(allGiveaways);
  const creators     = extractCreators(allGiveaways);
  const totalValue   = computeTotalValue(active);

  const eventListSchema = active.length > 0
    ? generateGiveawayListSchema(active, SITE_URL, 'Sorteos de skins CS2 en SocialPro')
    : null;

  return (
    <>
      {eventListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventListSchema) }}
        />
      )}
      <h1 className="sr-only">Sorteos de Skins — SocialPro</h1>

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
                <span className="text-[11px] font-black uppercase tracking-wider text-white/50">SORTEOS ACTIVOS</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sticky sub-header */}
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
              Sorteos
            </span>
          </div>
          <div className="flex items-center gap-4">
            {active.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">
                  {active.length} activos
                </span>
              </div>
            )}
            <Link
              href="/giveaways"
              className="text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white/70 transition-colors"
            >
              ← Códigos
            </Link>
          </div>
        </div>
      </header>

      {/* Compact hero strip */}
      <section className="relative border-b border-white/[0.05] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 200% at 0% 50%, rgba(245,99,42,0.07) 0%, rgba(139,58,173,0.04) 45%, transparent 70%)' }}
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">

          {/* Title — compacto, dashboard-style */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.32em] text-sp-orange/60 mb-0.5">
                SocialPro · Gaming
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white leading-none">
                Sorteos{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #f5632a 0%, #e03070 50%, #8b3aad 100%)' }}
                >
                  de Skins
                </span>
              </h2>
            </div>
          </div>

          {/* Stat pills */}
          {(active.length > 0 || totalValue || brands.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {active.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-400/[0.06] border border-emerald-400/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400/80 tabular-nums">
                    {active.length} {active.length === 1 ? 'activo' : 'activos'}
                  </span>
                </div>
              )}
              {totalValue && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[11px] font-black text-white/80 tabular-nums">{totalValue}</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">en juego</span>
                </div>
              )}
              {brands.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[11px] font-black text-white/80 tabular-nums">{brands.length}</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                    {brands.length === 1 ? 'marca' : 'marcas'}
                  </span>
                </div>
              )}
              {creators.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[11px] font-black text-white/80 tabular-nums">{creators.length}</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                    {creators.length === 1 ? 'creador' : 'creadores'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Hub: sidebar + grid */}
      <SorteosHub
        active={active}
        finished={finished}
        brands={brands}
        creators={creators}
        {...(totalValue ? { totalValue } : {})}
      />

      {/* Footer */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-2">
        <Cs2LabCard variant="compact" ctaId="sorteos_cs2_lab" />
      </div>

      <div className="border-t border-white/[0.04] py-4 text-center">
        <Link
          href="/giveaways"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/20 hover:text-white/50 font-bold transition-colors"
        >
          ← Ver códigos de descuento en SocialPro
        </Link>
      </div>
      <ResponsibleGamingFooter />
    </>
  );
}
