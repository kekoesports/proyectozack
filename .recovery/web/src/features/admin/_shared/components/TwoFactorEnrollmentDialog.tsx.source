'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TwoFactorSetup } from '@/app/admin/(dashboard)/seguridad/TwoFactorSetup';

export function TwoFactorEnrollmentDialog({ email }: { readonly email: string }): React.ReactElement {
  const dialog = useRef<HTMLDialogElement>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function signOut(): Promise<void> {
    try {
      const response = await fetch('/api/auth/sign-out', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('sign-out-failed');
      window.location.assign('/admin/login');
    } catch { setError('No se pudo cerrar la sesión. Inténtalo de nuevo.'); }
  }
  useEffect(() => {
    // WHY: the native modal API provides focus trapping and an inert background.
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="enrollment-title" onCancel={event => event.preventDefault()}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-sp-admin-border bg-sp-admin-bg p-5 text-sp-admin-text shadow-2xl backdrop:bg-black/60 sm:p-8">
      <h1 id="enrollment-title" className="text-xl font-bold">Protege tu acceso al CRM</h1>
      <p className="mb-5 mt-2 text-sm text-sp-admin-muted">
        Ya has iniciado sesión con tu contraseña. Configura ahora la verificación en dos pasos
        y guarda tus códigos de recuperación para continuar.
      </p>
      <TwoFactorSetup email={email} initiallyEnabled={false} onVerified={() => setVerified(true)} />
      {verified && <button type="button" onClick={() => router.refresh()}
        className="mt-5 rounded-lg bg-sp-orange px-4 py-3 text-sm font-semibold text-white">
        He guardado los códigos. Entrar al CRM
      </button>}
      <button type="button" onClick={() => { void signOut(); }} className="mt-4 block text-sm text-sp-admin-muted underline">Cerrar sesión</button>
      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
    </dialog>
  );
}
