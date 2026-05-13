'use client';

import { useSyncExternalStore, useEffect } from 'react';
import Script from 'next/script';
import { inject } from '@vercel/analytics';
import { subscribe, getConsentSnapshot, getServerSnapshot } from '@/lib/consent/consentStore';
import { env } from '@/lib/env';

const GTM_ID_RE = /^GTM-[A-Z0-9]{1,10}$/;

/**
 * GTM script — mismo snippet que funcionaba antes, sin modificar.
 * Consent Mode se puede añadir en Fase 2 vía GTM Dashboard.
 * safe: gtmId validado con GTM_ID_RE antes de renderizar este componente.
 */
function GtmScript({ gtmId }: { gtmId: string }) {
  return (
    <Script
      id="gtm-consented"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
      }}
    />
  );
}

/**
 * Monta GTM y Vercel Analytics únicamente cuando el usuario ha aceptado analytics.
 * Vercel Analytics se inyecta via inject() (no el componente /next que usa useSearchParams
 * y puede causar problemas cuando se renderiza condicionalmente tras interacción).
 */
export function ConsentedScripts() {
  const consent = useSyncExternalStore(subscribe, getConsentSnapshot, getServerSnapshot);
  const gtmId = env.NEXT_PUBLIC_GTM_ID;

  // Vercel Analytics — inject() es idempotente (comprueba si el script ya está en <head>)
  useEffect(() => {
    if (!consent?.analytics) return;
    inject({ framework: 'next' });
  }, [consent?.analytics]);

  if (!consent?.analytics) return null;

  return gtmId && GTM_ID_RE.test(gtmId) ? <GtmScript gtmId={gtmId} /> : null;
}
