import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';

const REASONS = [
  {
    icon: '🛡',
    title: 'DGOJ Compliant',
    // micro-contexto para quien no conoce la normativa
    context: 'Regulación española de publicidad de juego online',
    desc: 'Compliance DGOJ integrado desde el briefing — verificación de edad, ventanas de publicación y supervisión legal antes de cada pieza. Zero reclamaciones regulatorias para clientes operadores desde 2022.',
  },
  {
    icon: '📊',
    title: 'Resultados auditables',
    context: null,
    desc: 'Los datos vienen del panel del operador o de la plataforma de afiliados, no de capturas de pantalla. FTDs, registros y ROI trazables por código y por creador desde el origen.',
  },
  {
    icon: '🎮',
    title: 'Solo gaming e iGaming',
    context: null,
    desc: 'Sin clientes de otros sectores que diluyan el expertise. SocialPro opera exclusivamente en esports, CS2, Valorant, Twitch, YouTube, Kick e iGaming. 13+ años sin desviar el foco.',
  },
  {
    icon: '🌍',
    title: 'España + LATAM',
    context: null,
    desc: 'Creadores seleccionados por audiencia local, tasa de conversión histórica y fit cultural. 6 mercados activos: España, México, Argentina, Chile, Colombia y Perú.',
  },
] as const;

export function NosotrosPorQue() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          <div className="mb-12">
            <SectionTag>Por qué SocialPro</SectionTag>
            <SectionHeading>
              Lo que nos hace <GradientText>distintos</GradientText>
            </SectionHeading>
          </div>
        </FadeInOnScroll>

        <div className="grid sm:grid-cols-2 gap-4 lg:gap-5">
          {REASONS.map((r, i) => (
            <FadeInOnScroll key={r.title} delay={i * 0.07}>
              <div className="rounded-2xl border border-sp-border bg-sp-off p-6 md:p-8 h-full flex flex-col">
                <span className="text-2xl mb-4 block">{r.icon}</span>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-sp-dark mb-1">
                  {r.title}
                </h3>
                {r.context && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-sp-orange mb-3">
                    {r.context}
                  </p>
                )}
                <p className="text-sm text-sp-muted leading-relaxed flex-1">{r.desc}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
