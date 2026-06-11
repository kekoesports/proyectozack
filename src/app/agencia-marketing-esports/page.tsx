import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { StickyCtaMobile } from '@/components/ui/StickyCtaMobile';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';

export const metadata: Metadata = {
  title: 'Agencia de Marketing Esports — España y LatAm',
  description:
    'Agencia de marketing esports con 13+ años en España y LatAm. Campañas con influencers, gestión de talentos gaming y activaciones en torneos para marcas endémicas y no endémicas.',
  alternates: {
    canonical: '/agencia-marketing-esports',
    languages: {
      es: absoluteUrl('/agencia-marketing-esports'),
      en: absoluteUrl('/esports-marketing-agency'),
      'x-default': absoluteUrl('/agencia-marketing-esports'),
    },
  },
  openGraph: {
    title: 'Agencia de Marketing Esports España y LatAm | SocialPro',
    description: 'Marketing esports en España y LatAm. 13+ años, 15M+ views/mes, campañas medibles para marcas endémicas y no endémicas.',
    url: absoluteUrl('/agencia-marketing-esports'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Agencia de Marketing Esports España y LatAm — SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia Marketing Esports | SocialPro',
    description: 'Agencia de marketing esports en España y LatAm. 13+ años, performance-focused.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'SocialPro — Agencia de Marketing Esports',
  serviceType: 'Esports Marketing Agency',
  inLanguage: 'es',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  foundingDate: '2012',
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'],
  description: 'Agencia de marketing esports en España y LatAm desde 2012. Campañas con influencers, gestión de talentos y activaciones en torneos con métricas verificadas.',
};


const STATS = [
  { stat: '13+', label: 'Años en marketing esports' },
  { stat: '15M+', label: 'Views mensuales en el roster' },
  { stat: '3', label: 'Mercados activos (ES, LatAm, TR)' },
  { stat: '100+', label: 'Activaciones ejecutadas' },
];

const SERVICIOS = [
  { title: 'Campañas con influencers', desc: 'Activaciones con streamers y creadores gaming para awareness, lanzamientos de producto y campañas de conversión. Cada creador verificado, cada métrica rastreada.' },
  { title: 'Patrocinio de torneos', desc: 'Integración de marca en torneos esports: overlays personalizados, menciones en directo, spots pre-partido y activaciones de experiencia de marca.' },
  { title: 'Gestión de talentos', desc: 'Representación y gestión de creadores gaming: negociación de contratos, estrategia de contenido, patrocinios y crecimiento de canal. Gestionamos la relación para que marca y creador se centren en resultados.' },
  { title: 'iGaming × esports', desc: 'Campañas especializadas que combinan audiencias esports con mecánicas iGaming. Torneos CS2 con integración de apuestas, FTD tracking y compliance DGOJ incluido.' },
];

const DIFERENCIAS = [
  { t: 'Especialización real', d: '13+ años exclusivamente en gaming y esports. No somos generalistas con una práctica gaming. Somos gaming.' },
  { t: 'Performance marketing', d: 'Cada campaña tiene KPIs de negocio claros. Medimos conversiones, no solo alcance. Sin vanity metrics.' },
  { t: 'El mercado hispano', d: 'España y LatAm representan una de las comunidades gaming más grandes del mundo. Nuestros creadores dan acceso directo y auténtico.' },
];

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: 'Agencia Marketing Esports', url: absoluteUrl('/agencia-marketing-esports') },
]);

export default function AgenciaMarketingEsportsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      <section className="bg-sp-black pt-24 pb-12 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Agencia de Marketing Esports</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Agencia de Marketing Esports —<br /><span style={g}>Nativos del Gaming. Enfocados en Performance.</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            No somos una agencia generalista que añadió «esports» al portfolio. Construida exclusivamente
            en gaming, esports e iGaming. Conocemos los creadores, las audiencias y los matices regulatorios.
            Cada activación medible, cada métrica auditable.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            {STATS.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-xs text-white/40 mt-1 max-w-[130px]">{label}</div>
              </div>
            ))}
          </div>
          <TrackedCtaLink href="/contacto?type=brand" ctaId="landing_esports_es_hero" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">
            Diseñamos tu campaña en esports
          </TrackedCtaLink>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Servicios</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">Marketing esports de espectro completo</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {SERVICIOS.map((s) => (
              <div key={s.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{s.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sp-black py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Por qué SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-white mb-8">No somos una agencia generalista</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {DIFERENCIAS.map(({ t, d }) => (
              <div key={t} className="border border-white/10 rounded-2xl p-5">
                <h3 className="font-display text-sm font-black uppercase text-white mb-2">{t}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-4">¿Listo para entrar en <span style={g}>esports?</span></h2>
          <p className="text-sp-muted mb-8">Seas una marca endémica o estés entrando en esports por primera vez, construimos la activación correcta para tus objetivos y audiencia.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto?type=brand" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Solicitar propuesta</Link>
            <Link href="/esports-marketing-agency" className="inline-block border border-sp-border text-sp-dark font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-sp-orange hover:text-sp-orange transition-colors">English version →</Link>
          </div>
        </div>
      </section>

      <StickyCtaMobile href="/contacto?type=brand" label="Solicitar propuesta" ctaId="sticky_esports_es_mobile" />
    </>
  );
}
