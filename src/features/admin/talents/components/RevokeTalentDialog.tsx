'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { revokeTalentAction } from '@/app/admin/(dashboard)/talents/revoke-actions';

type Props = {
  readonly talent: { readonly id: number; readonly name: string };
  readonly onClose: () => void;
};

export function RevokeTalentDialog({ talent, onClose }: Props): React.ReactElement {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'archive' | 'delete'>('archive');
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    // WHY: the native modal API traps focus and makes the page behind it inert.
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (step !== 2 || confirmation.trim() !== talent.name.trim() || pending) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await revokeTalentAction({ id: talent.id, mode, acknowledged: true, confirmation });
        if (!result.ok) { setError(result.error); return; }
        onClose();
        router.refresh();
      } catch { setError('No se pudo completar la acción. Vuelve a intentarlo.'); }
    });
  }

  return (
    <dialog ref={dialog} aria-labelledby="revoke-title" aria-describedby="revoke-description"
      onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-sp-admin-border bg-sp-admin-card p-6 text-sp-admin-text shadow-2xl backdrop:bg-black/60">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-admin-muted">Confirmación {step} de 2</p>
      <h2 id="revoke-title" className="text-xl font-bold">{step === 1 ? 'Revocar perfil' : mode === 'archive' ? 'Confirmar archivo' : 'Confirmar borrado permanente'}</h2>
      <p id="revoke-description" className="mt-2 text-sm text-sp-admin-muted">
        {step === 1 ? `Elige qué hacer con el perfil de ${talent.name}.` : `Confirma que quieres ${mode === 'archive' ? 'archivar' : 'borrar'} el perfil de ${talent.name}.`}
      </p>
      {step === 1 ? (
        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer gap-3 rounded-xl border border-sp-admin-border p-4">
            <input type="radio" name="revoke-mode" checked={mode === 'archive'} onChange={() => setMode('archive')} />
            <span><strong className="block text-sm">Archivar perfil · recomendado</strong><span className="text-sm text-sp-admin-muted">Lo oculta de la web y de esta lista. Conserva su historial y permite restaurarlo. Los tratos no se cancelan.</span></span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-red-500/30 p-4">
            <input type="radio" name="revoke-mode" checked={mode === 'delete'} onChange={() => setMode('delete')} />
            <span><strong className="block text-sm text-red-500">Borrar permanentemente</strong><span className="text-sm text-sp-admin-muted">Elimina el perfil, sus redes y sus métricas. No se puede deshacer. Si tiene historial vinculado, deberás archivarlo.</span></span>
          </label>
          <div className="flex flex-wrap justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-sp-admin-border px-4 py-2 text-sm">Cancelar</button>
            <button type="button" onClick={() => { setConfirmation(''); setStep(2); }} className="rounded-lg bg-sp-admin-accent px-4 py-2 text-sm font-bold text-white">Continuar</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <p className="text-sm font-semibold">{mode === 'archive' ? 'Podrás restaurarlo desde «Ver archivados».' : 'Este borrado es definitivo y no se puede deshacer.'}</p>
          <label className="block text-sm" htmlFor="revoke-confirmation">Escribe <strong>{talent.name}</strong> para confirmar:</label>
          <input id="revoke-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)}
            autoComplete="off" disabled={pending} required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2" />
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" disabled={pending} onClick={() => { setStep(1); setConfirmation(''); setError(''); }} className="rounded-lg border border-sp-admin-border px-4 py-2 text-sm disabled:opacity-50">Volver</button>
            <button type="button" disabled={pending} onClick={onClose} className="rounded-lg border border-sp-admin-border px-4 py-2 text-sm disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={pending || confirmation.trim() !== talent.name.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
              {pending ? 'Procesando…' : mode === 'archive' ? 'Archivar perfil' : 'Borrar permanentemente'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
