'use client';
import { useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { deleteQuickNoteAction } from '@/app/admin/(dashboard)/notas/actions';
import type { quickNotes } from '@/db/schema/quickNotes';
import { NoteDialog, noteSecondary } from './NoteDialog';

export function DeleteNoteButton({ note, role, onDeletedAction }: {
  note: Pick<typeof quickNotes.$inferSelect, 'id' | 'version' | 'body'>;
  role: string;
  onDeletedAction?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const cache = useQueryClient();
  const router = useRouter();
  if (role !== 'admin' && role !== 'admin_limited_tasks') return null;
  function remove() {
    setError('');
    startTransition(async () => {
      try {
        const result = await deleteQuickNoteAction({ id: note.id, version: note.version, confirmed: true });
        if (!result.ok) { setError(result.error); return; }
        setOpen(false);
        onDeletedAction?.();
        await cache.invalidateQueries({ queryKey: ['quick-notes'] });
        await cache.invalidateQueries({ queryKey: ['quick-note'] });
        router.refresh();
      } catch { setError('No se pudo eliminar la nota. Inténtalo de nuevo.'); }
    });
  }
  return <>
    <button type="button" className="rounded-lg border border-current/20 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10" onClick={() => { setError(''); setOpen(true); }}>Eliminar nota</button>
    <NoteDialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }} title="Eliminar nota">
      <p className="mb-3 text-sm">¿Quieres eliminar esta nota definitivamente? Esta acción no se puede deshacer. Si tiene una tarea vinculada, la tarea se conserva.</p>
      <p className="mb-4 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-sp-admin-border p-3 text-sm">{note.body}</p>
      {error && <p role="alert" className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={noteSecondary} disabled={pending} onClick={() => setOpen(false)}>Cancelar</button>
        <button type="button" className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} onClick={remove}>{pending ? 'Eliminando…' : 'Sí, eliminar nota'}</button>
      </div>
    </NoteDialog>
  </>;
}
