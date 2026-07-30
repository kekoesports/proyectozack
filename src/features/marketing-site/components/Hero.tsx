'use client';

import * as m from 'motion/react-client';
import Image from 'next/image';

import { trackEvent } from '@/lib/analytics';
import { HeroBackground } from './HeroBackground';

const HERO_STATS = [
  { value: '13+', label: 'AÑOS' },
  { value: '15M', label: 'VIEWS/MES' },
  { value: '+340', label: 'FTDS' },
] as const;

/**
 * Hero principal de la home: auras parallax animadas con motion + tipografía
 * gradient + CTA "Iniciar Propuesta". Reacciona al cursor con springs y
 * respeta `prefers-reduced-motion`.
 *
 * @kind client
 * @feature marketing-site
 * @route / , /en
 * @example
 * ```tsx
 * <Hero />                                   // home ES (default)
 * <Hero heading="Gaming & iGaming Agency" /> // home EN
 * ```
 */
type HeroProps = {
  /**
   * Texto del H1 semántico. Default: keyword ES (`Agencia de Influencers
   * Gaming e iGaming en España y LATAM`). Se sobrescribe desde `/en/page.tsx`
   * para el H1 inglés.
   */
  readonly heading?: string;
};

const DEFAULT_HEADING = 'Agencia de Influencers Gaming e iGaming en España y LATAM';

export function Hero({ heading = DEFAULT_HEADING }: HeroProps = {}) {
  return (
    <section className="relative text-white overflow-hidden min-h-dvh flex flex-col pt-16">

      <HeroBackground />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col items-center justify-center text-center pb-20">

        <m.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          {/* CSS-driven float — no JS rAF */}
          <div className="relative z-10 hero-logo-float">
            <Image
              src="/images/logos/2.png"
              alt="SocialPro Mark"
              width={80}
              height={80}
              priority
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_25px_rgba(224,48,112,0.4)]"
            />
          </div>
          <div className="absolute inset-0 bg-sp-pink/20 blur-2xl rounded-full" />
        </m.div>

        <span className="inline-block text-[10px] font-bold uppercase tracking-[0.4em] text-sp-muted2 mb-6">
          Gaming &amp; Esports · España · LatAm · Europa
        </span>

        {/* H1 semántico — keyword primaria del sprint SEO+GEO 2026-07.
            Texto más largo que el eyebrow anterior; se ajusta el sizing y
            el tracking para que quepa en móvil sin romper la jerarquía
            visual (el megatítulo de abajo mantiene todo su peso). */}
        <m.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="font-display text-sm xs:text-base sm:text-xl md:text-2xl lg:text-[1.75rem] font-bold uppercase tracking-[0.15em] text-sp-muted2/70 mb-4 sm:mb-5 max-w-4xl text-balance"
        >
          {heading}
        </m.h1>

        {/* Claim visual (LCP element) — antes era el H1; ahora es un elemento
            decorativo grande, sin peso semántico H1 pero con toda la
            presencia visual. Mantenemos el slide-in (y: 40 → 0) sin opacity:0
            para que el LCP se contabilice en cuanto pinta. */}
        <div className="font-display text-[2.75rem] xs:text-[3.5rem] sm:text-[5rem] md:text-[7rem] lg:text-[10rem] font-black uppercase leading-[0.85] tracking-tight mb-10">
          <m.span
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="block text-white"
          >
            CONECTAMOS
          </m.span>
          <m.span
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
            className="block hero-headline-gradient"
          >
            CREADORES
          </m.span>
          <m.span
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
            className="block text-white"
          >
            CON MARCAS
          </m.span>
        </div>

        <div className="flex flex-col items-center max-w-2xl mx-auto">
          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-base sm:text-lg text-sp-muted2 mb-8 leading-relaxed font-medium"
          >
            Campañas gaming e iGaming con talentos verificados, compliance DGOJ
            integrado y FTDs trazables desde el panel del operador. 13+ años
            ejecutando en España, LatAm y Europa.
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            {/* CTA para marcas — primario */}
            <m.a
              href="/contacto?type=brand"
              onClick={() => trackEvent('cta_click', { cta_id: 'hero_home_primary', cta_destination: '/contacto?type=brand' })}
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(224,48,112,0.3)' }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase transition-shadow bg-sp-grad"
            >
              Tengo una marca →
            </m.a>
            {/* CTA para creadores — secundario */}
            <m.a
              href="/para-creadores"
              onClick={() => trackEvent('cta_click', { cta_id: 'hero_home_creators', cta_destination: '/para-creadores' })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Soy creador →
            </m.a>
          </m.div>

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-sp-muted2/80"
          >
            Respuesta en 24h · Sin compromiso
          </m.p>
        </div>

        {/* Bottom stats — always visible, lightly muted. Previously hidden
            behind grayscale+opacity-40, which buried proof above the fold. */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="mt-20 flex gap-12 sm:gap-24 opacity-70 hover:opacity-100 transition-opacity duration-500"
        >
          {HERO_STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-display text-4xl font-black text-white leading-none">{value}</div>
              <div className="text-[10px] font-bold text-sp-muted2 tracking-widest mt-2">{label}</div>
            </div>
          ))}
        </m.div>
      </div>
    </section>
  );
}
