import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Betting Influencers & Casino Streamers — Apuestas y Casino Online',
  description:
    'Betting influencers y casino streamers verificados en España y LatAm. Campañas para casas de apuestas y casinos online con FTD tracking y ROI demostrable.',
  alternates: {
    // Canonical apunta al ganador del cluster betting/iGaming (EN x-default)
    canonical: '/betting-influencers',
  },
  openGraph: {
    title: 'Betting Influencers & Casino Streamers | SocialPro',
    description:
      'Streamers verificados para casas de apuestas y casinos online. FTD tracking, compliance DGOJ y activación en <72h en España y LatAm.',
    url: absoluteUrl('/gaming/betting'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Betting Influencers & Casino Streamers | SocialPro',
    description:
      'Betting influencers y casino streamers verificados. FTD tracking y compliance DGOJ en España y LatAm.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Betting Influencers y Casino Streamers',
  serviceType: 'iGaming Influencer Marketing',
  provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  areaServed: [
    { '@type': 'Country', name: 'España' },
    { '@type': 'Country', name: 'México' },
    { '@type': 'Country', name: 'Argentina' },
    { '@type': 'Country', name: 'Colombia' },
    { '@type': 'Country', name: 'Chile' },
    { '@type': 'Country', name: 'Turquía' },
  ],
  description:
    'Campañas de influencer marketing para casas de apuestas y casinos online con streamers verificados en España, LatAm y Turquía. Compliance DGOJ, FTD tracking y reporting verificado.',
};


const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Gaming', item: `${SITE_URL}/gaming` },
    { '@type': 'ListItem', position: 3, name: 'Betting Influencers', item: `${SITE_URL}/gaming/betting` },
  ],
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

const STATS = [
  { stat: '+340',  label: 'FTDs en una sola activación' },
  { stat: '200K€', label: 'Conversiones SkinsMonkey' },
  { stat: '8M+',   label: 'Reach campaña 1WIN' },
  { stat: '<72h',  label: 'De briefing a campaña activa' },
];

const PROFILES = [
  {
    type: 'Betting Influencer',
    desc: 'Streamers especializados en apuestas deportivas. Cubren fútbol, MMA, esports betting y eventos en directo. Audiencias muy segmentadas con alta intención de apuesta.',
    examples: 'Apuestas deportivas, esports betting, apuestas en vivo',
  },
  {
    type: 'Casino Streamer',
    desc: 'Creadores de contenido dedicados a slots, ruleta y juegos de casino online. Sesiones en directo con audiencias gaming de alta fidelidad y propensión al depósito.',
    examples: 'Slots, ruleta, blackjack, casino en vivo',
  },
  {
    type: 'CS2 Skin Trading',
    desc: 'Streamers del ecosistema CS2 con audiencias familiarizadas con transacciones digitales y plataformas de intercambio. Alta conversión en skins, casos y iGaming.',
    examples: 'Skins CS2, casas de casos, skin trading platforms',
  },
];

const CASE_STUDIES = [
  {
    brand: 'SkinsMonkey',
    stat: '200K€',
    label: 'en conversiones directas',
    detail: 'Campaña de 6 semanas con código de referido trazado end-to-end. 200.000€ en transacciones atribuidas directamente a streamers de SocialPro. ROI positivo desde la primera semana.',
  },
  {
    brand: '1WIN',
    stat: '8M+',
    label: 'de reach en campaña',
    detail: 'Activación multiterritorio con más de 100 streamers en España, México, Argentina y Colombia. Campaña integrada en torneo de CS2 con picos de audiencia superiores a 500K espectadores.',
  },
];

export default function BettingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      {/* ── Hero ── */}
      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionTag>Betting Influencers · Casino Streamers</SectionTag>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Streamers de Apuestas <GradientText>y Casino Online</GradientText>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Betting influencers y casino streamers verificados en España, LatAm y Turquía.
            FTD tracking real, compliance DGOJ y activación en menos de 72 horas.
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
            Activar campaña de betting
          </Link>
        </div>
      </section>

      {/* ── Perfiles disponibles ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <SectionTag>Tipos de creadores</SectionTag>
          <SectionHeading className="mb-10">
            Tres perfiles de <GradientText>betting influencers</GradientText>
          </SectionHeading>
          <div className="grid md:grid-cols-3 gap-6">
            {PROFILES.map((p) => (
              <div key={p.type} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-2">{p.type}</h3>
                <p className="text-sm text-sp-muted leading-relaxed mb-3">{p.desc}</p>
                <p className="text-[11px] text-sp-orange font-semibold uppercase tracking-wide">{p.examples}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Casos de éxito ── */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>Track Record Betting</SectionTag>
          <SectionHeading className="mb-10">
            Conversiones <GradientText>verificadas</GradientText>
          </SectionHeading>
          <div className="grid md:grid-cols-2 gap-6">
            {CASE_STUDIES.map((c) => (
              <div key={c.brand} className="rounded-2xl border border-sp-border bg-white p-8">
                <div className="font-display text-4xl font-black text-sp-dark mb-0.5">{c.stat}</div>
                <div className="text-sm text-sp-muted mb-2">{c.label}</div>
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

      {/* ── Diferencia con agencias generalistas ── */}
      <section className="bg-sp-black py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>Por qué SocialPro</SectionTag>
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase tracking-tight text-white leading-tight mb-8">
            No somos una <span style={g}>agencia generalista</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { t: 'Compliance real', d: 'DGOJ, normativa LatAm y regulación turca. Cada campaña de betting incluye revisión legal, disclaimers y verificación de audiencia.' },
              { t: 'FTD tracking verificado', d: 'Cada conversión se atribuye al creador que la generó. Reportes con datos reales, no estimaciones.' },
              { t: '4+ años en iGaming', d: 'Llevamos desde 2020 ejecutando campañas de betting y casino con streamers en el mercado hispano.' },
              { t: 'Activación < 72h', d: 'De briefing a campaña activa en menos de tres días. Creadores verificados listos para activar.' },
            ].map(({ t, d }) => (
              <div key={t} className="border border-white/10 rounded-2xl p-6">
                <h3 className="font-display text-base font-black uppercase text-white mb-2">{t}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <SectionTag>Empieza ahora</SectionTag>
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark mb-4">
            Activa tus betting influencers en 72h
          </h2>
          <p className="text-sp-muted mb-8 max-w-xl mx-auto">
            Cuéntanos tu operador, mercado objetivo y presupuesto. Diseñamos una propuesta
            con streaming talents verificados, compliance incluido y FTD tracking desde el día uno.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contacto?type=brand"
              className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Solicitar propuesta
            </Link>
            <Link
              href="/servicios/igaming"
              className="inline-block border border-sp-border text-sp-dark font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-sp-orange hover:text-sp-orange transition-colors"
            >
              Ver compliance iGaming →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
