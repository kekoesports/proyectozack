'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  token: string;
  email?: string | undefined;
  alreadyUnsubscribed: boolean;
  invalidToken: boolean;
}

export function UnsubscribeClient({ token, email, alreadyUnsubscribed, invalidToken }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  if (alreadyUnsubscribed) {
    return <Shell><p className="text-white/50 text-sm">Ya estás dado de baja del newsletter.</p><HomeLink /></Shell>;
  }

  if (invalidToken) {
    return <Shell><p className="text-white/50 text-sm">Enlace inválido o caducado.</p><HomeLink /></Shell>;
  }

  if (state === 'done') {
    return (
      <Shell>
        <p className="text-white font-bold text-lg">Baja confirmada.</p>
        <p className="text-white/50 text-sm mt-1">No recibirás más emails de SocialPro News.</p>
        <HomeLink />
      </Shell>
    );
  }

  async function handleUnsubscribe() {
    setState('loading');
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setState('done');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  return (
    <Shell>
      <p className="text-white font-bold text-base">¿Quieres darte de baja?</p>
      {email && <p className="text-white/50 text-sm mt-1">{email}</p>}
      <p className="text-white/40 text-xs mt-2">Dejarás de recibir el newsletter de SocialPro News.</p>

      {state === 'error' && (
        <p className="text-red-400 text-xs mt-3">Algo salió mal. Inténtalo de nuevo.</p>
      )}

      <div className="flex gap-3 mt-5">
        <button
          onClick={() => void handleUnsubscribe()}
          disabled={state === 'loading'}
          className="px-5 py-2 rounded-xl bg-sp-orange text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {state === 'loading' ? 'Procesando…' : 'Confirmar baja'}
        </button>
        <Link href="/news" className="px-5 py-2 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white/70 transition-colors">
          Volver
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-sp-orange mb-4">SocialPro News</p>
        {children}
      </div>
    </div>
  );
}

function HomeLink() {
  return (
    <Link href="/news" className="block mt-4 text-xs text-white/30 hover:text-white/50 transition-colors underline">
      Volver al inicio
    </Link>
  );
}
