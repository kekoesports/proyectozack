'use client';

import { useActionState } from 'react';
import { controlIntakeAction } from '@/app/admin/(dashboard)/captacion/actions';

export function IntakeControls({ id, version, closed }: { id: string; version: number; closed: boolean }): React.ReactElement {
  const [result, action, pending] = useActionState(controlIntakeAction, { ok: true });
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <div className="flex flex-wrap gap-2">
        <button disabled={pending || closed} name="action" value="take" className="rounded-lg bg-sp-orange px-4 py-2 text-sm text-white disabled:opacity-50">Tomar conversación</button>
        <button disabled={pending || closed} name="action" value="resume" className="rounded-lg border border-sp-admin-border px-4 py-2 text-sm disabled:opacity-50">Devolver al asistente</button>
        <button disabled={pending || closed} name="action" value="close" className="rounded-lg border border-sp-admin-border px-4 py-2 text-sm disabled:opacity-50">Cerrar</button>
      </div>
      <p aria-live="polite" className="text-sm text-sp-admin-muted">{pending ? 'Actualizando…' : result.error ?? 'Continúa respondiendo desde el chat original en tu móvil.'}</p>
    </form>
  );
}
