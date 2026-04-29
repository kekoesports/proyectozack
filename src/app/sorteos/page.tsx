import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getAllActiveGiveaways, getAllFinishedGiveaways } from '@/lib/queries/giveawaysHub';
import { SorteoCard } from '@/features/giveaways/components/SorteoCard';
import { absoluteUrl } from '@/lib/site-url';

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
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sorteos de Skins Gaming | SocialPro',
    description:
      'Skins CS2 y recompensas gaming. Sorteos gratis con tus creadores favoritos.',
    images: [absoluteUrl('/og-default.jpg')],
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

  const totalValue = computeTotalValue([...active, ...finished]);

  return (
    <>
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
              Sorteos de Skins
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

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-14">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 90% 100% at 50% -15%, rgba(245,99,42,0.12) 0%, rgba(139,58,173,0.08) 45%, transparent 75%)',
          }}
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <span className="h-px w-6 bg-sp-orange/50" />
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-sp-orange/70">
              SocialPro · Gaming
            </span>
            <span className="h-px w-6 bg-sp-orange/50" />
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.88] mb-4">
            <span className="text-white">Sorteos</span>
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #f5632a 0%, #e03070 50%, #8b3aad 100%)' }}
            >
              de Skins
            </span>
          </h1>

          <p className="max-w-md mx-auto text-sm text-white/40 leading-relaxed mb-8">
            Participa en los mejores sorteos de skins CS2 y recompensas gaming con tus creadores favoritos. Gratis y sin trucos.
          </p>

          {(active.length > 0 || totalValue) && (
            <div className="inline-flex items-center gap-5 px-6 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm flex-wrap justify-center">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-2xl font-black gw-sp-value tabular-nums">{active.length}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">
                  {active.length === 1 ? 'Sorteo activo' : 'Sorteos activos'}
                </span>
              </div>
              {totalValue && (
                <>
                  <div className="h-7 w-px bg-white/[0.07]" />
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-black gw-sp-value tabular-nums">{totalValue}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">En premios</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-16">
        {/* Active giveaways */}
        {active.length > 0 ? (
          <section className="mb-14">
            <div className="flex items-center gap-4 mb-7">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-base font-black uppercase tracking-[0.2em] text-white/80">
                  Sorteos activos
                </h2>
              </div>
              <div className="flex-1 h-px bg-white/[0.05]" />
              <span className="text-[10px] font-bold text-white/25 tabular-nums">
                {active.length} en directo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {active.map((g) => (
                <SorteoCard key={g.id} giveaway={g} />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-24">
            <div className="text-5xl mb-5" aria-hidden>🎁</div>
            <h2 className="font-display text-3xl font-black uppercase text-white/25 mb-3">
              Próximamente
            </h2>
            <p className="text-sm text-white/25 max-w-xs mx-auto">
              Nuevos sorteos muy pronto. Sigue a nuestros creadores para enterarte el primero.
            </p>
            <Link
              href="/giveaways"
              className="inline-flex items-center gap-2 mt-8 text-[11px] font-black uppercase tracking-wider text-sp-orange/60 hover:text-sp-orange transition-colors"
            >
              ← Ver códigos de descuento
            </Link>
          </div>
        )}

        {/* Finished giveaways */}
        {finished.length > 0 && (
          <details className="group border-t border-white/[0.05] pt-6">
            <summary className="cursor-pointer flex items-center gap-4 list-none py-2 opacity-40 hover:opacity-60 transition-opacity">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                Sorteos finalizados
              </h2>
              <div className="flex-1 h-px bg-white/[0.05]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 tabular-nums">
                ({finished.length})
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 group-open:hidden">
                Mostrar
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 hidden group-open:inline">
                Ocultar
              </span>
            </summary>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {finished.map((g) => (
                <SorteoCard key={g.id} giveaway={g} />
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
          ← Ver códigos de descuento en SocialPro
        </Link>
      </div>
    </>
  );
}
