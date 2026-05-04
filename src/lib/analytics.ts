/**
 * Cliente para enviar eventos a Google Tag Manager.
 *
 * GTM se monta desde `<CookieConsent>` solo si el usuario ha aceptado y
 * `NEXT_PUBLIC_GTM_ID` está configurado. Si GTM no está cargado (consent
 * pendiente, rechazado o env var ausente), `trackEvent` es un no-op
 * seguro — no se acumulan eventos en cola ni se rompe nada.
 *
 * Los eventos van a `window.dataLayer`. En GTM hay que crear los triggers
 * y mapearlos a tags GA4 con los nombres definidos abajo.
 */

type DataLayerEvent = { event: string } & Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

/**
 * Empuja un evento al dataLayer de GTM. Seguro de llamar en cualquier
 * contexto: si GTM no está cargado retorna sin hacer nada.
 */
export function trackEvent(
  name: string,
  payload: Readonly<Record<string, unknown>> = {},
): void {
  if (typeof window === 'undefined') return;
  if (!Array.isArray(window.dataLayer)) return;
  window.dataLayer.push({ event: name, ...payload });
}
