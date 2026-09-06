'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudioToken } from '@/lib/schemas/studio';
import { acceptStudioAccess } from '@/app/studio/actions';
import { StudioLoginForm } from './StudioLoginForm';
export function StudioAccessForm({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  // WHY: invitation secret lives in URL fragment, never sent to server logs or referrers.
  useEffect(() => {
    const parsed = StudioToken.safeParse(window.location.hash.slice(1));
    if (parsed.success) setToken(parsed.data);
  }, []);
  if (!authenticated)
    return (
      <>
        <p>
          Inicia sesión con el correo invitado. Si hay verificación en dos
          pasos, complétala y vuelve a abrir tu enlace de invitación.
        </p>
        <StudioLoginForm inviteToken={token || undefined} />
      </>
    );
  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        void (async () => {
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            const result = await acceptStudioAccess(token);
            if (!result.ok) setError(result.error);
            else {
              window.history.replaceState(null, '', '/studio/access');
              router.push('/studio');
              router.refresh();
            }
          } catch {
            setError('No se pudo confirmar el acceso.');
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <label>
        Código de invitación
        <input
          autoComplete="off"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          maxLength={64}
          required
        />
      </label>
      <button className="studio-button" disabled={busy}>
        {busy ? 'Verificando…' : 'Activar mi espacio'}
      </button>
      <p role="alert" className="studio-error">
        {error}
      </p>
      <p>
        Si no tienes invitación o necesitas recuperar un acceso revocado, habla
        con tu responsable de SocialPro.
      </p>
    </form>
  );
}
