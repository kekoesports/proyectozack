'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import {
  addCreatorReviewNoteAction,
  discardCreatorReviewAction,
  refreshCreatorReviewAction,
  sendCreatorReviewDecisionAction,
  type CreatorReviewActionResult,
} from '@/app/admin/(dashboard)/candidaturas/actions';
import type { CreatorReviewSourceType } from '@/lib/schemas/creator-outreach';

type Props = {
  readonly sourceType: CreatorReviewSourceType;
  readonly sourceId: number;
};

export function CreatorApplicationActions({ sourceType, sourceId }: Props): React.ReactElement {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const retryKey = useRef<string | null>(null);

  const run = (action: () => Promise<CreatorReviewActionResult>): void => {
    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else {
        setFeedback(result.message);
        router.refresh();
      }
    });
  };

  const sendDecision = (decision: 'green' | 'red'): void => {
    const description = decision === 'green'
      ? 'Se enviará la invitación con el enlace de calendario desde arias@socialpro.es.'
      : 'Se enviará el mensaje de no encaje desde arias@socialpro.es.';
    if (!window.confirm(`${description}\n\n¿Confirmas el envío?`)) return;
    const idempotencyKey = retryKey.current ?? crypto.randomUUID();
    retryKey.current = idempotencyKey;
    run(async () => {
      const result = await sendCreatorReviewDecisionAction({ sourceType, sourceId, decision, idempotencyKey });
      if (result.ok) retryKey.current = null;
      return result;
    });
  };

  return (
    <section className="space-y-4 rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
      <div>
        <h2 className="text-sm font-semibold text-sp-admin-text">Acciones</h2>
        <p className="mt-1 text-xs text-sp-admin-muted">Solo los botones de envío mandan correo. Actualizar, anotar y descartar no escriben al creador.</p>
      </div>
      {error ? <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      {feedback ? <p className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{feedback}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => refreshCreatorReviewAction({ sourceType, sourceId }))} className="rounded border border-sp-admin-border px-3 py-2 text-sm text-sp-admin-text hover:bg-sp-admin-hover disabled:opacity-40">Actualizar perfil</button>
        <button type="button" disabled={pending} onClick={() => sendDecision('green')} className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40">Aprobar y enviar llamada</button>
        <button type="button" disabled={pending} onClick={() => sendDecision('red')} className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-40">Enviar no encaja</button>
        <button type="button" disabled={pending} onClick={() => {
          if (window.confirm('Se descartará en el CRM sin enviar ningún email. ¿Continuar?')) run(() => discardCreatorReviewAction({ sourceType, sourceId }));
        }} className="rounded border border-zinc-500/40 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-500/10 disabled:opacity-40">Descartar sin email</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={2_000} placeholder="Añadir nota interna…" className="min-w-[260px] flex-1 rounded border border-sp-admin-border bg-sp-admin-bg2 px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted" />
        <button type="button" disabled={pending || note.trim().length === 0} onClick={() => run(async () => {
          const result = await addCreatorReviewNoteAction({ sourceType, sourceId, note });
          if (result.ok) setNote('');
          return result;
        })} className="self-start rounded border border-sp-admin-border px-3 py-2 text-sm text-sp-admin-text hover:bg-sp-admin-hover disabled:opacity-40">Guardar nota</button>
      </div>
    </section>
  );
}
