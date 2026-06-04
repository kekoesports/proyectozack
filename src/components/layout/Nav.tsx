'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import * as m from 'motion/react-client';
import { AnimatePresence, useMotionValue } from 'motion/react';

import { trackEvent } from '@/lib/analytics';
import { LangSwitch, hasLangAlternate } from '@/components/layout/LangSwitch';
import { localeFromPathname, type Locale } from '@/lib/locale';

const NAV_LINKS_BY_LOCALE: Record<Locale, readonly { href: string; label: string }[]> = {
  es: [
    { href: '/talentos', label: 'Talentos' },
    { href: '/servicios', label: 'Servicios' },
    { href: '/casos', label: 'Casos de Éxito' },
    { href: '/codigos', label: 'Códigos' },
    { href: '/sorteos', label: 'Sorteos' },
    { href: '/blog', label: 'Blog' },
    { href: '/news', label: 'News' },
    { href: '/nosotros', label: 'Nosotros' },
    { href: '/contacto', label: 'Contacto' },
  ],
  en: [
    { href: '/talents', label: 'Talent' },
    { href: '/services', label: 'Services' },
    { href: '/cases', label: 'Case Studies' },
    { href: '/blog', label: 'Blog' },
    { href: '/news', label: 'News' },
    { href: '/nosotros', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ],
};

const CTA_BY_LOCALE: Record<Locale, string> = {
  es: 'Trabajemos juntos',
  en: 'Let’s work together',
};

const MENU_ARIA_BY_LOCALE: Record<Locale, string> = {
  es: 'Abrir menú',
  en: 'Open menu',
};

/**
 * Barra de navegación pública sticky con barra de progreso de scroll,
 * menú mobile animado (AnimatePresence) y CTA principal. Usa un listener
 * nativo de scroll por fiabilidad en Safari iOS.
 *
 * @kind client
 * @feature layout
 */
export function Nav() {
  const pathname = usePathname() ?? '/';
  const locale = localeFromPathname(pathname);
  const navLinks = NAV_LINKS_BY_LOCALE[locale];
  const ctaLabel = CTA_BY_LOCALE[locale];
  const menuAria = MENU_ARIA_BY_LOCALE[locale];
  const homeHref = locale === 'en' ? '/en' : '/';
  const contactHref = locale === 'en' ? '/contact' : '/contacto';
  const showLangToggle = hasLangAlternate(pathname);

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
        <Link href={homeHref} className="flex items-center gap-2.5 group flex-none">
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
        <ul className="hidden md:flex items-center gap-5">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white transition-colors duration-200"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right cluster: language toggle (only when alternate exists) + CTA */}
        <div className="hidden md:flex items-center gap-3 flex-none">
          {showLangToggle && <LangSwitch />}
          <m.a
            href={contactHref}
            onClick={() => trackEvent('cta_click', { cta_id: 'nav_header', cta_destination: contactHref })}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white bg-sp-grad"
          >
            {ctaLabel}
          </m.a>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden text-white/70 hover:text-white transition-colors p-2"
          aria-label={menuAria}
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
            {navLinks.map((l, i) => (
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
            ))}
            {showLangToggle && (
              <m.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut', delay: navLinks.length * 0.04 }}
                className="self-start"
              >
                <LangSwitch onNavigate={() => setOpen(false)} />
              </m.div>
            )}
            <m.a
              href={contactHref}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut', delay: (navLinks.length + (showLangToggle ? 1 : 0)) * 0.04 }}
              className="text-xs font-bold uppercase tracking-widest text-white text-center py-3 bg-sp-grad"
              onClick={() => {
                trackEvent('cta_click', { cta_id: 'nav_mobile', cta_destination: contactHref });
                setOpen(false);
              }}
            >
              {ctaLabel}
            </m.a>
          </m.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
