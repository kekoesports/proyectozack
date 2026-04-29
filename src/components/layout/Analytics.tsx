'use client';

import Script from 'next/script';

type AnalyticsProps = {
  gtmId?: string;
}

const GTM_ID_RE = /^GTM-[A-Z0-9]{1,10}$/;

/**
 * Wrapper de Google Tag Manager. Inyecta el script GTM solo cuando hay un
 * `gtmId` válido. La consent gating se aplica desde fuera (CookieConsent).
 *
 * @kind client
 * @feature layout
 * @example
 * ```tsx
 * <Analytics gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
 * ```
 */
export function Analytics({ gtmId }: AnalyticsProps) {
  if (!gtmId || !GTM_ID_RE.test(gtmId)) return null;

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}
