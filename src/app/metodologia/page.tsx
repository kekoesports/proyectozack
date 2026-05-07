import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Metodología de Campañas Gaming',
  description:
    'Discovery, matching, ejecución y reporting. Proceso en 4 fases con KPIs claros, compliance iGaming y ROI demostrable en cada campaña gaming.',
  alternates: {
    canonical: '/metodologia',
  },
  openGraph: {
    title: 'Metodología de Campañas Gaming | SocialPro',
    description:
      'Discovery, matching, ejecución y reporting. 4 fases con KPIs claros, compliance iGaming y ROI demostrable.',
    url: absoluteUrl('/metodologia'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Metodología de Campañas Gaming | SocialPro',
    description:
      'Discovery, matching, ejecución y reporting. 4 fases con compliance iGaming y ROI demostrable.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const PHASES = [
  {
    num: '01',
    title: 'Discovery',
    desc: 'Analizamos tu marca, audiencia objetivo, competencia y objetivos de negocio. Definimos KPIs claros antes de empezar.',
    details: [
      'Auditoría de marca y posicionamiento',
      'Análisis de audiencia target',
      'Benchmark competitivo',
      'Definición de KPIs y objetivos',
    ],
  },
  {
    num: '02',
    title: 'Matching',
    desc: 'Seleccionamos creadores cuya audiencia y estilo encajan con tu marca. No hacemos spam — elegimos perfiles verificados.',
    details: [
      'Base de datos propia de +100 creadores',
      'Verificación de audiencia real',
      'Análisis de engagement rate',
      'Fit de marca y valores',
    ],
  },
  {
    num: '03',
    title: 'Ejecución',
    desc: 'Coordinamos la campaña de principio a fin: briefings, revisiones, calendarios, compliance y publicación.',
    details: [
      'Briefing personalizado por creador',
      'Revisión de contenido pre-publicación',
      'Compliance iGaming integrado',
      'Coordinación multicanal',
    ],
  },
  {
    num: '04',
    title: 'Reporting',
    desc: 'Entregamos reportes con métricas reales: alcance, engagement, conversiones y ROI. Sin vanity metrics.',
    details: [
      'Dashboard de métricas en tiempo real',
      'Informe de campaña con datos verificados',
      'Análisis de ROI por creador',
      'Recomendaciones para siguientes campañas',
    ],
  },
];

const KPIS = [
  { label: 'Alcance', desc: 'Impresiones y reach real de la campaña' },
  { label: 'Engagement Rate', desc: 'Interacciones vs. impresiones — no vanity metrics' },
  { label: 'Conversiones', desc: 'FTDs, clicks, registros trackeados por código' },
  { label: 'ROI', desc: 'Retorno sobre inversión con datos verificables' },
  { label: 'Brand Sentiment', desc: 'Percepción de marca pre vs. post campaña' },
  { label: 'Retention', desc: 'Valor a largo plazo de los usuarios captados' },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Cuál es el proceso de trabajo de SocialPro para campañas gaming?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Trabajamos en 4 fases: Discovery (análisis de marca y objetivos), Matching (selección de creadores verificados), Ejecución (coordinación completa con compliance iGaming) y Reporting (métricas reales con ROI demostrable). La activación es en menos de 72 horas.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué métricas medís en las campañas de influencer marketing gaming?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Medimos alcance real, engagement rate (sin vanity metrics), conversiones trackeadas por código (FTDs, registros, clicks), ROI con datos verificables, brand sentiment y retención a largo plazo.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo seleccionáis a los streamers para cada campaña?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'En la fase Matching verificamos audiencia real, engagement rate y fit de marca de cada creador. Contamos con una base de datos propia de más de 100 creadores gaming en España y LatAm. Seleccionamos únicamente perfiles que encajan con la audiencia objetivo del cliente.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Incluís compliance legal para campañas iGaming?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, el compliance iGaming está integrado en nuestra fase de Ejecución. Adaptamos cada campaña a la normativa de España, LatAm y Turquía, incluyendo disclaimers de juego responsable, verificación de edad y cumplimiento de regulaciones publicitarias locales.',
      },
    },
  ],
};

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': absoluteUrl('/metodologia'),
  name: 'Cómo ejecutamos campañas de influencer marketing gaming',
  description:
    'Proceso probado en 4 fases para campañas de influencer marketing gaming con ROI demostrable. Discovery, matching, ejecución y reporting.',
  inLanguage: 'es',
  publisher: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  step: PHASES.map((phase) => ({
    '@type': 'HowToStep',
    name: phase.title,
    text: phase.desc,
    itemListElement: phase.details.map((d) => ({
      '@type': 'HowToDirection',
      text: d,
    })),
  })),
};

export default function MetodologiaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      {/* ── Hero ── */}
      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionTag>Metodología</SectionTag>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Proceso probado, <GradientText>resultados medibles</GradientText>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            No vendemos promesas. Ejecutamos campañas con un proceso estructurado que garantiza
            transparencia y ROI demostrable en cada fase.
          </p>
        </div>
      </section>

      {/* ── Process phases ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <SectionTag>El proceso</SectionTag>
          <SectionHeading>4 fases, resultados reales</SectionHeading>

          <div className="mt-12 space-y-12">
            {PHASES.map((phase) => (
              <div
                key={phase.num}
                className="flex flex-col md:flex-row gap-8 items-start"
              >
                {/* Number */}
                <div className="font-display text-6xl font-black gradient-text leading-none shrink-0 w-20">
                  {phase.num}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-display text-2xl font-black uppercase text-sp-dark mb-3">
                    {phase.title}
                  </h3>
                  <p className="text-base text-sp-muted leading-relaxed mb-4">
                    {phase.desc}
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {phase.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm text-sp-muted">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sp-orange shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KPIs we measure ── */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <SectionTag>Métricas</SectionTag>
          <SectionHeading>Lo que medimos</SectionHeading>
          <p className="text-sp-muted mt-3 mb-10 max-w-xl">
            Cada campaña se evalúa con datos concretos. Nada de capturas de pantalla — reportes verificados.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {KPIS.map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-2xl p-6 border border-sp-border">
                <h3 className="font-display text-lg font-bold uppercase text-sp-dark mb-2">
                  {kpi.label}
                </h3>
                <p className="text-sm text-sp-muted leading-relaxed">{kpi.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-4">
            ¿Listo para resultados reales?
          </h2>
          <p className="text-sp-muted mb-8">
            Cuéntanos tu proyecto y diseñamos una propuesta a medida.
          </p>
          <Link
            href="/#contacto"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Hablemos de tu campaña
          </Link>
        </div>
      </section>
    </>
  );
}
