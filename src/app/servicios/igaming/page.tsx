import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Agencia de Campañas iGaming España',
  description:
    'Campañas iGaming con streamers verificados en España y LatAm. Compliance, FTD tracking y ROI demostrable. Especialistas en iGaming para operadores.',
  alternates: {
    canonical: '/servicios/igaming',
  },
  openGraph: {
    title: 'Agencia de Campañas iGaming España | SocialPro',
    description:
      'Campañas iGaming con streamers verificados en España y LatAm. Compliance, FTD tracking y ROI demostrable.',
    url: absoluteUrl('/servicios/igaming'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia de Campañas iGaming España | SocialPro',
    description:
      'Campañas iGaming con streamers verificados. Compliance DGOJ, FTD tracking y ROI demostrable.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Campañas iGaming con Streamers',
  serviceType: 'iGaming Influencer Marketing',
  provider: {
    '@type': 'Organization',
    name: 'SocialPro',
    url: SITE_URL,
  },
  areaServed: [
    { '@type': 'Country', name: 'España' },
    { '@type': 'Country', name: 'México' },
    { '@type': 'Country', name: 'Argentina' },
    { '@type': 'Country', name: 'Colombia' },
    { '@type': 'Country', name: 'Chile' },
  ],
  description:
    'Diseño y ejecución de campañas de influencer marketing iGaming para operadores con licencia en España y LatAm. Compliance regulatorio integrado, selección de talentos verificados y reporting con FTDs rastreados.',
};

const PROCESS_STEPS = [
  {
    num: '01',
    title: 'Vetting de creadores',
    desc: 'Verificamos audiencia real, historial de compliance y fit demográfico antes de cualquier activación. No trabajamos con creadores sin track record verificado.',
  },
  {
    num: '02',
    title: 'Briefing legal',
    desc: 'Cada campaña incluye un briefing de compliance adaptado a la regulación vigente: disclaimers obligatorios, restricciones de mensaje y verificación de mayores de 18.',
  },
  {
    num: '03',
    title: 'Revisión pre-publicación',
    desc: 'Revisamos cada pieza de contenido antes de su publicación. Nada sale sin aprobación del equipo de compliance y de la marca.',
  },
  {
    num: '04',
    title: 'Activación',
    desc: 'De briefing a campaña en marcha en menos de 72 horas. Coordinamos streamers, calendarios, overlays y códigos de tracking únicos por creador.',
  },
  {
    num: '05',
    title: 'FTD tracking',
    desc: 'Cada conversión —registro, depósito, FTD— se atribuye con precisión al creador que la generó. Reportes verificados, no capturas de pantalla.',
  },
];

const CASE_STUDIES = [
  {
    brand: '1WIN',
    stat: '8M+ reach',
    detail: 'Campaña multiterrritorio con más de 100 streamers activados en simultáneo. Presencia en España, México, Argentina y Colombia durante el torneo de CS2.',
  },
  {
    brand: 'SkinsMonkey',
    stat: '200K€ conversiones',
    detail: 'Campaña de 6 semanas con código de referido trazado end-to-end. 200.000€ en transacciones atribuidas directamente a los streamers de SocialPro.',
  },
];

const COMPLIANCE_ITEMS = [
  'Disclaimer de juego responsable visible en los primeros 30 segundos del contenido patrocinado',
  'Prohibición de asociar iGaming con resolución de deudas o promesas de enriquecimiento',
  'Verificación documental de que el streamer es mayor de 18 años',
  'Restricción de contenido iGaming en streams con audiencia mayoritariamente menor de edad',
  'El operador es corresponsable del contenido del creator — revisión previa es obligatoria',
  'Distinción clara entre publicidad y contenido editorial en todas las plataformas',
];

const gradientTextStyle = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

export default function IgamingPage() {
  return (
    <>
      {/* JSON-LD: Service schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ── */}
      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionTag>iGaming Influencer Marketing</SectionTag>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Campañas iGaming con <GradientText>Streamers que Convierten</GradientText>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Diseño y ejecución de campañas para operadores iGaming con licencia en España y LatAm.
            Compliance integrado, talentos verificados y FTDs rastreados en cada activación.
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-center mb-10">
            {[
              { stat: '+340', label: 'FTDs en una sola activación' },
              { stat: '8M+', label: 'Reach en campaña 1WIN' },
              { stat: '200K€', label: 'Conversiones SkinsMonkey' },
              { stat: '<72h', label: 'De briefing a campaña activa' },
            ].map(({ stat, label }) => (
              <div key={label}>
                <div className="font-display text-3xl font-black" style={gradientTextStyle}>
                  {stat}
                </div>
                <div className="text-sm text-white/50 mt-1 max-w-[140px]">{label}</div>
              </div>
            ))}
          </div>
          <Link
            href="/#contacto"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Lanza tu campaña iGaming
          </Link>
        </div>
      </section>

      {/* ── Why iGaming is different ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>Por qué el iGaming es diferente</SectionTag>
          <SectionHeading className="mb-6">
            No es un vertical más. <GradientText>Es el más complejo.</GradientText>
          </SectionHeading>
          <div className="space-y-4 text-base text-sp-muted leading-relaxed max-w-2xl">
            <p>
              El iGaming —casas de apuestas, casinos online, eSports betting, skin trading— tiene
              una regulación específica que afecta directamente a cómo se puede comunicar en streaming.
              Un briefing genérico de influencer marketing no funciona aquí: cualquier error en el
              mensaje puede acarrear sanciones al operador y daño reputacional al creador.
            </p>
            <p>
              En SocialPro llevamos más de cuatro años ejecutando campañas iGaming en España, LatAm
              y Turquía. Conocemos la regulación DGOJ, las diferencias entre mercados, qué puede
              decir un streamer y qué no, y cómo construir un flujo de revisión de contenido que
              proteja a todas las partes sin ralentizar la activación.
            </p>
            <p>
              El resultado: campañas que cumplen desde el día uno, con creadores que entienden el
              producto y audiencias que convierten de verdad.
            </p>
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>Nuestro proceso</SectionTag>
          <SectionHeading className="mb-10">
            Cómo ejecutamos campañas <GradientText>iGaming</GradientText>
          </SectionHeading>
          <div className="space-y-8">
            {PROCESS_STEPS.map((step) => (
              <div key={step.num} className="flex gap-6 items-start">
                <div className="font-display text-3xl font-black leading-none shrink-0 w-12" style={gradientTextStyle}>
                  {step.num}
                </div>
                <div>
                  <h3 className="font-display text-lg font-black uppercase text-sp-dark mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-sp-muted leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case studies ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>Track Record iGaming</SectionTag>
          <SectionHeading className="mb-10">
            Resultados que <GradientText>hablan por sí solos</GradientText>
          </SectionHeading>
          <div className="grid md:grid-cols-2 gap-6">
            {CASE_STUDIES.map((c) => (
              <div key={c.brand} className="rounded-2xl border border-sp-border bg-sp-off p-8">
                <div className="font-display text-4xl font-black text-sp-dark mb-1">{c.stat}</div>
                <div className="font-display text-sm font-bold uppercase text-sp-orange mb-3">
                  {c.brand}
                </div>
                <p className="text-sm text-sp-muted leading-relaxed">{c.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-sp-muted mt-6">
            Más casos en{' '}
            <Link href="/casos" className="text-sp-orange hover:underline">
              socialpro.es/casos
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Compliance ── */}
      <section className="bg-sp-black py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>Compliance España 2025</SectionTag>
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase tracking-tight text-white leading-tight mb-4">
            Lo que exige la <span style={gradientTextStyle}>regulación española</span>
          </h2>
          <p className="text-white/60 mb-8 max-w-2xl">
            La DGOJ regula estrictamente la publicidad de operadores iGaming en España. Estas son
            las obligaciones que SocialPro garantiza en cada campaña:
          </p>
          <ul className="space-y-3">
            {COMPLIANCE_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-sp-orange shrink-0" />
                <span className="text-sm text-white/70 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <SectionTag>Empieza ahora</SectionTag>
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark mb-4">
            Lanza tu campaña iGaming con SocialPro
          </h2>
          <p className="text-sp-muted mb-8 max-w-xl mx-auto">
            Cuéntanos tu producto, tu objetivo de conversión y el mercado al que apuntas.
            Diseñamos una propuesta en 48 horas con creadores seleccionados y plan de compliance incluido.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/#contacto"
              className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Contactar ahora
            </Link>
            <Link
              href="/talentos"
              className="inline-block border border-sp-border text-sp-dark font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-sp-orange hover:text-sp-orange transition-colors"
            >
              Ver talentos disponibles
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
