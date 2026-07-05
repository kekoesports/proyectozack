import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { StickyCtaMobile } from '@/components/ui/StickyCtaMobile';

export const metadata: Metadata = {
  title: 'Influencers CS2 España y LatAm — Marketing con Streamers CS2',
  description:
    'Influencers CS2 verificados para campañas de marketing en España y LatAm. Streamers de Counter-Strike 2 con audiencias reales, FTD tracking y activación en menos de 72h.',
  alternates: {
    canonical: '/influencers-cs2',
    languages: {
      es: absoluteUrl('/influencers-cs2'),
      en: absoluteUrl('/cs2-influencer-marketing'),
      'x-default': absoluteUrl('/influencers-cs2'),
    },
  },
  openGraph: {
    title: 'Influencers CS2 España y LatAm | SocialPro',
    description: 'Streamers CS2 verificados en España y LatAm. FTD tracking, audiencias reales y activación en menos de 72 horas.',
    url: absoluteUrl('/influencers-cs2'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Influencers CS2 España y LatAm — SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Influencers CS2 España y LatAm | SocialPro',
    description: 'Streamers CS2 verificados. FTD tracking y activación en <72h en España y LatAm.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Influencers CS2 España y LatAm',
  serviceType: 'CS2 Influencer Marketing',
  inLanguage: 'es',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'],
  description: 'Campañas con influencers CS2 verificados en España y LatAm. FTD tracking, audiencias reales y activación en menos de 72 horas.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: 'Servicios', url: absoluteUrl('/servicios') },
  { name: 'Influencers CS2', url: absoluteUrl('/influencers-cs2') },
]);

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Por qué SocialPro es la agencia especializada en influencers CS2 para el mercado hispano?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SocialPro lleva más de cuatro años ejecutando campañas con streamers de CS2 en España y LatAm. Esto significa que cuando un operador de iGaming, una marca de hardware o una plataforma de skins quiere activar en el ecosistema hispanohablante de CS2, SocialPro no necesita construir el roster desde cero: ya tiene relaciones directas con los creadores, conoce sus tasas de conversión históricas, sabe cuál funciona mejor para cada tipo de producto y entiende las diferencias de audiencia entre un streamer de Madrid, uno de Buenos Aires y uno de Ciudad de México. La escena CS2 en español no es un segmento genérico de gaming — es una comunidad con sus propios códigos, plataformas preferidas y ciclos de gasto que SocialPro conoce desde dentro.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué resultados verificados han generado los influencers CS2 de SocialPro?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Los datos de las campañas CS2 de SocialPro proceden directamente de los paneles de los operadores y plataformas, no de analytics de terceros ni estimaciones de alcance. En la campaña 1WIN (Q1-Q2 2025), 100+ streamers de CS2 hispanohablantes fueron activados en simultáneo durante un torneo internacional, generando 340+ FTDs verificados desde el dashboard de afiliados del operador y un alcance de 8 millones de usuarios en Instagram. En la campaña SkinsMonkey, el código de referido único por creador permitió atribuir 200.000€ en volumen de trading directamente a los streamers de SocialPro, con datos validados desde la plataforma del marketplace. El ROI fue positivo desde la primera semana de activación.',
      },
    },
  ],
};


const STATS = [
  { stat: '8M+', label: 'Reach en campaña 1WIN CS2' },
  { stat: '+340', label: 'FTDs en una sola activación' },
  { stat: '100+', label: 'Streamers en una campaña' },
  { stat: '<72h', label: 'De briefing a campaña activa' },
];

const PORQUES = [
  { title: 'Conocemos la escena CS2 en español', desc: 'No somos una agencia generalista que gestiona CS2. Conocemos los creadores, la cultura y la audiencia hispana del juego desde hace años. Eso se traduce en campañas que encajan de verdad.' },
  { title: 'Audiencia de alta conversión local', desc: 'La comunidad CS2 hispanohablante tiene alta familiaridad con pagos digitales y plataformas de skins. La tasa de conversión para iGaming, periféricos y hardware supera con creces las audiencias gaming generalistas.' },
  { title: 'Activaciones multipaís en simultáneo', desc: 'Cubrimos España, México, Argentina, Colombia y Chile con un único brief. Coordinar campañas en 5 mercados a la vez es nuestro estándar operativo, no una excepción.' },
];

