'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  quickNoteOptionsAction,
  saveQuickNoteAction,
  undoQuickNoteAction,
} from '@/app/admin/(dashboard)/notas/actions';
import { QuickNoteDraft } from '@/lib/schemas/quickNoteForms';
import type { SaveQuickNote } from '@/lib/schemas/quickNote';
import { canAssignTasksToOthers } from '@/lib/quick-notes/access';
import { NoteDialog, noteInput, noteButton, noteSecondary } from './NoteDialog';
import { TaskConversion, type ConvertedTaskSummary } from './TaskConversion';

type Result = Extract<
  Awaited<ReturnType<typeof saveQuickNoteAction>>,
  { ok: true }
>['data'];
type Saved = Omit<Result, 'warning'> & { warning: string | null };
export function QuickNotePanel({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const changeOpen = (value: boolean) => {
    setOpen(value);
    if (!value) {
      void cache.invalidateQueries({ queryKey: ['quick-notes'] });
      void cache.invalidateQueries({ queryKey: ['quick-note'] });
      router.refresh();
    }
  };
  const [id, setId] = useState(() => crypto.randomUUID());
  const [skipRelation, setSkipRelation] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [convert, setConvert] = useState(false);
  const [undone, setUndone] = useState(false);
  const [summary, setSummary] = useState<ConvertedTaskSummary | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const path = usePathname();
  const form = useForm<Pick<SaveQuickNote, 'body' | 'mode'>>({
    resolver: zodResolver(QuickNoteDraft),
    defaultValues: { body: '', mode: 'auto' },
  });
  const options = useQuery({
    queryKey: ['quick-note-options', userId, path],
    enabled: open,
    queryFn: async () => {
      const result = await quickNoteOptionsAction(path);
      if (!result.ok) throw Error(result.error);
      return result.data;
    },
  });
  const relation = !skipRelation ? options.data?.relation : null;
  const submit = form.handleSubmit((values) => {
    setError('');
    startTransition(async () => {
      try {
        const result = await saveQuickNoteAction({
          id,
          ...values,
          relation: relation ? { type: relation.type, id: relation.id } : null,
        });
        if (!result.ok) setError(result.error);
        else {
          setSaved(result.data);
          setConvert(result.data.suggestion?.kind === 'confirm');
        }
      } catch {
        setError(
          'No se pudo confirmar el guardado. El texto sigue aquí; vuelve a intentarlo.',
        );
      }
    });
  });
  return (
    <>
      <div className="shrink-0">
        <button
          ref={trigger}
          className="rounded border border-amber-300 bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-200"
          onClick={() => setOpen(true)}
        >
          ＋ Nota rápida
        </button>
      </div>
      <NoteDialog
        open={open}
        onOpenChange={changeOpen}
        title="Nota rápida"
        topRight
        finalFocus={trigger}
      >
        {!saved ? (
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
            className="space-y-3"
          >
            <p className="text-xs text-sp-admin-muted">
              Privada. Responsable por defecto: tú. Prioridad media; sin fecha
              salvo que la indiques.
            </p>
            <label className="block text-sm">
              Nota
              <textarea
                autoFocus
                rows={5}
                className={noteInput}
                placeholder="Mañana pedir a Rinna la aprobación de la miniatura…"
                {...form.register('body', { required: true, maxLength: 4000 })}
              />
            </label>
            <label className="block text-sm">
              Modo
              <select className={noteInput} {...form.register('mode')}>
                <option value="auto">Auto</option>
                <option value="note">Solo nota</option>
                <option value="task">Crear tarea</option>
              </select>
            </label>
            {form.formState.errors.body && (
              <p role="alert" className="text-sm text-red-500">
                {form.formState.errors.body.message}
              </p>
            )}
            {relation && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>Vinculada a: {relation.label}</span>
                <button
                  type="button"
                  className={noteSecondary}
                  onClick={() => setSkipRelation(true)}
                >
                  Quitar
                </button>
              </div>
            )}
            {options.isError && (
              <p className="text-xs text-sp-admin-muted">
                No se pudo proponer una relación. Puedes guardar la nota sin
                vínculo.
              </p>
            )}
            <button
              disabled={pending || options.isFetching}
              className={noteButton}
            >
              {pending ? 'Guardando…' : 'Guardar nota'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p role="status" className="font-semibold">
              {saved.taskId ? 'Tarea creada' : 'Nota guardada'}
            </p>
            {saved.warning && (
              <p role="alert" className="text-sm">
                {saved.warning}
              </p>
            )}
            {saved.taskId && (
              <>
                <p className="text-sm">
                  Responsable:{' '}
                  {summary?.assigneeName ??
                    saved.suggestion?.assigneeName ??
                    'Ver tarea'}{' '}
                  · Prioridad {summary?.priority ?? 'media'}
                  {(summary?.startDate ?? saved.suggestion?.startDate)
                    ? ' · Trabajo: ' +
                      (summary?.startDate ?? saved.suggestion?.startDate)
                    : ''}
                  {(summary?.dueDate ?? saved.suggestion?.dueDate)
                    ? ' · Límite: ' +
                      (summary?.dueDate ?? saved.suggestion?.dueDate)
                    : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className={noteSecondary}
                    href={'/admin/tareas/' + saved.taskId}
                    onClick={() => changeOpen(false)}
                  >
                    Abrir tarea
                  </Link>
                  <Link
                    className={noteSecondary}
                    href={'/admin/tareas/' + saved.taskId + '?edit=1'}
                    onClick={() => changeOpen(false)}
                  >
                    Editar
                  </Link>
                  <button
                    className={noteSecondary}
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          const result = await undoQuickNoteAction({
                            id: saved.note.id,
                          });
                          if (!result.ok) setError(result.error);
                          else {
                            setUndone(true);
                            setSaved({
                              ...saved,
                              taskId: null,
                              warning:
                                'Conversión deshecha. La tarea se ha archivado y conservamos su historial.',
                            });
                          }
                        } catch {
                          setError(
                            'No se pudo confirmar el cambio. Reintenta.',
                          );
                        }
                      })
                    }
                  >
                    Deshacer conversión
                  </button>
                </div>
              </>
            )}
            {!saved.taskId && !undone && !convert && (
              <button
                className={noteSecondary}
                onClick={() => setConvert(true)}
              >
                Convertir en tarea
              </button>
            )}
            {!saved.taskId && !undone && convert && (
              <TaskConversion
                noteId={saved.note.id}
                version={saved.note.version}
                text={saved.note.body}
                userId={userId}
                users={options.data?.users ?? [{ id: userId, name: 'Yo' }]}
                suggestion={saved.suggestion}
                canAssign={canAssignTasksToOthers(role)}
                onCreated={(taskId, details) => {
                  setSummary(details);
                  setSaved({ ...saved, taskId });
                  setConvert(false);
                }}
              />
            )}
            <button
              className={noteButton}
              onClick={() => {
                form.reset();
                setSummary(null);
                setUndone(false);
                setSaved(null);
                setConvert(false);
                setId(crypto.randomUUID());
                setSkipRelation(false);
                setError('');
              }}
            >
              Nueva nota
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-500">
            {error}
          </p>
        )}
        <Link
          href="/admin/notas"
          onClick={() => changeOpen(false)}
          className="mt-4 block text-sm text-sp-admin-accent underline"
        >
          Ver mis notas
        </Link>
      </NoteDialog>
    </>
  );
}
