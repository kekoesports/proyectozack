'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
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

export function PublicChrome({ nav, footer, children }: PublicChromeProps) {
  const pathname = usePathname();
  const isPortal = isPortalRoute(pathname);

  useEffect(() => {
    if (isPortal) return;
    let rafId: number;
    let lenisInstance: { raf: (t: number) => void; destroy: () => void } | null = null;

    import('lenis').then(({ default: Lenis }) => {
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      function raf(time: number) {
        lenisInstance!.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(rafId);
      lenisInstance?.destroy();
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
