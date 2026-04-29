'use client';

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
import { Analytics } from './Analytics';

const CONSENT_KEY = 'sp-cookie-consent';

type ConsentValue = 'accepted' | 'rejected' | null;

function getStoredConsent(): ConsentValue {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === 'accepted' || val === 'rejected') return val;
  return null;
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

/**
 * Banner de consentimiento de cookies. Persiste la decisión en localStorage
 * y monta `<Analytics>` (GTM) solo si el usuario ha aceptado y existe
 * `NEXT_PUBLIC_GTM_ID`. Sincroniza entre pestañas con `useSyncExternalStore`.
 *
 * @kind client
 * @feature layout
 */
export function CookieConsent() {
  const storedConsent = useSyncExternalStore(
    subscribeToStorage,
    getStoredConsent,
    () => null, // server snapshot
  );

  const [visible, setVisible] = useState(false);

  // Show banner with a delay if no stored consent
  useEffect(() => {
    if (storedConsent !== null) return;
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [storedConsent]);

  const accept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    window.dispatchEvent(new StorageEvent('storage'));
    setVisible(false);
  }, []);

  const reject = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    window.dispatchEvent(new StorageEvent('storage'));
    setVisible(false);
  }, []);

  return (
    <>
      {/* Load analytics only after consent */}
      {storedConsent === 'accepted' && process.env.NEXT_PUBLIC_GTM_ID && (
        <Analytics gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}

      {/* Banner */}
      {visible && storedConsent === null && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-sp-dark/95 backdrop-blur-sm border-t border-white/10 p-4 md:p-5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-sm text-white/80 flex-1">
              Usamos cookies para mejorar tu experiencia y analizar el tráfico.
              Al aceptar, permites el uso de cookies analíticas.{' '}
              <a
                href="https://socialpro.es/privacidad"
                className="underline text-white hover:text-sp-orange transition-colors"
              >
                Política de privacidad
              </a>
            </p>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={reject}
                className="px-4 py-2 text-sm font-semibold text-white/70 hover:text-white border border-white/20 rounded-lg transition-colors"
              >
                Rechazar
              </button>
              <button
                onClick={accept}
                className="px-4 py-2 text-sm font-semibold text-white bg-sp-orange hover:bg-sp-pink rounded-lg transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
