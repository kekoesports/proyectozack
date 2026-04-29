'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { WhatsAppWidget } from './WhatsAppWidget';
import type { ReactNode } from 'react';

const PORTAL_PREFIXES = ['/admin', '/marcas', '/creadores', '/giveaways', '/c/'];
const LOGIN_SUFFIXES = ['/login'];

function isPortalRoute(pathname: string): boolean {
  for (const prefix of PORTAL_PREFIXES) {
    if (!pathname.startsWith(prefix)) continue;
    // Allow login pages to keep public chrome
    if (LOGIN_SUFFIXES.some((s) => pathname.endsWith(s))) return false;
    return true;
  }
  return false;
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

  useEffect(() => {
    if (isPortal) return;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
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
      <WhatsAppWidget />
    </>
  );
}
