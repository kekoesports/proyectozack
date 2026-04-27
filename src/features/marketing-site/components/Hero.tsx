'use client';

import { useEffect } from 'react';
import * as m from 'motion/react-client';
import { useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import Image from 'next/image';

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
 * @route /
 * @example
 * ```tsx
 * <Hero />
 * ```
 */
export function Hero() {
  const reduced = useReducedMotion();
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 25 });

  // Inverted direction on orange creates depth parallax between the two auras
  const pinkX = useTransform(smoothX, [0, 1], [-50, 50]);
  const pinkY = useTransform(smoothY, [0, 1], [-50, 50]);
  const orangeX = useTransform(smoothX, [0, 1], [25, -25]);
  const orangeY = useTransform(smoothY, [0, 1], [20, -20]);

  useEffect(() => {
    if (reduced) return;
    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [mouseX, mouseY, reduced]);

  return (
    <section className="relative bg-sp-black text-white overflow-hidden min-h-dvh flex flex-col pt-16">

      {/* Aura layer — paint-contained so blurs never trigger outside repaints */}
      <div className="absolute inset-0 pointer-events-none [contain:paint]">
        <m.div
          className="absolute top-1/2 left-1/2 -ml-[500px] -mt-[500px] will-change-transform"
          style={{ x: pinkX, y: pinkY }}
        >
          <div className="hero-aura-pink hero-aura-pink-bg w-[1000px] h-[1000px] rounded-full blur-[40px] sm:blur-[80px]" />
        </m.div>
        <m.div
          className="absolute top-[-10%] right-[-10%] will-change-transform"
          style={{ x: orangeX, y: orangeY }}
        >
          <div className="hero-aura-orange hero-aura-orange-bg w-[800px] h-[800px] rounded-full blur-[50px] sm:blur-[100px]" />
        </m.div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col items-center justify-center text-center pb-20">

        <m.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          {/* CSS-driven float — no JS rAF */}
          <div className="relative z-10 hero-logo-float">
            <Image
              src="/images/logos/2.png"
              alt="SocialPro Mark"
              width={100}
              height={100}
              priority
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_25px_rgba(224,48,112,0.4)]"
            />
          </div>
          <div className="absolute inset-0 bg-sp-pink/20 blur-2xl rounded-full" />
        </m.div>

        <m.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="inline-block text-[10px] font-bold uppercase tracking-[0.4em] text-sp-muted2 mb-6"
        >
          Gaming &amp; Esports · Europa · LatAm · Turquía
        </m.span>

        <h1 className="font-display text-[2.75rem] xs:text-[3.5rem] sm:text-[5rem] md:text-[7rem] lg:text-[10rem] font-black uppercase leading-[0.85] tracking-tight mb-10">
          <m.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="block text-white"
          >
            CONECTAMOS
          </m.span>
          <m.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
            className="block hero-headline-gradient"
          >
            CREADORES
          </m.span>
          <m.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
            className="block text-white"
          >
            CON MARCAS
          </m.span>
        </h1>

        <div className="flex flex-col items-center max-w-2xl mx-auto">
          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-base sm:text-lg text-sp-muted2 mb-8 leading-relaxed font-medium"
          >
            Campañas gaming y iGaming con talentos verificados, compliance
            integrado y FTDs rastreados. 13+ años ejecutando en España, LatAm
            y Turquía.
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <m.a
              href="/contacto"
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(224,48,112,0.3)' }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase transition-shadow bg-sp-grad"
            >
              Iniciar Propuesta
            </m.a>
            <m.a
              href="/casos"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Ver Casos de Éxito
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