export default function InfluencersCs2Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      <section className="bg-sp-black pt-24 pb-12 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Influencers CS2 · España y LatAm</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Influencers CS2 —<br /><span style={g}>300+ FTDs Verificados por Activación</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Sin estimaciones. Sin capturas de pantalla. Cada FTD atribuido al streamer que lo generó,
            con datos del operador. Activación en menos de 72 horas en España y LatAm.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            {STATS.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-xs text-white/40 mt-1 max-w-[130px]">{label}</div>
              </div>
            ))}
          </div>
          <TrackedCtaLink href="/contacto?type=brand" ctaId="landing_cs2_es_hero" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">
            Encuentra streamers de CS2 para tu campaña
          </TrackedCtaLink>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Por qué SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">¿Por qué SocialPro es la agencia especializada en influencers CS2 para el mercado hispano?</h2>
          <p className="text-base text-sp-muted leading-relaxed mb-10 max-w-3xl">
            SocialPro lleva más de cuatro años ejecutando campañas con streamers de CS2 en España y
            LatAm. Esto significa que cuando un operador de iGaming, una marca de hardware o una
            plataforma de skins quiere activar en el ecosistema hispanohablante de CS2, SocialPro
            no necesita construir el roster desde cero: ya tiene relaciones directas con los
            creadores, conoce sus tasas de conversión históricas, sabe cuál funciona mejor para
            cada tipo de producto y entiende las diferencias de audiencia entre un streamer de
            Madrid, uno de Buenos Aires y uno de Ciudad de México. La escena CS2 en español no es
            un segmento genérico de gaming — es una comunidad con sus propios códigos, plataformas
            preferidas y ciclos de gasto que SocialPro conoce desde dentro.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {PORQUES.map((p) => (
              <div key={p.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{p.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Resultados verificados</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">¿Qué resultados verificados han generado los influencers CS2 de SocialPro?</h2>
          <p className="text-base text-sp-muted leading-relaxed mb-8 max-w-3xl">
            Los datos de las campañas CS2 de SocialPro proceden directamente de los paneles de
            los operadores y plataformas, no de analytics de terceros ni estimaciones de alcance.
            En la campaña 1WIN (Q1-Q2 2025), 100+ streamers de CS2 hispanohablantes fueron
            activados en simultáneo durante un torneo internacional, generando 340+ FTDs
            verificados desde el dashboard de afiliados del operador y un alcance de 8 millones
            de usuarios en Instagram. En la campaña SkinsMonkey, el código de referido único por
            creador permitió atribuir 200.000€ en volumen de trading directamente a los streamers
            de SocialPro, con datos validados desde la plataforma del marketplace. El ROI fue
            positivo desde la primera semana de activación.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">8M+</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">1WIN · Torneo CS2</div>
              <p className="text-sm text-sp-muted leading-relaxed">Campaña multiterritorio con más de 100 streamers activados en simultáneo en España, México, Argentina y Colombia. Integrada en torneo CS2 con picos de audiencia superiores a 500K espectadores en directo.</p>
            </div>
            <div className="bg-white rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">200K€</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">SkinsMonkey · Conversiones rastreadas</div>
              <p className="text-sm text-sp-muted leading-relaxed">Campaña de 6 semanas con código de referido único por streamer. 200.000€ en transacciones atribuidas directamente a creadores CS2 de SocialPro. ROI positivo desde la primera semana.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial cross-linking — silo CS2/iGaming ES */}
      <section className="bg-sp-off border-t border-sp-border py-10">
        <div className="max-w-3xl mx-auto px-6 text-sm text-sp-muted leading-relaxed space-y-3">
          <p>
            Muchos de estos creadores CS2 forman parte del proyecto de{' '}
            <Link href="/apuesta-segura-cs2" className="font-semibold text-sp-orange hover:underline">
              apuestas seguras en Counter-Strike
            </Link>
            {' '}y trabajan campañas dentro de{' '}
            <Link href="/servicios/igaming" className="font-semibold text-sp-orange hover:underline">
              nuestros servicios iGaming
            </Link>
            . Si tu vertical es más amplio, mira la{' '}
            <Link href="/agencia-marketing-esports" className="font-semibold text-sp-orange hover:underline">
              agencia de marketing esports
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">¿Listo para activar tu campaña con <span style={g}>influencers CS2 hispanohablantes?</span></h2>
          <p className="text-white/50 mb-8">Cuéntanos tu producto, objetivo de conversión y mercado. Diseñamos una propuesta con influencers CS2 seleccionados en 48 horas.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto?type=brand" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Solicitar propuesta</Link>
            <Link href="/cs2-influencer-marketing" className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">English version →</Link>
          </div>
        </div>
      </section>

      <StickyCtaMobile href="/contacto?type=brand" label="Solicitar propuesta" ctaId="sticky_cs2_es_mobile" />
    </>
  );
}
