import { STAGGER } from '@/lib/utils/animation';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { AboutCard } from '@/features/marketing-site/components/AboutCard';

const BULLETS = [
  'DGOJ compliance integrado desde el brief',
  'Brief a campaña activa en menos de 72 horas',
  '+340 FTDs verificados en una sola activación (1WIN, 2025)',
  'España + 6 mercados LATAM — un solo punto de contacto',
] as const;

const CARDS = [
  { label: 'DGOJ Compliant', sub: 'Regulación integrada, no afterthought' },
  { label: '< 72h', sub: 'De brief a campaña activa' },
  { label: 'Datos del operador', sub: 'FTDs auditados, no métricas sociales' },
  { label: 'iGaming · CS2 · Esports', sub: 'Tres verticales, un equipo' },
] as const;

export function AboutSection() {
  return (
    <section id="nosotros" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <FadeInOnScroll>
          <SectionTag>Sobre SocialPro</SectionTag>
          <SectionHeading className="mb-6">
            Somos la agencia <GradientText>gaming</GradientText> del mercado hispano
          </SectionHeading>

          {/* Párrafo corto — entity cross-reference kekoesports.es + E-E-A-T visible */}
          <p className="text-sm text-sp-muted leading-relaxed mb-5">
            SocialPro es una agencia de talentos gaming e iGaming fundada en 2012 en Madrid por{' '}
            <a
              href="https://kekoesports.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sp-orange hover:underline font-medium"
            >
              Pablo &ldquo;Kekō&rdquo; Camacho
            </a>{' '}
            y Alfonso &ldquo;Zack&rdquo; Arias — conectando talentos gaming con marcas en España y
            LATAM con resultados medibles desde el panel del operador, no capturas de pantalla.
          </p>

          <ul className="space-y-2 mb-6">
            {BULLETS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-sp-muted">
                <span className="mt-0.5 text-sp-orange shrink-0" aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>

          {/* Contenido largo — crawlable para SEO, colapsado para usuarios */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-sp-orange hover:text-sp-pink transition-colors select-none [&::-webkit-details-marker]:hidden marker:hidden">
              Leer más
            </summary>
            <div className="mt-3 space-y-3 text-sm text-sp-muted leading-relaxed">
              <p>
                La especialización en iGaming, CS2 y el ecosistema gaming hispano distingue a
                SocialPro de agencias generalistas. El roster incluye streamers verificados con
                audiencias de entre 10.000 y 500.000 seguidores activos, seleccionados por tasa de
                conversión histórica y compatibilidad con las regulaciones DGOJ en España y los
                marcos normativos locales en LATAM. Las campañas de iGaming de SocialPro han
                generado más de 340 FTDs verificados en una sola activación (1WIN, 2025), con datos
                auditados directamente desde el panel de afiliados del operador.
              </p>
              <p>
                SocialPro opera en España y seis mercados de LATAM, con un roster activo que suma
                más de 15 millones de views mensuales y un engagement rate promedio del 8,9%
                medido sobre las últimas 12 campañas ejecutadas en Twitch, YouTube e Instagram
                (datos internos, Q1 2026). La activación media va de brief a campaña en directo
                en menos de 72 horas. Marcas como RAZER, 1WIN y SkinsMonkey han confiado en
                SocialPro para sus activaciones en el mercado hispano.
              </p>
            </div>
          </details>
        </FadeInOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map(({ label, sub }, i) => (
            <FadeInOnScroll key={sub} delay={i * STAGGER.base}>
              <AboutCard item={{ label, sub }} dark />
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
