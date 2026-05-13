'use client';

import { useSyncExternalStore } from 'react';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { subscribe, getConsentSnapshot, getServerSnapshot } from '@/lib/consent/consentStore';
import { env } from '@/lib/env';

const GTM_ID_RE = /^GTM-[A-Z0-9]{1,10}$/;

/** GTM + Consent Mode v2 en un único bloque — el init de consent debe preceder al IIFE de GTM */
function GtmWithConsentMode({ gtmId, marketing }: { gtmId: string; marketing: boolean }) {
  const adGranted = marketing ? 'granted' : 'denied';

  // safe: gtmId validado con GTM_ID_RE, adGranted es un literal controlado — sin interpolación de usuario
  const scriptContent = `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('consent','default',{
  analytics_storage:'granted',
  ad_storage:'${adGranted}',
  ad_user_data:'${adGranted}',
  ad_personalization:'${adGranted}'
});
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');
`.trim();

  return (
    <Script
      id="gtm-consented"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  );
}

/**
 * Monta GTM y Vercel Analytics únicamente cuando el usuario ha aceptado
 * la categoría "analytics". Marketing signals se pasan a GTM Consent Mode.
 */
export function ConsentedScripts() {
  const consent = useSyncExternalStore(subscribe, getConsentSnapshot, getServerSnapshot);
  const gtmId = env.NEXT_PUBLIC_GTM_ID;

  if (!consent?.analytics) return null;

  return (
    <>
      {gtmId && GTM_ID_RE.test(gtmId) && (
        <GtmWithConsentMode gtmId={gtmId} marketing={consent.marketing} />
      )}
      <Analytics />
    </>
  );
}
