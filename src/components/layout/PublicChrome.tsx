'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { WhatsAppWidget } from './WhatsAppWidget';
import type { ReactNode } from 'react';

type LenisInstance = { raf: (time: number) => void; destroy: () => void };

const PORTAL_PREFIXES = ['/admin', '/marcas', '/creadores', '/giveaways', '/c/'];
const LOGIN_SUFFIXES = ['/login'];

// Rutas donde el widget WhatsApp dispersa el tono editorial/media o
// colisiona con un CTA flotante propio. Mantienen el resto del chrome
// (Nav + Footer + Lenis).
const HIDE_WHATSAPP_PREFIXES = ['/apuesta-segura-cs2', '/news'];

function isPortalRoute(pathname: string): boolean {
  for (const prefix of PORTAL_PREFIXES) {
    if (!pathname.startsWith(prefix)) continue;
    // Allow login pages to keep public chrome
    if (LOGIN_SUFFIXES.some((s) => pathname.endsWith(s))) return false;
    return true;
  }
  return false;
}

function shouldHideWhatsApp(pathname: string): boolean {
  return HIDE_WHATSAPP_PREFIXES.some((p) => pathname.startsWith(p));
}

type PublicChromeProps = {
  nav: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Wrapper que decide si renderizar el chrome público (Nav + Footer +
 * WhatsAppWidget + Lenis smooth scroll) o pasar `children` desnudos en rutas
 * de portal (`/admin`, `/marcas`, `/creadores`, `/giveaways`, `/c/`).
 * Las páginas de login conservan el chrome público.
 *
 * @kind client
 * @feature layout
 * @example
 * ```tsx
 * <PublicChrome nav={<Nav />} footer={<Footer />}>{children}</PublicChrome>
 * ```
 */
export function PublicChrome({ nav, footer, children }: PublicChromeProps) {
  const pathname = usePathname();
  const isPortal = isPortalRoute(pathname);
  const hideWhatsApp = shouldHideWhatsApp(pathname);

  useEffect(() => {
    if (isPortal) return;
    let cancelled = false;
    let rafId = 0;
    let lenis: LenisInstance | null = null;

    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      lenis?.destroy();
    };
  }, [isPortal]);

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <>
      {nav}
      <main className="pt-16">{children}</main>
      {footer}
      {hideWhatsApp ? null : <WhatsAppWidget />}
    </>
  );
}
