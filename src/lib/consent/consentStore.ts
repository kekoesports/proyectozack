/** Versión del schema de consentimiento. Incrementar cuando se añadan nuevas categorías. */
export const CONSENT_VERSION = 1;
const STORAGE_KEY = 'sp-consent-v1';

export type ConsentData = {
  v: number;
  ts: number;
  analytics: boolean;
  marketing: boolean;
};

/** null = el usuario aún no ha tomado una decisión (o la versión ha cambiado) */
export type ConsentState = ConsentData | null;

// ── Singleton de listeners ────────────────────────────────────────────────────
// Los event listeners globales se adjuntan una sola vez para todos los suscriptores.

const _listeners = new Set<() => void>();
let _attached = false;

function attachGlobalListeners() {
  if (_attached || typeof window === 'undefined') return;
  _attached = true;
  const notify = () => _listeners.forEach((l) => l());
  window.addEventListener('storage', notify);         // cambios cross-tab
  window.addEventListener('sp:consent-change', notify); // cambios same-tab
}

// ── API pública ───────────────────────────────────────────────────────────────

/** Suscriptor para useSyncExternalStore */
export function subscribe(cb: () => void): () => void {
  attachGlobalListeners();
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

/** Snapshot del cliente — lee localStorage */
export function getConsentSnapshot(): ConsentState {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentData;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      parsed.v === CONSENT_VERSION &&
      typeof parsed.analytics === 'boolean' &&
      typeof parsed.marketing === 'boolean'
    ) {
      return parsed;
    }
  } catch {
    // JSON malformado — tratar como sin decisión
  }
  return null;
}

/** Snapshot del servidor — siempre null para evitar flash SSR */
export function getServerSnapshot(): ConsentState {
  return null;
}

/** Guarda la decisión de consentimiento y notifica a todos los suscriptores */
export function saveConsent(data: { analytics: boolean; marketing: boolean }): void {
  const full: ConsentData = { v: CONSENT_VERSION, ts: Date.now(), ...data };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  // Diferido: evitar React error #185 (maximum update depth exceeded).
  // El dispatch síncrono dentro de un event handler de React provoca que
  // useSyncExternalStore fuerce un re-render mientras React ya procesa
  // el batch del mismo click → bucle de actualizaciones.
  setTimeout(() => window.dispatchEvent(new Event('sp:consent-change')), 0);
}

/** Abre el banner de cookies desde cualquier parte (ej. Footer) */
export function openConsentBanner(): void {
  window.dispatchEvent(new Event('sp:open-consent'));
}
