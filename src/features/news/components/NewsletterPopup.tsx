'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function Tick({ checked }: { checked: boolean }) {
  return (
    <div className={[
      'mt-0.5 shrink-0 w-4 h-4 rounded border transition-all',
      checked ? 'bg-sp-orange border-sp-orange' : 'bg-transparent border-white/20',
    ].join(' ')}>
      {checked && (
        <svg viewBox="0 0 12 12" fill="none" className="w-full h-full p-0.5">
          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

const STORAGE_KEY_DISMISSED   = 'sp_nl_dismissed';
const STORAGE_KEY_SUBSCRIBED   = 'sp_nl_subscribed';
const DISMISS_DAYS   = 14;
const SUBSCRIBED_DAYS = 90;
const TRIGGER_DELAY_MS = 8_000;
const TRIGGER_SCROLL_PCT = 0.45;

function shouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  const now = Date.now();
  const dismissed  = Number(localStorage.getItem(STORAGE_KEY_DISMISSED)  ?? 0);
  const subscribed = Number(localStorage.getItem(STORAGE_KEY_SUBSCRIBED) ?? 0);
  if (subscribed && now - subscribed < SUBSCRIBED_DAYS * 86_400_000) return false;
  if (dismissed  && now - dismissed  < DISMISS_DAYS   * 86_400_000) return false;
  return true;
}

export function NewsletterPopup() {
  const [visible,  setVisible]  = useState(false);
  const [email,    setEmail]    = useState('');
  const [nlCheck,  setNlCheck]  = useState(false);
  const [mktCheck, setMktCheck] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()));
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!shouldShow()) return;

    // Trigger por tiempo
    const timer = setTimeout(() => setVisible(true), TRIGGER_DELAY_MS);

    // Trigger por scroll
    const onScroll = () => {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (pct >= TRIGGER_SCROLL_PCT) {
        clearTimeout(timer);
        setVisible(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nlCheck) { setError('Debes aceptar recibir el newsletter.'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consentNewsletter: true, consentMarketing: mktCheck, honeypot: '' }),
      });
      if (res.ok) {
        localStorage.setItem(STORAGE_KEY_SUBSCRIBED, String(Date.now()));
        setDone(true);
        setTimeout(() => setVisible(false), 3500);
      } else if (res.status === 429) {
        setError('Demasiados intentos. Espera un momento.');
      } else {
        setError('Algo salió mal. Inténtalo de nuevo.');
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suscríbete al newsletter de SocialPro News"
      className={[
        'fixed bottom-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)]',
        'rounded-2xl border border-white/10 bg-[#0d0d0f]/95 backdrop-blur-md',
        'shadow-[0_0_40px_rgba(245,99,42,0.15),0_8px_32px_rgba(0,0,0,0.6)]',
        'transition-all duration-500',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
      ].join(' ')}
    >
      {/* Glow accent top */}
      <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-sp-orange/60 to-transparent" />

      {/* Close */}
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute top-3 right-3 text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
      >
        ✕
      </button>

      <div className="p-5 pt-4">
        {done ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">✓</div>
            <p className="text-white font-bold text-sm">Ya estás dentro.</p>
            <p className="text-white/50 text-xs mt-1">Recibirás las noticias que importan.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-4">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-sp-orange mb-1.5">
                SocialPro News
              </p>
              <h2 className="text-white font-display font-black uppercase text-lg leading-tight">
                Las noticias importantes,<br />antes que nadie.
              </h2>
              <p className="text-white/40 text-[11px] mt-1.5">
                CS2 · Esports · Gaming. Sin ruido.
              </p>
            </div>

            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3">
              {/* Honeypot — oculto para bots */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="sr-only"
                onChange={() => {}}
              />

              {/* Email */}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-sp-orange/50 transition-colors"
              />

              {/* Newsletter (obligatorio) */}
              <button
                type="button"
                onClick={() => setNlCheck(v => !v)}
                className="flex items-start gap-2.5 cursor-pointer text-left w-full"
              >
                <Tick checked={nlCheck} />
                <span className="text-[11px] text-white/50 leading-relaxed">
                  Acepto recibir el newsletter de SocialPro News con noticias de CS2, esports y gaming.{' '}
                  <span className="text-white/30">(Obligatorio)</span>
                </span>
              </button>

              {/* Marketing (opcional) */}
              <button
                type="button"
                onClick={() => setMktCheck(v => !v)}
                className="flex items-start gap-2.5 cursor-pointer text-left w-full"
              >
                <Tick checked={mktCheck} />
                <span className="text-[11px] text-white/50 leading-relaxed">
                  Acepto recibir comunicaciones comerciales de SocialPro sobre campañas y servicios.{' '}
                  <span className="text-white/30">(Opcional)</span>
                </span>
              </button>

              {/* Inputs ocultos para validación del form */}
              {nlCheck && <input type="hidden" name="nl" value="1" />}

              {error && (
                <p className="text-[11px] text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-bold text-[13px] text-white bg-sp-orange hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Enviando…' : 'Entrar al círculo'}
              </button>

              <p className="text-[10px] text-white/25 text-center leading-relaxed">
                Sin spam. Baja cuando quieras.{' '}
                <Link href="/privacidad" className="underline hover:text-white/50 transition-colors">
                  Privacidad
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
