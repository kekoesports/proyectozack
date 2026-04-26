'use client';

import * as m from 'motion/react-client';
import { GradientText } from '@/components/ui/GradientText';
import { DURATION, EASE, VIEWPORT, fadeUp, staggerContainer } from '@/lib/animation';

export function CtaSection(): React.JSX.Element {
  return (
    <section className="py-24 bg-sp-black text-white text-center">
      <m.div
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
        variants={staggerContainer()}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
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
          +340 FTDs en una activación · 15M views/mes · 13 años ejecutando en
          España, LatAm y Turquía.
        </m.p>
        <m.p
          variants={fadeUp}
          transition={{ duration: DURATION.slow, ease: EASE.out }}
          className="text-sp-muted2/70 text-sm mb-10"
        >
          Cuéntanos producto, mercado y objetivo. Te respondemos con una
          propuesta concreta.
        </m.p>
        <m.a
          href="/contacto"
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
