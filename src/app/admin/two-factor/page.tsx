'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthCard from '@/components/ui/AuthCard';
import { homeForRole } from '@/lib/home-for-role';

type VerificationMode = 'totp' | 'backup';

export default function TwoFactorPage(): React.ReactElement {
  const router = useRouter();
  const [mode, setMode] = useState<VerificationMode>('totp');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'totp'
        ? '/api/auth/two-factor/verify-totp'
        : '/api/auth/two-factor/verify-backup-code';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), trustDevice: false }),
      });
      const data = await response.json().catch(() => null) as {
        message?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.message ?? data?.error ?? 'Código incorrecto o caducado.');
        return;
      }

      let destination = '/admin';
      const sessionResponse = await fetch('/api/auth/get-session');
      if (sessionResponse.ok) {
        const session = await sessionResponse.json() as { user?: { role?: string | null } };
        destination = homeForRole(session.user?.role) ?? '/admin';
      }
      router.refresh();
      router.push(destination);
    } catch {
      setError('No se pudo verificar el código. Vuelve a iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard subtitle="Verificación en dos pasos" backHref="/admin/login" backLabel="Volver al inicio de sesión">
      <form onSubmit={(event) => { void verify(event); }} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">
            {mode === 'totp' ? 'Código de 6 dígitos' : 'Código de recuperación'}
          </label>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode={mode === 'totp' ? 'numeric' : 'text'}
            autoComplete="one-time-code"
            autoFocus
            required
            maxLength={mode === 'totp' ? 6 : 20}
            className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-4 py-3 text-center font-mono tracking-[0.25em] text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-bold text-sp-admin-bg text-sm disabled:opacity-60 bg-sp-admin-accent hover:opacity-90 transition-opacity"
        >
          {loading ? 'Verificando...' : 'Verificar y entrar'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'totp' ? 'backup' : 'totp'); setCode(''); setError(''); }}
          className="w-full text-xs text-sp-admin-muted hover:text-sp-admin-text transition-colors"
        >
          {mode === 'totp' ? 'Usar un código de recuperación' : 'Usar la aplicación de autenticación'}
        </button>
      </form>
    </AuthCard>
  );
}
