import type { Metadata } from 'next';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { CreatorApplyForm } from '@/features/contact/components/CreatorApplyForm';
import { absoluteUrl } from '@/lib/site-url';
import { safeJsonLd } from '@/lib/safeJsonLd';

export const metadata: Metadata = {
  title: 'Gestión y Patrocinios para Streamers',
  description:
    '¿Eres streamer o youtuber gaming? Únete al roster de SocialPro y consigue patrocinios reales de iGaming, hardware y esports en España y LatAm. Aplica gratis →',
  alternates: {
    canonical: '/para-creadores',
  },
  openGraph: {
    title: 'Gestión y Patrocinios para Streamers | SocialPro',
    description:
      '¿Eres streamer gaming? Únete al roster de SocialPro y consigue patrocinios reales de iGaming, hardware y esports en España y LatAm.',
    url: absoluteUrl('/para-creadores'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Gestión y Patrocinios para Streamers Gaming — SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestión y Patrocinios para Streamers | SocialPro',
    description:
      '¿Eres streamer gaming? Únete al roster de SocialPro y consigue patrocinios reales de iGaming y hardware.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const STEPS = [
  {
    num: '01',
    title: 'Aplica',
    desc: 'Completa el formulario con tu perfil y estadísticas. Analizamos cada aplicación individualmente.',
  },
  {
    num: '02',
    title: 'Evaluación',
    desc: 'Nuestro equipo revisa tu contenido, audiencia y potencial de monetización en 48h.',
  },
  {
    num: '03',
    title: 'Onboarding',
    desc: 'Si encajas, te presentamos oportunidades activas y diseñamos un plan de crecimiento personalizado.',
  },
  {
    num: '04',
    title: 'Monetización',
    desc: 'Empiezas a recibir campañas de marcas top. Nosotros negociamos, tú creas contenido.',
  },
];

const BENEFITS = [
  'Acceso a marcas premium de iGaming, periféricos y lifestyle',
  'Negociación profesional — nosotros cerramos los acuerdos',
  'Soporte en YouTube management y producción de contenido',
  'Red de +100 creadores para collabs y networking en España y LATAM',
  'Compliance y protección legal en campañas iGaming',
];

const LATAM_MARKETS = [
  { flag: '🇲🇽', country: 'México',    desc: 'Mayor mercado gaming LATAM' },
  { flag: '🇦🇷', country: 'Argentina', desc: 'Escena CS2 muy activa' },
  { flag: '🇨🇴', country: 'Colombia',  desc: 'iGaming en expansión' },
  { flag: '🇨🇱', country: 'Chile',     desc: 'Alta penetración digital' },
  { flag: '🇵🇪', country: 'Perú',      desc: 'Mercado emergente gaming' },
];

export default function ParaCreadoresPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': absoluteUrl('/para-creadores'),
        url: absoluteUrl('/para-creadores'),
        name: 'Gestión y Patrocinios para Streamers | SocialPro',
        description:
          '¿Eres streamer o youtuber gaming? Únete al roster de SocialPro y consigue patrocinios reales de iGaming, hardware y esports en España y LatAm.',
        publisher: { '@type': 'Organization', name: 'SocialPro', url: absoluteUrl('/') },
      },
      {
        '@type': 'HowTo',
        name: 'Cómo unirte al roster de SocialPro como creador gaming',
        description:
          'Proceso de aplicación para streamers y youtubers que quieren conseguir patrocinios profesionales en iGaming y esports.',
        step: STEPS.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.title,
          text: s.desc,
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {/* ── Hero ── */}
      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionTag>Para Creadores</SectionTag>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Monetiza tu audiencia con <GradientText>las mejores marcas</GradientText>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            SocialPro conecta creadores de contenido gaming con campañas reales de marcas top.
            Sin intermediarios innecesarios. Sin complicaciones.
          </p>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>Por qué SocialPro</SectionTag>
          <SectionHeading>Lo que ofrecemos a nuestros creadores</SectionHeading>
          <ul className="mt-8 space-y-4">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sp-orange shrink-0" />
                <span className="text-base text-sp-muted leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Process ── */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>Proceso</SectionTag>
          <SectionHeading>Cómo funciona</SectionHeading>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {STEPS.map((step) => (
              <div key={step.num} className="bg-white rounded-2xl p-6 border border-sp-border">
                <div className="font-display text-3xl font-black gradient-text mb-3">{step.num}</div>
                <h3 className="font-display text-lg font-bold uppercase text-sp-dark mb-2">{step.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LATAM ── */}
      <section className="bg-sp-black py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <SectionTag>¿Eres de LATAM?</SectionTag>
          <SectionHeading className="text-white">
            Gestionamos creadores en <GradientText>México, Argentina, Colombia y más</GradientText>
          </SectionHeading>
          <p className="text-white/60 mt-4 mb-10 max-w-2xl leading-relaxed">
            SocialPro tiene presencia activa en LATAM. Nuestro manager dedicado
            gestiona deals en euros y dólares para creadores de CS2, iGaming y gaming general.
            Si estás en España o LATAM, el proceso de aplicación es el mismo.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
            {LATAM_MARKETS.map(({ flag, country, desc }) => (
              <div key={country} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-center">
                <div className="text-3xl mb-2">{flag}</div>
                <div className="font-bold text-white text-sm mb-1">{country}</div>
                <div className="text-[11px] text-white/40 leading-snug">{desc}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-white mb-1">Deals internacionales en euros y dólares</p>
              <p className="text-sm text-white/50">Hemos cerrado campañas con 1WIN, SkinsMonkey y RAZER para creadores en México, Argentina y Colombia.</p>
            </div>
            <a href="#aplica" className="shrink-0 px-6 py-3 rounded-full text-sm font-bold text-white uppercase tracking-wider bg-sp-grad hover:opacity-90 transition-opacity">
              Aplica desde LATAM →
            </a>
          </div>
        </div>
      </section>

      {/* ── Apply Form ── */}
      <section id="aplica" className="bg-white py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-6">
          <SectionTag>Aplica ahora</SectionTag>
          <SectionHeading>Únete al roster</SectionHeading>
          <p className="text-sp-muted mt-3 mb-8">
            Completa el formulario y nuestro equipo se pondrá en contacto contigo en 48 horas.
            Abierto a creadores de España y toda LATAM.
          </p>
          <CreatorApplyForm />
        </div>
      </section>
    </>
  );
}
