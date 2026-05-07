import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllWinners } from '@/lib/queries/giveawayWinners';
import type { GiveawayWinnerFull } from '@/types';
import { getAllTalents } from '@/lib/queries/talents';
import { WinnersList } from '@/features/giveaways/components/WinnersList';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const winners = await getAllWinners();
  const totalValue = winners.reduce((acc, w) => {
    if (!w.giveaway.value) return acc;
    const n = parseFloat(w.giveaway.value.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(n) ? acc : acc + n;
  }, 0);

  return {
    title: `Ganadores de Sorteos Gaming — SocialPro`,
    description: `Más de ${winners.length} premios entregados a la comunidad. Skins de CS2, gift cards y más. Todos los ganadores reales de los sorteos de nuestros creadores.`,
    alternates: { canonical: '/ganadores' },
    openGraph: {
      title: 'Ganadores de Sorteos Gaming | SocialPro',
      description: `${winners.length} premios · ${Math.round(totalValue).toLocaleString('es-ES')}€ en valor total entregado.`,
      url: absoluteUrl('/ganadores'),
      images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
    },
  };
}

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ creator?: string; brand?: string; page?: string }>;
};

export default async function GanadoresPage({ searchParams }: PageProps) {
  const { creator, brand, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));

  const [allWinners, allTalents] = await Promise.all([
    getAllWinners(),
    getAllTalents(),
  ]);

  // Filtros
  let filtered = allWinners as unknown as GiveawayWinnerFull[];
  if (creator) filtered = filtered.filter((w) => w.giveaway.talent?.slug === creator);
  if (brand) filtered = filtered.filter((w) =>
    w.giveaway.brandName.toLowerCase() === brand.toLowerCase()
  );

  // Stats
  const totalValue = filtered.reduce((acc, w) => {
    if (!w.giveaway.value) return acc;
    const n = parseFloat(w.giveaway.value.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(n) ? acc : acc + n;
  }, 0);

  // Marcas únicas para filtro
  const brands = [...new Set(allWinners.map((w) => w.giveaway.brandName))].sort();

  // Paginación
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Ganadores de sorteos en SocialPro',
    numberOfItems: filtered.length,
    itemListElement: paginated.map((w, i) => ({
      '@type': 'ListItem',
      position: (page - 1) * PAGE_SIZE + i + 1,
      name: `${w.winnerName} ganó ${w.giveaway.title}`,
      description: `Premio de ${w.giveaway.brandName} — ${w.giveaway.value ?? 'sin valor declarado'}`,
    })),
  };

  const buildUrl = (params: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (params.creator) p.set('creator', params.creator);
    if (params.brand) p.set('brand', params.brand);
    if (params.page && params.page !== '1') p.set('page', params.page);
    const qs = p.toString();
    return `/ganadores${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="bg-sp-black text-white min-h-screen">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-6">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sp-orange mb-3">Prueba social</p>
            <h1 className="font-display text-4xl sm:text-5xl font-black uppercase leading-tight mb-3">
              Ganadores de SocialPro
            </h1>
            <div className="flex flex-wrap gap-6 text-sm text-white/40">
              <span><span className="text-white font-black text-lg">{filtered.length}</span> premios entregados</span>
              {totalValue > 0 && (
                <span>
                  <span className="text-white font-black text-lg">
                    {Math.round(totalValue).toLocaleString('es-ES')}€
                  </span> en valor total
                </span>
              )}
            </div>
          </div>

          {/* Filtros */}
          <form className="flex flex-wrap gap-3 mb-8" method="GET">
            {/* Creador */}
            <select
              name="creator"
              defaultValue={creator ?? ''}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-sp-orange/50 transition-colors"
            >
              <option value="">Todos los creadores</option>
              {allTalents.map((t) => (
                <option key={t.id} value={t.slug}>{t.name}</option>
              ))}
            </select>

            {/* Marca */}
            <select
              name="brand"
              defaultValue={brand ?? ''}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-sp-orange/50 transition-colors"
            >
              <option value="">Todas las marcas</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-white/[0.07] text-white/70 text-sm font-semibold hover:bg-white/[0.12] transition-colors"
            >
              Filtrar
            </button>

            {(creator || brand) && (
              <Link
                href="/ganadores"
                className="px-4 py-2 rounded-lg border border-white/[0.08] text-white/40 text-sm hover:border-white/20 hover:text-white/60 transition-colors"
              >
                Limpiar
              </Link>
            )}
          </form>

          {/* Lista */}
          {paginated.length === 0 ? (
            <p className="text-white/30 text-sm py-12 text-center">No hay ganadores con estos filtros.</p>
          ) : (
            <WinnersList winners={paginated} variant="full" />
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {page > 1 && (
                <Link
                  href={buildUrl({ creator, brand, page: String(page - 1) })}
                  className="px-4 py-2 rounded-lg border border-white/[0.08] text-white/50 text-sm hover:border-white/20 hover:text-white transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              <span className="text-sm text-white/30">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildUrl({ creator, brand, page: String(page + 1) })}
                  className="px-4 py-2 rounded-lg border border-white/[0.08] text-white/50 text-sm hover:border-white/20 hover:text-white transition-colors"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
