'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeTaskAction, deleteTaskAction } from '@/app/admin/(dashboard)/tareas/actions';
import { NoteDialog, noteSecondary } from '@/features/admin/quick-notes/NoteDialog';
import { isOpenTaskStatus } from '@/lib/schemas/task';
import type { CrmTask } from '@/types';

export function TaskCardActions({ task, canDelete }: { task: CrmTask; canDelete: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const run = (action: 'complete' | 'delete') => {
    setError('');
    startTransition(async () => {
      try {
        const result = await (action === 'complete' ? completeTaskAction(task.id) : deleteTaskAction(task.id));
        if (result.error) setError(result.error);
        else { setConfirm(false); router.refresh(); }
      } catch { setError('No se pudo guardar el cambio. Inténtalo de nuevo.'); }
    });
  };
  return (
    <div onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()} className="mt-3 border-t border-sp-admin-border/50 pt-2">
      <div className="flex items-center justify-end gap-2">
        {isOpenTaskStatus(task.status) && <button type="button" disabled={pending} onClick={() => run('complete')} className="rounded px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50">✓ Completar</button>}
        {canDelete && <button type="button" disabled={pending} onClick={() => setConfirm(true)} className="rounded px-2 py-1 text-xs text-sp-admin-muted hover:bg-red-500/10 hover:text-red-500">Eliminar</button>}
      </div>
      {error && !confirm && <p role="alert" className="text-xs text-red-500">{error}</p>}
      <NoteDialog open={confirm} onOpenChange={setConfirm} title="Eliminar tarea">
        <p className="mb-3 text-sm">¿Eliminar «{task.title}»? No se puede deshacer. La nota original se conserva.</p>
        {error && <p role="alert" className="mb-3 text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className={noteSecondary} disabled={pending} onClick={() => setConfirm(false)}>Cancelar</button>
          <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} onClick={() => run('delete')}>Eliminar definitivamente</button>
        </div>
      </NoteDialog>
    </div>
  );
}
