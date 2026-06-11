'use client';

import * as m from 'motion/react-client';
import { useReducedMotion } from 'motion/react';

import { GradientText } from '@/components/ui/GradientText';
import { useVisibilityFailSafe } from '@/lib/utils/use-visibility-failsafe';
import { DURATION, EASE, fadeUp, staggerContainer } from '@/lib/utils/animation';
import { trackEvent } from '@/lib/analytics';

/**
 * Final CTA. Animations are wired through controlled `animate=` (not
 * `whileInView`) plus a fail-safe so the section can never be left
 * permanently invisible if the IntersectionObserver fails to fire.
 */
export function CtaSection(): React.JSX.Element {
  const reduced = useReducedMotion();
  const [ref, visible] = useVisibilityFailSafe<HTMLDivElement>();

  const animateState = reduced || visible ? 'visible' : 'hidden';

  return (
    <section className="py-16 bg-sp-black text-white text-center">
      <m.div
        ref={ref}
        data-motion-fallback=""
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
        variants={staggerContainer()}
        initial="hidden"
        animate={animateState}
      >
        <m.h2
          variants={fadeUp}
          transition={{ duration: DURATION.slow, ease: EASE.out }}
          className="font-display text-3xl sm:text-5xl md:text-6xl font-black uppercase mb-6"
        >
          Diseñemos tu <GradientText>próxima campaña</GradientText>
        </m.h2>
        <m.p
          variants={fadeUp}
          transition={{ duration: DURATION.slow, ease: EASE.out }}
          className="text-sp-muted2 text-lg mb-4"
        >
          +340 FTDs en una activación (1WIN × CS2, 2025, panel del operador) ·
          15M+ views/mes · 13 años en gaming e iGaming.
        </m.p>
        <m.p
          variants={fadeUp}
          transition={{ duration: DURATION.slow, ease: EASE.out }}
          className="text-sp-muted2/70 text-sm mb-10"
        >
          1. Cuéntanos producto, mercado y objetivo ·
          2. Propuesta con creadores seleccionados en 48h ·
          3. Sin compromiso — decides si avanzar.
        </m.p>
        <m.a
          href="/contacto?type=brand"
          onClick={() => trackEvent('cta_click', { cta_id: 'home_cta_section', cta_destination: '/contacto?type=brand' })}
          variants={fadeUp}
          transition={{ duration: DURATION.slow, ease: EASE.out }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center justify-center px-10 py-4 rounded-full font-bold text-white text-base bg-sp-grad"
        >
          Iniciar Propuesta →
        </m.a>
        <m.p
          variants={fadeUp}
          transition={{ duration: DURATION.slow, ease: EASE.out }}
          className="mt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-sp-muted2/80"
        >
          Respuesta en 24h · Sin compromiso
        </m.p>
      </m.div>
    </section>
  );
}
