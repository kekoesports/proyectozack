'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as m from 'motion/react-client';
import { AnimatePresence, useMotionValue } from 'motion/react';

const NAV_LINKS = [
  { href: '/talentos', label: 'Talentos' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/casos', label: 'Casos de Éxito' },
  { href: '/blog', label: 'Blog' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Scroll progress driven by a native listener (more reliable than motion's
  // useScroll on Safari iOS, where momentum scrolling delays motion events).
  const scrollProgress = useMotionValue(0);

  useEffect(() => {
    let rafId = 0;
    let pending = false;

    const update = (): void => {
      pending = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      scrollProgress.set(progress);
      setScrolled((prev) => {
        const next = y > 50;
        return prev === next ? prev : next;
      });
    };

    const onScroll = (): void => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [scrollProgress]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-sp-black/98 backdrop-blur-md border-b border-white/10'
          : 'bg-sp-black border-b border-white/5'
      }`}
    >
      {/* Scroll progress bar */}
      <m.div
        className="absolute bottom-0 left-0 right-0 h-[1px] origin-left"
        style={{
          background: 'linear-gradient(90deg,#f5632a 0%,#e03070 50%,#8b3aad 100%)',
          scaleX: scrollProgress,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo: ícono + wordmark en JSX */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <m.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="flex items-center gap-2.5"
          >
            <Image
              src="/images/logos/2.png"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
            <span
              className="font-display font-black uppercase tracking-tight text-white leading-none"
              style={{ fontSize: '1.15rem', letterSpacing: '-0.02em' }}
            >
              SOCIAL<span className="text-sp-orange">PRO</span>
            </span>
          </m.div>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              {l.href.startsWith('/') ? (
                <Link
                  href={l.href}
                  className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors duration-200"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  href={l.href}
                  className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors duration-200"
                >
                  {l.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <m.a
          href="/contacto"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="hidden md:inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white bg-sp-grad"
        >
          Trabajemos juntos
        </m.a>

        {/* Mobile burger */}
        <button
          className="md:hidden text-white/70 hover:text-white transition-colors p-2"
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="md:hidden bg-sp-black border-t border-white/10 px-6 py-5 flex flex-col gap-5"
          >
            {NAV_LINKS.map((l, i) =>
              l.href.startsWith('/') ? (
                <m.div
                  key={l.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut', delay: i * 0.04 }}
                >
                  <Link
                    href={l.href}
                    className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors block"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </m.div>
              ) : (
                <m.a
                  key={l.href}
                  href={l.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut', delay: i * 0.04 }}
                  className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </m.a>
              )
            )}
            <m.a
              href="/contacto"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut', delay: NAV_LINKS.length * 0.04 }}
              className="text-xs font-bold uppercase tracking-widest text-white text-center py-3 bg-sp-grad"
              onClick={() => setOpen(false)}
            >
              Trabajemos juntos
            </m.a>
          </m.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
