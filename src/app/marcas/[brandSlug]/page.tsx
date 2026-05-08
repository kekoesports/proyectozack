import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBrandBySlug, getBrandSlugs } from '@/lib/brands';
import { getAllCodes } from '@/lib/queries/creatorCodes';
import { getAllActiveGiveaways } from '@/lib/queries/giveawaysHub';
import { getAllWinners } from '@/lib/queries/giveawayWinners';
import { WinnersList } from '@/features/giveaways/components/WinnersList';
import { GiveawayFeatured } from '@/features/giveaways/components/GiveawayFeatured';
import { GiveawayRow } from '@/features/giveaways/components/GiveawayRow';
import { CodesExpandable } from '@/features/giveaways/components/CodesExpandable';
import { HeroSponsorCard } from '@/features/giveaways/components/HeroSponsorCard';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { generateCodeListSchema, generateGiveawayListSchema } from '@/lib/schema';
import type { GiveawayWinnerFull, CreatorCodeWithTalent, GiveawayWithTalent } from '@/types';

export const revalidate = 3600;

type PageProps = { params: Promise<{ brandSlug: string }> };

export async function generateStaticParams() {
  return getBrandSlugs().map((slug) => ({ brandSlug: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brandSlug } = await params;
  const brand = getBrandBySlug(brandSlug);
  if (!brand) return {};

  const title = `Códigos ${brand.name} 2026 — Bonos Exclusivos | SocialPro`;
  const description = `Todos los códigos activos de ${brand.name} de creadores españoles. ${brand.tagline}. Sorteos en directo y ganadores reales.`;

  return {
    title,
    description,
    alternates: { canonical: `/marcas/${brandSlug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/marcas/${brandSlug}`),
      type: 'website',
      images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl('/og-socialpro.png')],
    },
  };
}

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

