import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { safeJsonLd } from '@/lib/safeJsonLd';
import { absoluteUrl } from '@/lib/site-url';
import {
  GLOSSARY_BLOCK_LABELS,
  getAllGlossarySlugs,
  getGlossaryByBlock,
  getGlossaryTermBySlug,
  type GlossaryBlock,
} from '@/lib/glosario';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';

// Landings SEO relacionadas por bloque — mostradas al pie de cada ficha.
const RELATED_LINKS_BY_BLOCK: Record<GlossaryBlock, ReadonlyArray<{ readonly href: string; readonly label: string }>> = {
  'iGaming': [
    { href: '/servicios/igaming', label: 'Servicios iGaming' },
    { href: '/agencia-influencers-casino', label: 'Agencia de influencers casino' },
    { href: '/streamers-apuestas-deportivas', label: 'Streamers de apuestas deportivas' },
    { href: '/influencers-poker', label: 'Influencers de poker' },
    { href: '/guia-dgoj-igaming-influencers', label: 'Guía DGOJ' },
  ],
  'skins-cs2': [
    { href: '/marketing-skins-cs2', label: 'Marketing de skins CS2' },
    { href: '/influencers-cs2', label: 'Influencers CS2' },
    { href: '/apuesta-segura-cs2', label: 'Apuesta Segura CS2' },
    { href: '/casos/skinsmonkey', label: 'Caso SkinsMonkey' },
  ],
  'creator-economy': [
    { href: '/para-creadores', label: 'Para creadores' },
    { href: '/servicios', label: 'Servicios de la agencia' },
    { href: '/metodologia', label: 'Metodología' },
  ],
};

export const revalidate = 3600;

export async function generateStaticParams(): Promise<Array<{ readonly slug: string }>> {
  return getAllGlossarySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTermBySlug(slug);
  if (!term) return { title: 'Término no encontrado — Glosario SocialPro' };

  const title = `${term.name} — Glosario iGaming & Skins CS2 | SocialPro`;
  const description = term.shortDef.length > 155
    ? `${term.shortDef.slice(0, 152).trimEnd()}…`
    : term.shortDef;

  return {
    title,
    description,
    alternates: { canonical: `/recursos/glosario/${term.slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/recursos/glosario/${term.slug}`),
      siteName: 'SocialPro',
      locale: 'es_ES',
      type: 'article',
      images: [{
        url: absoluteUrl('/og-socialpro.png'),
        width: 1200,
        height: 630,
        alt: `${term.name} — glosario SocialPro`,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl('/og-socialpro.png')],
    },
  };
}

export default async function GlossaryTermPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const term = getGlossaryTermBySlug(slug);
  if (!term) notFound();

  const byBlock = getGlossaryByBlock();
  const siblingsInBlock = byBlock[term.block].filter((t) => t.slug !== term.slug);
  const relatedLinks = RELATED_LINKS_BY_BLOCK[term.block];

  const definedTermJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': absoluteUrl(`/recursos/glosario/${term.slug}`),
    name: term.name,
    ...(term.alternateName ? { alternateName: [...term.alternateName] } : {}),
    description: term.shortDef,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      '@id': absoluteUrl('/recursos/glosario'),
      name: 'Glosario iGaming & Skins CS2 — SocialPro',
      url: absoluteUrl('/recursos/glosario'),
    },
    url: absoluteUrl(`/recursos/glosario/${term.slug}`),
    inLanguage: 'es',
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Recursos', url: absoluteUrl('/recursos/glosario') },
    { name: 'Glosario', url: absoluteUrl('/recursos/glosario') },
    { name: term.name, url: absoluteUrl(`/recursos/glosario/${term.slug}`) },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(definedTermJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      {/* Hero + definición directa */}
      <section className="bg-sp-black pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="max-w-3xl mx-auto px-6">
          <Link
            href="/recursos/glosario"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors mb-8"
          >
            <span aria-hidden="true">←</span> Volver al glosario
          </Link>

          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-3">
            {GLOSSARY_BLOCK_LABELS[term.block]}
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight mb-5">
            {term.name}
          </h1>
          {term.alternateName && term.alternateName.length > 0 && (
            <p className="text-sm text-white/50 mb-8">
              También conocido como:{' '}
              {term.alternateName.map((a, i) => (
                <span key={a}>
                  <em className="not-italic">{a}</em>
                  {i < (term.alternateName?.length ?? 0) - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          )}
          <p className="text-lg text-white/80 leading-relaxed">
            {term.shortDef}
          </p>
        </div>
      </section>

      {/* Contexto */}
      <section className="bg-white py-14 md:py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black uppercase text-sp-dark mb-5">
            Contexto
          </h2>
          <p className="text-base text-sp-muted leading-relaxed">
            {term.context}
          </p>
        </div>
      </section>

      {/* Cómo lo aplicamos en SocialPro */}
      <section className="bg-sp-off py-14 md:py-16 border-t border-sp-border">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-3">
            Cómo lo aplicamos en SocialPro
          </p>
          <p className="text-base text-sp-dark leading-relaxed">
            {term.socialProApplication}
          </p>
        </div>
      </section>

      {/* Related — landings del bloque + otros términos del bloque */}
      <section className="bg-white py-14 md:py-16 border-t border-sp-border">
        <div className="max-w-3xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-3">
              Servicios relacionados
            </p>
            <ul className="space-y-2">
              {relatedLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-sp-dark hover:text-sp-orange transition-colors underline underline-offset-4 decoration-sp-border hover:decoration-sp-orange"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-3">
              Más términos de {GLOSSARY_BLOCK_LABELS[term.block]}
            </p>
            <ul className="space-y-2">
              {siblingsInBlock.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/recursos/glosario/${t.slug}`}
                    className="text-sm text-sp-dark hover:text-sp-orange transition-colors underline underline-offset-4 decoration-sp-border hover:decoration-sp-orange"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-sp-black py-14 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black uppercase text-white mb-4">
            ¿Trabajas con {term.name.toLowerCase()} y necesitas activarlo con streamers?
          </h2>
          <p className="text-white/50 mb-8 text-sm">
            SocialPro conecta operadores con creadores hispanohablantes verificados.
            Cuéntanos tu producto y te proponemos activación en 48h.
          </p>
          <Link
            href="/contacto?type=brand"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Solicitar propuesta
          </Link>
        </div>
      </section>
    </>
  );
}
