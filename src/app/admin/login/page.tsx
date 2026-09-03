'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthCard from '@/components/ui/AuthCard';
import type { PanelBranding } from '@/features/kekopilot-panel/data';
import { homeForRole } from '@/lib/home-for-role';

type StaffLoginProps = {
  readonly panelBranding?: PanelBranding;
  readonly variant?: 'socialpro' | 'kekopilot';
};

export function StaffLogin({ panelBranding, variant = 'socialpro' }: StaffLoginProps): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null) as {
        twoFactorRedirect?: boolean;
        message?: string;
        error?: string;
      } | null;

      if (res.ok) {
        if (data?.twoFactorRedirect === true) {
          router.push('/admin/two-factor');
          return;
        }

        if (variant === 'kekopilot') {
          router.refresh();
          router.push('/');
          return;
        }

        // Resolve role-specific home (staff → mi-semana, finance → facturación, …).
        let dest = '/admin';
        try {
          const sessionRes = await fetch('/api/auth/get-session');
          if (sessionRes.ok) {
            const session = (await sessionRes.json()) as {
              user?: { role?: string | null };
            };
            dest = homeForRole(session.user?.role) ?? '/admin';
          }
        } catch {
          // Fall back to /admin; requirePermission will re-home if needed.
        }
        router.refresh();
        router.push(dest);
      } else {
        setError(data?.message ?? data?.error ?? 'Credenciales incorrectas');
      }
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      subtitle={variant === 'kekopilot' ? 'Command Center' : 'Panel de administración'}
      backHref={variant === 'kekopilot' ? panelBranding?.supportHref ?? 'https://kekopilot.com' : '/admin/forgot-password'}
      backLabel={variant === 'kekopilot' ? 'Solicitar acceso' : '¿Olvidaste tu contraseña?'}
      brand={variant}
      {...(panelBranding ? { panelBranding } : {})}
    >
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
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-4 py-3 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-bold text-sp-admin-bg text-sm disabled:opacity-60 bg-sp-admin-accent hover:opacity-90 transition-opacity"
          style={variant === 'kekopilot' && panelBranding
            ? { color: panelBranding.accentTextColor }
            : undefined}
        >
          {loading ? 'Entrando...' : 'Iniciar sesión'}
        </button>
      </form>
    </AuthCard>
  );
}

export default function AdminLoginPage(): React.ReactElement {
  return <StaffLogin />;
}
