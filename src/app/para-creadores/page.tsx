import type { Metadata } from 'next';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { CreatorApplyForm } from '@/features/contact/components/CreatorApplyForm';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Gestión y Patrocinios para Streamers',
  description:
    'Únete al roster de SocialPro. Conseguimos patrocinios con las mejores marcas de iGaming, hardware y entretenimiento para streamers en España y LatAm.',
  alternates: {
    canonical: '/para-creadores',
  },
  openGraph: {
    title: 'Gestión y Patrocinios para Streamers | SocialPro',
    description:
      'Únete al roster de SocialPro. Patrocinios con las mejores marcas de iGaming, hardware y entretenimiento para streamers en España y LatAm.',
    url: absoluteUrl('/para-creadores'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestión y Patrocinios para Streamers | SocialPro',
    description:
      'Únete al roster de SocialPro. Patrocinios reales con marcas top de iGaming y hardware.',
    images: [absoluteUrl('/og-default.jpg')],
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
  'Red de +13 creadores para collabs y networking',
  'Compliance y protección legal en campañas iGaming',
];

export default function ParaCreadoresPage() {
  return (
    <>
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

      {/* ── Apply Form ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-6">
          <SectionTag>Aplica ahora</SectionTag>
          <SectionHeading>Únete al roster</SectionHeading>
          <p className="text-sp-muted mt-3 mb-8">
            Completa el formulario y nuestro equipo se pondrá en contacto contigo en 48 horas.
          </p>
          <CreatorApplyForm />
        </div>
      </section>
    </>
  );
}
