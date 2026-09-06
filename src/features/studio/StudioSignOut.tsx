'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function StudioSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <button
        className="studio-text-button"
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setError('');
            try {
              const result = await fetch('/api/auth/sign-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
              });
              if (!result.ok) throw new Error('signout');
              router.push('/studio/login');
              router.refresh();
            } catch {
              setError('No se pudo cerrar la sesión.');
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? 'Saliendo…' : 'Salir'}
      </button>
      <span role="status">{error}</span>
    </>
  );
}
