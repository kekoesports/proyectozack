'use client';

import { useState } from 'react';
import AuthCard from '@/components/ui/AuthCard';

export default function ForgotPasswordPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await fetch('/api/auth/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: '/admin/reset-password' }),
      });
      // Always show success to avoid email enumeration
      setSent(true);
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard subtitle="Restablecer contraseña" backHref="/admin/login" backLabel="Volver al login">
      {sent ? (
        <p className="text-sm text-sp-admin-text text-center">
          Si el email está registrado, recibirás un enlace en breve. Revisa tu bandeja de entrada.
        </p>
      ) : (
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-4 py-3 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-bold text-sp-admin-bg text-sm disabled:opacity-60 bg-sp-admin-accent hover:opacity-90 transition-opacity"
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