export default async function BrandPage({ params }: PageProps) {
  const { brandSlug } = await params;
  const brand = getBrandBySlug(brandSlug);
  if (!brand) notFound();

  // Datos live filtrados por marca
  const [allCodes, allGiveaways, allWinners] = await Promise.all([
    getAllCodes(),
    getAllActiveGiveaways(),
    getAllWinners(),
  ]);

  const codes       = allCodes.filter((c) => c.brandName.toLowerCase() === brand.dbName.toLowerCase()) as CreatorCodeWithTalent[];
  const giveaways   = allGiveaways.filter((g) => g.brandName.toLowerCase() === brand.dbName.toLowerCase()) as GiveawayWithTalent[];
  const winners     = (allWinners as unknown as GiveawayWinnerFull[]).filter((w) => w.giveaway.brandName.toLowerCase() === brand.dbName.toLowerCase()).slice(0, 8);

  const featuredCode  = codes.find((c) => c.isFeatured) ?? codes[0] ?? null;
  const otherCodes    = featuredCode ? codes.filter((c) => c.id !== featuredCode.id) : codes;
  const codesWithTalent = codes; // ya tiene el tipo correcto

  // Schemas JSON-LD
  const categoryTopics: Record<string, string[]> = {
    cs2:      ['CS2', 'Counter-Strike 2', 'CS2 skins', 'skin gambling', 'gaming'],
    casino:   ['online casino', 'iGaming', 'casino gaming', 'slots'],
    apuestas: ['sports betting', 'esports betting', 'iGaming', 'online betting'],
    otros:    ['gaming', 'esports'],
  };
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': brand.officialUrl,
    name: brand.name,
    url: brand.officialUrl,
    description: (brand.description.split('\n\n')[0] ?? '').slice(0, 300),
    ...(brand.logoUrl ? { logo: { '@type': 'ImageObject', url: brand.logoUrl } } : {}),
    knowsAbout: categoryTopics[brand.category] ?? categoryTopics.otros,
    subjectOf: {
      '@type': 'WebPage',
      '@id': absoluteUrl(`/marcas/${brandSlug}`),
      url: absoluteUrl(`/marcas/${brandSlug}`),
      name: `Códigos ${brand.name} — SocialPro`,
      publisher: { '@id': absoluteUrl('/#organization') },
    },
  };
  const codeListSchema  = codes.length > 0 ? generateCodeListSchema(codes, SITE_URL, `Códigos ${brand.name} activos en SocialPro`) : null;
  const eventListSchema = giveaways.length > 0 ? generateGiveawayListSchema(giveaways, SITE_URL, `Sorteos ${brand.name} activos en SocialPro`) : null;
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Marcas', item: absoluteUrl('/giveaways') },
      { '@type': 'ListItem', position: 3, name: brand.name, item: absoluteUrl(`/marcas/${brandSlug}`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      {codeListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(codeListSchema) }} />}
      {eventListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventListSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <main className="bg-sp-black text-white min-h-screen">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden pt-28 pb-16 px-4 sm:px-6">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(50% 40% at 50% 0%, rgba(245,99,42,0.1) 0%, transparent 60%)' }} />
          <div className="relative max-w-4xl mx-auto text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sp-orange mb-4">
              Códigos exclusivos · SocialPro
            </p>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-black uppercase leading-tight mb-4">
              Códigos <span style={g}>{brand.name}</span><br />2026
            </h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto mb-8">
              {brand.tagline}. Códigos de creadores verificados con bonos exclusivos para la comunidad de SocialPro.
            </p>
            {brand.officialUrl && (
              <a
                href={brand.officialUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-block px-8 py-3 rounded-full font-black text-white text-sm uppercase tracking-wider bg-sp-grad shadow-[0_4px_20px_rgba(245,99,42,0.25)] hover:shadow-[0_4px_30px_rgba(245,99,42,0.4)] transition-shadow"
              >
                {brand.ctaText} →
              </a>
            )}
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-16 pb-20">

          {/* ── Descripción SEO ── */}
          <section>
            <h2 className="font-display text-2xl sm:text-3xl font-black uppercase mb-6">
              ¿Qué es <span style={g}>{brand.name}</span>?
            </h2>
            <div className="space-y-4 text-sm text-white/55 leading-relaxed">
              {brand.description.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {/* ── Códigos activos ── */}
          {codes.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-black uppercase mb-6">
                Códigos activos de {brand.name}
              </h2>
              {featuredCode && <HeroSponsorCard code={featuredCode} />}
              {otherCodes.length > 0 && (
                <div className="mt-4">
                  <CodesExpandable codes={otherCodes} label={`Más códigos de ${brand.name}`} />
                </div>
              )}
            </section>
          )}

          {/* ── Sorteos activos ── */}
          {giveaways.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="font-display text-2xl font-black uppercase">
                  Sorteos activos de {brand.name}
                </h2>
                <span className="flex items-center gap-1 text-[10px] font-black text-[#C3FC00]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C3FC00] animate-pulse" />
                  {giveaways.length} live
                </span>
              </div>
              <div className="space-y-4">
                {giveaways[0] && <GiveawayFeatured giveaway={giveaways[0]} />}
                {giveaways.slice(1).map((g) => (
                  <GiveawayRow key={g.id} giveaway={g} />
                ))}
              </div>
            </section>
          )}

          {/* ── Últimos ganadores ── */}
          {winners.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-black uppercase">
                  Últimos ganadores en {brand.name}
                </h2>
                <Link href="/ganadores" className="text-[10px] font-bold text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors">
                  Ver todos →
                </Link>
              </div>
              <WinnersList winners={winners} variant="compact" />
            </section>
          )}

          {/* ── FAQ ── */}
          <section>
            <h2 className="font-display text-2xl font-black uppercase mb-8">
              Preguntas frecuentes sobre {brand.name}
            </h2>
            <div className="space-y-4">
              {brand.faqs.map((faq, i) => (
                <details key={i} className="group rounded-xl border border-white/[0.07] bg-white/[0.02]">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                    <span className="font-bold text-sm text-white/90">{faq.q}</span>
                    <span className="text-white/30 group-open:rotate-45 transition-transform text-lg">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-white/50 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ── Footer de juego responsable ── */}
          <div className="border-t border-white/[0.06] pt-8 text-center space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">+18 · Juega con responsabilidad</p>
            <p className="text-[10px] text-white/15 max-w-xl mx-auto">
              Contenido destinado a mayores de 18 años. ¿El juego te está causando problemas?{' '}
              <a href="https://www.jugarbien.es" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/30">jugarbien.es</a>
              {' '}· <a href="tel:900200225" className="underline hover:text-white/30">900 200 225</a> (gratuito, 24h)
            </p>
            <Link href="/terminos-sorteos" className="text-[10px] text-white/15 hover:text-white/30 underline transition-colors">
              Términos y condiciones
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
