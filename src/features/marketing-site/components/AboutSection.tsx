import { STAGGER } from '@/lib/utils/animation';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { AboutCard } from '@/features/marketing-site/components/AboutCard';

/**
 * Sección "Sobre SocialPro": copy editorial sobre la agencia + grid de
 * `AboutCard` con highlights numéricos (años, mercados, etc.).
 *
 * @kind server
 * @feature marketing-site
 * @route /
 * @example
 * ```tsx
 * <AboutSection />
 * ```
 */
export function AboutSection() {
  return (
    <section id="nosotros" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <FadeInOnScroll>
          <SectionTag>Sobre SocialPro</SectionTag>
          <SectionHeading className="mb-6">
            Somos la agencia <GradientText>gaming</GradientText> del mercado hispano
          </SectionHeading>
          <div className="space-y-4 text-sm text-sp-muted leading-relaxed">
            <p>
              SocialPro es una agencia de talentos gaming e iGaming fundada en 2012 en Madrid por
              Pablo "Kekō" Camacho —ex-profesional de CS:GO con 14 años en esports— y Alfonso
              "Zack" Arias, con 7 años de especialización en iGaming y esports marketing.
              La agencia nació para resolver el problema real del mercado hispano: conectar talentos
              gaming con marcas que exigen audiencias comprometidas, compliance regulatorio integrado
              y resultados medibles con datos del operador, no capturas de pantalla. Desde su
              fundación, SocialPro ha gestionado campañas para marcas como RAZER, 1WIN y
              SkinsMonkey en España, México, Argentina, Colombia y Chile.
            </p>
            <p>
              La especialización en iGaming, CS2 y el ecosistema gaming hispano distingue a
              SocialPro de agencias generalistas. El roster incluye streamers verificados con
              audiencias de entre 10.000 y 500.000 seguidores activos, seleccionados por tasa de
              conversión histórica y compatibilidad con las regulaciones DGOJ en España y los marcos
              normativos locales en LATAM. Las campañas de iGaming de SocialPro han generado más
              de 340 FTDs verificados en una sola activación (1WIN, 2025), con datos auditados
              directamente desde el panel de afiliados del operador.
            </p>
            <p>
              SocialPro opera en España y seis mercados de LATAM, con un roster activo que suma
              más de 15 millones de views mensuales y un engagement rate promedio del 8,9%
              medido sobre las últimas 12 campañas ejecutadas en Twitch, YouTube e Instagram
              (datos internos, Q1 2026). La activación media va de brief a campaña en directo
              en menos de 72 horas.
            </p>
          </div>
        </FadeInOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'España & LatAm', sub: 'Mercados principales' },
            { label: '+14 años', sub: 'Experiencia en gaming' },
            { label: 'iGaming', sub: 'Especialización principal' },
            { label: '100% tracking', sub: 'Resultados medibles' },
          ].map(({ label, sub }, i) => (
            <FadeInOnScroll key={sub} delay={i * STAGGER.base}>
              <AboutCard item={{ label, sub }} />
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
