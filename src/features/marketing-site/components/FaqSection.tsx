import { safeJsonLd } from '@/lib/safeJsonLd';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';

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

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.answer,
    },
  })),
};

/**
 * Preguntas frecuentes con accordion nativo <details>/<summary>.
 * Contenido siempre en DOM (SSR/crawlable). Animación via CSS transition.
 * FAQPage JSON-LD incluido — valor para citabilidad AI sin rich result Google
 * en sitios comerciales (restricción ago 2023).
 *
 * @kind server
 * @feature marketing-site
 * @route /
 */
export function FaqSection() {
  return (
    <section id="faq" className="py-12 bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <SectionTag>FAQ</SectionTag>
          <SectionHeading>
            Preguntas <GradientText>frecuentes</GradientText>
          </SectionHeading>
        </div>

        <div className="rounded-2xl border border-sp-border bg-sp-off p-6 md:p-8">
          {FAQS.map((faq, i) => (
            <details
              key={faq.question}
              className="group border-b border-sp-border last:border-b-0"
              {...(i === 0 ? { open: true } : {})}
            >
              <summary className="flex w-full cursor-pointer list-none items-center justify-between py-5 text-left [&::-webkit-details-marker]:hidden">
                <span className="pr-4 font-semibold text-sp-dark transition-colors group-hover:text-sp-orange group-open:text-sp-orange">
                  {faq.question}
                </span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sp-border text-sm text-sp-muted transition-colors group-open:border-sp-orange group-open:text-sp-orange">
                  <span className="block transition-transform duration-200 group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-sp-muted">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
