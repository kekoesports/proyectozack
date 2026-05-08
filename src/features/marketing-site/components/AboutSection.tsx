import Link from 'next/link';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';

const PILLS = [
  'DGOJ Compliant',
  '< 72h brief → campaña',
  '+340 FTDs verificados',
  'España + 6 mercados LATAM',
] as const;

export function AboutSection() {
  return (
    <section id="nosotros" className="py-14 bg-white border-t border-sp-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          <SectionTag>Sobre SocialPro</SectionTag>
          <SectionHeading className="mb-4">
            Somos la agencia <GradientText>gaming</GradientText> del mercado hispano
          </SectionHeading>

          <p className="text-sm text-sp-muted leading-relaxed mb-5 max-w-2xl">
            Fundada en 2012 en Madrid por{' '}
            <a
              href="https://kekoesports.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sp-orange hover:underline font-medium"
            >
              Pablo &ldquo;Kekō&rdquo; Camacho
            </a>{' '}
            y Alfonso &ldquo;Zack&rdquo; Arias — resultados medibles desde el panel del operador,
            no capturas de pantalla.
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {PILLS.map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sp-border bg-sp-off text-xs font-semibold text-sp-muted"
              >
                <span className="text-sp-orange" aria-hidden="true">✓</span>
                {pill}
              </span>
            ))}
          </div>

          <Link
            href="/nosotros"
            className="text-sm font-semibold text-sp-orange hover:text-sp-pink transition-colors"
          >
            Conoce al equipo →
          </Link>

          {/* Texto SEO — crawlable, colapsado visualmente */}
          <details className="mt-5">
            <summary className="cursor-pointer text-xs font-semibold text-sp-muted/50 hover:text-sp-orange transition-colors select-none [&::-webkit-details-marker]:hidden marker:hidden">
              Leer más
            </summary>
            <div className="mt-3 space-y-3 text-sm text-sp-muted leading-relaxed max-w-2xl">
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
                (datos internos, Q1 2026). Marcas como RAZER, 1WIN y SkinsMonkey han confiado en
                SocialPro para sus activaciones en el mercado hispano.
              </p>
            </div>
          </details>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
