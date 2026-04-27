'use client';

import { useState } from 'react';
import * as m from 'motion/react-client';
import { AnimatePresence } from 'motion/react';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';

type FaqItem = {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: '¿Cómo funciona el proceso de colaboración con una marca?',
    answer:
      'Primero analizamos los objetivos de la marca y el público objetivo. Luego seleccionamos los creadores más relevantes de nuestro roster, diseñamos la campaña, coordinamos la ejecución y entregamos un informe detallado con métricas de rendimiento (views, CTR, FTDs, conversiones).',
  },
  {
    question: '¿En qué mercados operáis?',
    answer:
      'Actualmente operamos en España, Latinoamérica y el mercado de habla hispana global. Nuestros creadores cubren Twitch, YouTube y plataformas de CS2, con audiencias en más de 3 mercados activos.',
  },
  {
    question: '¿Cuánto cuesta una campaña?',
    answer:
      'El coste depende del alcance, los creadores seleccionados y la duración de la campaña. Trabajamos con presupuestos flexibles y siempre proporcionamos un ROI estimado antes de lanzar. Contáctanos para una propuesta personalizada.',
  },
  {
    question: '¿Cómo medís los resultados?',
    answer:
      'Utilizamos tracking personalizado para cada campaña: enlaces UTM, píxeles de conversión, códigos de referido y paneles de analytics en tiempo real. Entregamos informes con métricas clave como CTR (8.4% medio), FTDs, registros y ROI.',
  },
  {
    question: '¿Qué diferencia a SocialPro de otras agencias?',
    answer:
      'Con más de 13 años en la industria del iGaming, somos una de las agencias más experimentadas del mercado hispano. No somos una agencia genérica — nuestro equipo viene del gaming y entiende a las audiencias. Ofrecemos datos reales, no promesas.',
  },
  {
    question: '¿Soy creador de contenido, cómo puedo unirme?',
    answer:
      'Si eres streamer o creador de contenido en el nicho gaming/iGaming, envíanos tu perfil a través del formulario de contacto seleccionando "Soy un creador de contenido". Evaluamos tu canal, audiencia y potencial para incluirte en nuestro roster de talentos.',
  },
  {
    question: '¿Cuánto tiempo tarda en lanzarse una campaña?',
    answer:
      'Una campaña típica tarda entre 1 y 3 semanas desde el briefing hasta el lanzamiento, dependiendo de la complejidad. Para lanzamientos urgentes, podemos activar campañas en menos de 7 días con nuestro roster de creadores verificados.',
  },
];

function FaqAccordionItem({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-sp-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-sp-dark group-hover:text-sp-orange transition-colors pr-4">
          {item.question}
        </span>
        <m.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full border text-sm ${
            isOpen ? 'border-sp-orange text-sp-orange' : 'border-sp-border text-sp-muted'
          }`}
        >
          +
        </m.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden [transform-origin:top]"
          >
            <p className="text-sm text-sp-muted leading-relaxed pb-5">{item.answer}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Acordeón de preguntas frecuentes con expand/collapse animado vía
 * AnimatePresence. Una sola pregunta abierta a la vez.
 *
 * @kind client
 * @feature marketing-site
 * @route /
 * @example
 * ```tsx
 * <FaqSection />
 * ```
 */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <section id="faq" className="py-24 bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          <div className="text-center mb-12">
            <SectionTag>FAQ</SectionTag>
            <SectionHeading>
              Preguntas <GradientText>frecuentes</GradientText>
            </SectionHeading>
          </div>
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.15}>
          <div className="rounded-2xl border border-sp-border bg-sp-off p-6 md:p-8">
            {FAQS.map((faq, i) => (
              <FaqAccordionItem
                key={i}
                item={faq}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
