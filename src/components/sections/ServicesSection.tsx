'use client';

import { useState } from 'react';
import * as m from 'motion/react-client';
import { AnimatePresence } from 'motion/react';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import Link from 'next/link';

const SERVICES = [
  {
    id: 'brands',
    label: 'Soy una Marca',
    title: 'Para marcas y anunciantes',
    steps: [
      'Selección del talento ideal para tu audiencia y objetivos.',
      'Briefing y estrategia de campaña conjunta.',
      'Coordinación de producción y publicación.',
      'Tracking de resultados: conversiones, alcance y ROI.',
      'Reporting final con insights accionables.',
    ],
  },
  {
    id: 'talents',
    label: 'Soy Creador',
    title: 'Para creadores de contenido',
    steps: [
      'Gestión de tu marca personal y posicionamiento.',
      'Negociación de contratos con marcas premium.',
      'Producción profesional: edición, thumbnails, estrategia.',
      'Acceso a campañas exclusivas en iGaming y periféricos.',
      'Expansión a nuevas plataformas y mercados.',
    ],
  },
  {
    id: 'youtube',
    label: 'Gestión YouTube',
    title: 'Gestión integral de canal YouTube',
    steps: [
      'Auditoría y optimización SEO del canal.',
      'Estrategia de contenido y calendario editorial.',
      'Producción de vídeos: edición, miniaturas y copywriting.',
      'Gestión de monetización y partnerships.',
      'Analytics mensuales y reporting de crecimiento.',
    ],
  },
];

const PROCESS_STEPS = [
  { num: '01', label: 'BRIEFING' },
  { num: '02', label: 'SELECCIÓN' },
  { num: '03', label: 'ESTRATEGIA' },
  { num: '04', label: 'EJECUCIÓN' },
  { num: '05', label: 'REPORTING' },
];

const ADVANTAGES = [
  {
    title: 'Gaming nativo',
    desc: 'Especialización exclusiva en gaming, esports e iGaming. No somos generalistas.',
  },
  {
    title: 'Activación < 72h',
    desc: 'De briefing a campaña en marcha en menos de tres días.',
  },
  {
    title: 'Conversiones reales',
    desc: 'Tracking end-to-end de cada click, signup y depósito. Sin métricas vanidosas.',
  },
  {
    title: 'Normativa iGaming',
    desc: 'Conocimiento regulatorio en España, LatAm y Turquía. Campañas que cumplen desde el día uno.',
  },
  {
    title: 'Red exclusiva',
    desc: '+15 talentos cualificados con audiencias verificadas y engagement real.',
  },
  {
    title: '3 mercados',
    desc: 'Presencia activa en España, Latinoamérica y Turquía con equipos locales.',
  },
];

export function ServicesSection() {
  const [active, setActive] = useState('brands');
  const current = SERVICES.find((s) => s.id === active) ?? SERVICES[0]!;

  return (
    <section id="servicios" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          <div className="text-center mb-12">
            <SectionTag>Servicios de Marketing Gaming e iGaming</SectionTag>
            <SectionHeading>
              Lo que <GradientText>Ofrecemos</GradientText>
            </SectionHeading>
            <p className="mt-4 text-sm text-sp-muted">
              ¿Marca de iGaming?{' '}
              <Link href="/servicios/igaming" className="text-sp-orange hover:underline font-medium">
                Ver página dedicada a campañas iGaming →
              </Link>
            </p>
          </div>
        </FadeInOnScroll>

        <FilterTabs
          instanceId="services-filter"
          tabs={SERVICES.map((s) => ({ key: s.id, label: s.label }))}
          active={active}
          onChange={setActive}
        />

        {/* Animated service card */}
        <AnimatePresence mode="wait">
          <m.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-3xl p-8 md:p-10 mb-10 text-white bg-sp-grad"
          >
            <h3 className="font-display text-2xl md:text-3xl font-black uppercase mb-6">{current.title}</h3>
            <ol className="space-y-3">
              {current.steps.map((step, i) => (
                <m.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.06 }}
                  className="flex items-start gap-3 text-sm leading-relaxed"
                >
                  <span className="font-display text-lg font-black opacity-60 w-6 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span>{step}</span>
                </m.li>
              ))}
            </ol>
          </m.div>
        </AnimatePresence>

        {/* Process row */}
        <FadeInOnScroll>
          <div className="flex flex-wrap justify-center gap-0 mb-16">
            {PROCESS_STEPS.map(({ num, label }, i) => (
              <div key={num} className="flex items-center">
                <div className="flex flex-col items-center px-6 py-4">
                  <span className="font-display text-2xl font-black gradient-text">
                    {num}
                  </span>
                  <span className="text-xs font-bold text-sp-dark uppercase tracking-widest mt-1">{label}</span>
                </div>
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="w-8 h-px bg-sp-border hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </FadeInOnScroll>

        {/* Advantages — replaces comparison table */}
        <FadeInOnScroll>
          <h3 className="font-display text-xl font-black uppercase text-sp-dark text-center mb-8">
            ¿Por qué <GradientText>SocialPro</GradientText>?
          </h3>
        </FadeInOnScroll>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADVANTAGES.map(({ title, desc }, i) => (
            <FadeInOnScroll key={title} delay={i * 0.08}>
              <div className="group relative rounded-2xl border border-sp-border bg-sp-off p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:border-sp-orange/40 hover:shadow-[0_8px_32px_rgba(245,99,42,0.12)]">
                {/* Gradient left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(180deg,#f5632a_0%,#e03070_50%,#8b3aad_100%)]"
                />
                <h5 className="font-display text-base font-black uppercase mb-2 text-sp-dark group-hover:text-sp-orange transition-colors duration-300">
                  {title}
                </h5>
                <p className="text-sm text-sp-muted leading-relaxed">{desc}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
