import type { Metadata } from 'next';
import Link from 'next/link';

import { safeJsonLd } from '@/lib/safeJsonLd';
import { absoluteUrl } from '@/lib/site-url';
import {
  GLOSSARY_BLOCK_DESCRIPTIONS,
  GLOSSARY_BLOCK_LABELS,
  GLOSSARY_TERMS,
  getGlossaryByBlock,
  type GlossaryBlock,
} from '@/lib/glosario';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';

export const revalidate = 3600;

const BLOCKS_ORDER: readonly GlossaryBlock[] = ['iGaming', 'skins-cs2', 'creator-economy'];

export const metadata: Metadata = {
  title: 'Glosario iGaming & Skins CS2 — Vocabulario del sector | SocialPro',
  description:
    'Glosario en español del marketing iGaming y del ecosistema de skins CS2: FTD, CPA, GGR, DGOJ, case opening, provably fair, trade-up, StatTrak, brand deal, media kit. Definiciones directas, contexto operativo y cómo lo aplica SocialPro.',
  alternates: { canonical: '/recursos/glosario' },
  openGraph: {
    title: 'Glosario iGaming & Skins CS2 | SocialPro',
    description:
      '25 términos del sector iGaming y del ecosistema de skins CS2 explicados en español. Diferencial: bloque skins que nadie tiene en español.',
    url: absoluteUrl('/recursos/glosario'),
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'Glosario iGaming & Skins CS2 — SocialPro',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Glosario iGaming & Skins CS2 | SocialPro',
    description:
      '25 términos del sector iGaming y del ecosistema de skins CS2 explicados en español.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

export default function GlossaryIndexPage() {
  const byBlock = getGlossaryByBlock();

  const definedTermSetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': absoluteUrl('/recursos/glosario'),
    name: 'Glosario iGaming & Skins CS2 — SocialPro',
    description:
      'Glosario en español de términos operativos del marketing iGaming y del ecosistema de skins CS2, mantenido por SocialPro.',
    url: absoluteUrl('/recursos/glosario'),
    inLanguage: 'es',
    hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
      '@type': 'DefinedTerm',
      '@id': absoluteUrl(`/recursos/glosario/${t.slug}`),
      name: t.name,
      ...(t.alternateName ? { alternateName: [...t.alternateName] } : {}),
      description: t.shortDef,
      url: absoluteUrl(`/recursos/glosario/${t.slug}`),
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Recursos', url: absoluteUrl('/recursos/glosario') },
    { name: 'Glosario', url: absoluteUrl('/recursos/glosario') },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(definedTermSetJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      {/* Hero */}
      <section className="bg-sp-black pt-24 pb-14 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">
            Recursos · Glosario
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Glosario iGaming &amp; Skins CS2
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            25 términos operativos del marketing iGaming y del ecosistema de skins de CS2,
            en español. Cada entrada trae una definición directa, un párrafo de contexto y
            cómo lo aplicamos en SocialPro. El bloque skins es el diferencial: nadie lo
            tiene en español al mismo nivel de detalle.
          </p>
        </div>
      </section>

      {/* Bloques */}
      {BLOCKS_ORDER.map((block) => (
        <section
          key={block}
          className={block === 'skins-cs2' ? 'bg-sp-off py-14 md:py-20 border-t border-sp-border' : 'bg-white py-14 md:py-20 border-t border-sp-border'}
        >
          <div className="max-w-4xl mx-auto px-6">
            <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-3">
              {GLOSSARY_BLOCK_LABELS[block]}
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark leading-tight mb-4">
              {GLOSSARY_BLOCK_LABELS[block]}
              {block === 'skins-cs2' && (
                <span className="ml-3 inline-block align-middle text-[10px] font-bold uppercase tracking-widest text-sp-orange border border-sp-orange rounded-full px-2 py-1">
                  Diferencial
                </span>
              )}
            </h2>
            <p className="text-base text-sp-muted leading-relaxed mb-10 max-w-3xl">
              {GLOSSARY_BLOCK_DESCRIPTIONS[block]}
            </p>
            <ul className="grid sm:grid-cols-2 gap-4">
              {byBlock[block].map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/recursos/glosario/${t.slug}`}
                    className="group block rounded-2xl border border-sp-border bg-white p-5 hover:border-sp-orange hover:shadow-sm transition-all"
                  >
                    <p className="font-display text-base font-black uppercase text-sp-dark group-hover:text-sp-orange transition-colors mb-2">
                      {t.name}
                    </p>
                    <p className="text-xs text-sp-muted leading-relaxed line-clamp-3">
                      {t.shortDef}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {/* CTA final */}
      <section className="bg-sp-black py-16 text-center border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">
            ¿Falta un término que necesitas?
          </h2>
          <p className="text-white/50 mb-8 text-sm">
            El glosario crece con las verticales que trabajamos. Si echas en falta un
            término del marketing gaming, iGaming o CS2, cuéntanoslo.
          </p>
          <Link
            href="/contacto?type=brand"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Contactar
          </Link>
        </div>
      </section>
    </>
  );
}
