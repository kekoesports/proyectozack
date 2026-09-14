'use client';
import { useActionState } from 'react';
import { controlIntakeInboxAction } from '@/app/admin/(dashboard)/captacion/inbox-actions';

export function InboxControls({ id, recent }: { id: string; recent: boolean }): React.ReactElement {
  const [result, action, pending] = useActionState(controlIntakeInboxAction, { ok: true });
  return <form action={action} className="mt-2 space-y-2">
    <input name="id" type="hidden" value={id} />
    <div className="flex gap-3">
      {recent && <button name="action" value="retry" disabled={pending} className="underline">Reintentar mensaje reciente</button>}
      <button name="action" value="reviewed" disabled={pending} className="underline">Marcar revisado</button>
    </div>
    <p aria-live="polite">{result.error ?? (pending ? 'Actualizando…' : '')}</p>
  </form>;
}
