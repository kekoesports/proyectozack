'use client';

import { useState } from 'react';

interface Props {
  postId:    number;
  postTitle: string;
  totalSubscribers: number;
  alreadySent: boolean;
}

type State = 'idle' | 'confirm' | 'sending' | 'done' | 'error';

export function SendNewsletterButton({ postId, postTitle, totalSubscribers, alreadySent }: Props) {
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (alreadySent) {
    return (
      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-900/30 rounded-full px-2 py-0.5 whitespace-nowrap">
        ✓ Enviada
      </span>
    );
  }

  async function handleSend() {
    setState('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/newsletter/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ postId }),
      });
      const data = await res.json() as { ok?: boolean; sent?: number; failed?: number; error?: string };
      if (res.ok && data.ok) {
        setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
        setState('done');
      } else {
        setErrorMsg(data.error ?? 'Error desconocido.');
        setState('error');
      }
    } catch {
      setErrorMsg('Error de conexión.');
      setState('error');
    }
  }

  if (state === 'done' && result) {
    return (
      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-900/30 rounded-full px-2 py-0.5 whitespace-nowrap">
        ✓ Enviada ({result.sent})
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setState('confirm')}
        className="text-xs font-semibold text-sp-admin-accent hover:underline whitespace-nowrap"
      >
        Enviar NL
      </button>

      {/* Modal de confirmación */}
      {(state === 'confirm' || state === 'sending' || state === 'error') && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && state !== 'sending') setState('idle'); }}
        >
          <div className="w-full max-w-sm bg-sp-admin-card border border-sp-admin-border rounded-2xl p-6 shadow-xl">
            <h2 className="font-display text-xl font-black uppercase text-sp-admin-text mb-1">
              Enviar newsletter
            </h2>
            <p className="text-sm text-sp-admin-muted mb-4 line-clamp-2">&ldquo;{postTitle}&rdquo;</p>

            <div className="rounded-xl bg-sp-admin-bg border border-sp-admin-border px-4 py-3 mb-4">
              <p className="text-[10px] uppercase tracking-widest font-black text-sp-admin-muted">Destinatarios activos</p>
              <p className="text-2xl font-bold text-sp-admin-text tabular-nums mt-0.5">{totalSubscribers}</p>
            </div>

            {state === 'error' && (
              <p className="text-sm text-red-400 mb-3">{errorMsg}</p>
            )}

            <p className="text-xs text-sp-admin-muted mb-4">
              Esta acción enviará el email a todos los suscriptores activos. No se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => void handleSend()}
                disabled={state === 'sending'}
                className="flex-1 py-2.5 rounded-xl bg-sp-orange text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {state === 'sending' ? 'Enviando…' : 'Confirmar envío'}
              </button>
              {state !== 'sending' && (
                <button
                  onClick={() => setState('idle')}
                  className="px-4 py-2.5 rounded-xl border border-sp-admin-border text-sp-admin-muted text-sm hover:text-sp-admin-text transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
