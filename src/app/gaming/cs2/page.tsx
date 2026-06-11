import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'CS2 Influencer Marketing — Streamers de CS2 para tu Marca',
  description:
    'Campañas de CS2 influencer marketing con streamers verificados en España y LatAm. Esports marketing agency especializada en Counter-Strike 2. Activa en <72h.',
  alternates: {
    // Canonical apunta a la página ES canónica del cluster CS2
    canonical: '/influencers-cs2',
  },
  openGraph: {
    title: 'CS2 Influencer Marketing — Streamers de CS2 para tu Marca | SocialPro',
    description:
      'Streamers de CS2 verificados en España y LatAm para campañas gaming. Esports marketing agency con +13 años y FTD tracking. Activa en <72h.',
    url: absoluteUrl('/gaming/cs2'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CS2 Influencer Marketing — Streamers para tu Marca | SocialPro',
    description:
      'Streamers CS2 verificados en España y LatAm. Esports marketing con FTD tracking y activación en <72h.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'CS2 Influencer Marketing',
  serviceType: 'Esports Influencer Marketing',
  provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  areaServed: [
    { '@type': 'Country', name: 'España' },
    { '@type': 'Country', name: 'México' },
    { '@type': 'Country', name: 'Argentina' },
    { '@type': 'Country', name: 'Colombia' },
    { '@type': 'Country', name: 'Chile' },
  ],
  description:
    'Campañas de CS2 influencer marketing con streamers y creadores de contenido verificados en España y LatAm. Activación en menos de 72 horas con tracking de resultados.',
};


const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Gaming', item: `${SITE_URL}/gaming` },
    { '@type': 'ListItem', position: 3, name: 'CS2', item: `${SITE_URL}/gaming/cs2` },
  ],
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

const STATS = [
  { stat: '8M+',   label: 'Reach en campaña 1WIN CS2' },
  { stat: '+340',  label: 'FTDs en una sola activación' },
  { stat: '<72h',  label: 'De briefing a campaña activa' },
  { stat: '+13',   label: 'Años en marketing gaming' },
];

const ADVANTAGES = [
  {
    title: 'Audiencia de alta conversión',
    desc: 'Los espectadores de CS2 son jugadores activos con poder adquisitivo real. Convierten en iGaming, hardware y periféricos a tasas muy superiores a audiencias generalistas.',
  },
  {
    title: 'Contenido nativo, no publicidad',
    desc: 'Los streamers de CS2 integran tu marca de forma orgánica en sus partidas. No es un anuncio — es un jugador real usando tu producto mientras juega al máximo nivel.',
  },
  {
    title: 'Tracking end-to-end',
    desc: 'Cada streamer recibe un código único. Rastreamos clics, registros y conversiones atribuidas a cada creador. Reportes verificados, sin capturas de pantalla.',
  },
  {
    title: 'Torneos y eventos CS2',
    desc: 'Activaciones en campeonatos, Major qualifiers y torneo personalizados. Formatos que amplifican el alcance cuando la audiencia está en su pico de atención.',
  },
];

const CASE_STUDIES = [
  {
    brand: '1WIN',
    stat: '8M+ reach',
    detail: 'Campaña multiterritorio durante el torneo de CS2. Más de 100 streamers activados en simultáneo en España, México, Argentina y Colombia. Integración en directos competitivos.',
  },
  {
    brand: 'SkinsMonkey',
    stat: '200K€ conversiones',
    detail: 'Campaña de 6 semanas con código de referido trazado. 200.000€ en transacciones atribuidas directamente a streamers CS2 de SocialPro.',
  },
];

export default function Cs2Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      {/* ── Hero ── */}
      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionTag>CS2 Influencer Marketing</SectionTag>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Streamers de CS2 <GradientText>para tu Marca</GradientText>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Campañas de CS2 influencer marketing con streamers verificados en España y LatAm.
            Audiencias reales, FTD tracking y activación en menos de 72 horas.
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-center mb-10">
            {STATS.map(({ stat, label }) => (
              <div key={label}>
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-sm text-white/50 mt-1 max-w-[140px]">{label}</div>
              </div>
            ))}
          </div>
          <Link
            href="/contacto?type=brand"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Lanza tu campaña CS2
          </Link>
        </div>
      </section>

      {/* ── Por qué CS2 ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <SectionTag>Por qué CS2</SectionTag>
          <SectionHeading className="mb-10">
            La audiencia más <GradientText>compradora del gaming</GradientText>
          </SectionHeading>
          <div className="grid sm:grid-cols-2 gap-6">
            {ADVANTAGES.map((a) => (
              <div key={a.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-lg font-black uppercase text-sp-dark mb-2">{a.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Casos de éxito ── */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>Casos CS2</SectionTag>
          <SectionHeading className="mb-10">
            Resultados <GradientText>verificados</GradientText>
          </SectionHeading>
          <div className="grid md:grid-cols-2 gap-6">
            {CASE_STUDIES.map((c) => (
              <div key={c.brand} className="rounded-2xl border border-sp-border bg-white p-8">
                <div className="font-display text-4xl font-black text-sp-dark mb-1">{c.stat}</div>
                <div className="font-display text-sm font-bold uppercase text-sp-orange mb-3">{c.brand}</div>
                <p className="text-sm text-sp-muted leading-relaxed">{c.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-sp-muted mt-6">
            Más casos en{' '}
            <Link href="/casos" className="text-sp-orange hover:underline">socialpro.es/casos</Link>.
          </p>
        </div>
      </section>

      {/* ── Ver talentos CS2 ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionTag>Nuestros Streamers CS2</SectionTag>
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark mb-4">
            Creadores especializados en Counter-Strike 2
          </h2>
          <p className="text-sp-muted mb-8 max-w-xl mx-auto">
            Desde pro players y semi-pros hasta creadores de contenido táctico.
            Audiencias verificadas con engagement real en la comunidad CS2.
          </p>
          <Link
            href="/talentos"
            className="inline-block border border-sp-border text-sp-dark font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-sp-orange hover:text-sp-orange transition-colors"
          >
            Ver roster completo
          </Link>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <SectionTag>Empieza ahora</SectionTag>
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-white mb-4">
            Activa tu campaña <span style={g}>CS2</span> en 72h
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Cuéntanos tu producto, objetivo y mercado. Diseñamos una propuesta con streamers
            CS2 seleccionados, código de tracking único y plan de activación en 48 horas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contacto?type=brand"
              className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Solicitar propuesta CS2
            </Link>
            <Link
              href="/servicios/igaming"
              className="inline-block border border-white/20 text-white/70 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors"
            >
              Campañas iGaming →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
