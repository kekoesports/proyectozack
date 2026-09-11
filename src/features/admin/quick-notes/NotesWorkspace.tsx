'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { QuickNoteEdit } from '@/lib/schemas/quickNoteForms';
import * as actions from '@/app/admin/(dashboard)/notas/actions';
import { canAssignTasksToOthers } from '@/lib/quick-notes/access';
import { NoteDialog, noteInput, noteButton, noteSecondary } from './NoteDialog';
import { TaskConversion } from './TaskConversion';
import { DeleteNoteButton } from './DeleteNoteButton';

type Detail = Extract<
  Awaited<ReturnType<typeof actions.quickNoteDetailAction>>,
  { ok: true }
>['data'];
export function NotesWorkspace({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
  const [view, setView] = useState<'mine' | 'shared'>('mine');
  const [filter, setFilter] = useState<'all' | 'notes' | 'tasks'>('all');
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ['quick-notes', userId, view, filter, search, archived],
    queryFn: async () => {
      const result = await actions.listQuickNotesAction({
        view,
        filter,
        search,
        archived,
      });
      if (!result.ok) throw Error(result.error);
      return result.data;
    },
  });
  const detail = useQuery({
    queryKey: ['quick-note', userId, selected],
    enabled: !!selected,
    queryFn: async () => {
      const result = await actions.quickNoteDetailAction({ id: selected });
      if (!result.ok) throw Error(result.error);
      return result.data;
    },
  });
  return (
    <section className="space-y-4 text-sp-admin-text">
      <h1 className="text-2xl font-bold">Notas</h1>
      <p className="text-sm text-sp-admin-muted">
        Apunta ahora, organiza después. Solo compartes una nota cuando lo
        decides.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className={view === 'mine' ? noteButton : noteSecondary}
          onClick={() => setView('mine')}
        >
          Mis notas
        </button>
        <button
          className={view === 'shared' ? noteButton : noteSecondary}
          onClick={() => setView('shared')}
        >
          Compartidas conmigo
        </button>
        <label className="text-sm">
          Filtrar
          <select
            className={noteInput}
            value={filter}
            onChange={(e) =>
              setFilter(
                e.target.value === 'tasks'
                  ? 'tasks'
                  : e.target.value === 'notes'
                    ? 'notes'
                    : 'all',
              )
            }
          >
            <option value="all">Todas</option>
            <option value="notes">Solo notas</option>
            <option value="tasks">Vinculadas a tareas</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Archivadas
        </label>
      </div>
      <label className="block text-sm">
        Buscar notas
        <input
          type="search"
          className={noteInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {list.isPending && <p role="status">Cargando notas…</p>}
      {list.isError && <p role="alert">{list.error.message}</p>}
      {list.data?.length === 0 && (
        <p>
          No hay notas con estos filtros. Usa «＋ Nota rápida» para añadir una.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.data?.map(({ note, task, conversion }) => (
          <article
            key={note.id}
            className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 space-y-3"
          >
            <p className="whitespace-pre-wrap break-words text-sm">
              {note.body}
            </p>
            <p className="text-xs text-sp-admin-muted">
              {conversion?.undoneAt
                ? 'Conversión deshecha'
                : task
                  ? 'Tarea · ' + task.status.replaceAll('_', ' ')
                  : conversion
                    ? 'Tarea vinculada (acceso restringido)'
                    : 'Solo nota'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className={noteSecondary}
                onClick={() => setSelected(note.id)}
              >
                Ver nota
              </button>
              {note.ownerId === userId && <DeleteNoteButton note={note} role={role} />}
              {task && (
                <Link
                  className={noteSecondary}
                  href={'/admin/tareas/' + task.id}
                >
                  Abrir tarea
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
      <NoteDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Detalle de nota"
      >
        {detail.isPending && <p>Cargando…</p>}
        {detail.isError && <p role="alert">{detail.error.message}</p>}
        {detail.data && (
          <NoteEditor
            key={detail.data.note.id + ':' + detail.data.note.version}
            detail={detail.data}
            userId={userId}
            role={role}
          />
        )}
      </NoteDialog>
    </section>
  );
}
function NoteEditor({
  detail,
  userId,
  role,
}: {
  detail: Detail;
  userId: string;
  role: string;
}) {
  const cache = useQueryClient();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [convert, setConvert] = useState(false);
  const [share, setShare] = useState(false);
  const form = useForm<{ body: string; userIds: string[] }>({
    resolver: zodResolver(QuickNoteEdit),
    defaultValues: {
      body: detail.note.body,
      userIds: detail.shares.map((s) => s.userId),
    },
  });
  const owner = detail.note.ownerId === userId;
  const options = useQuery({
    queryKey: ['quick-note-options', userId, '/admin/notas'],
    enabled: owner,
    queryFn: async () => {
      const result = await actions.quickNoteOptionsAction('/admin/notas');
      if (!result.ok) throw Error(result.error);
      return result.data;
    },
  });
  const proposal = useQuery({
    queryKey: ['quick-note-proposal', detail.note.id, detail.note.version],
    enabled: convert,
    queryFn: async () => {
      const result = await actions.proposeQuickNoteAction({
        id: detail.note.id,
      });
      if (!result.ok) throw Error(result.error);
      return result.data;
    },
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['quick-note'] }),
      cache.invalidateQueries({ queryKey: ['quick-notes'] }),
    ]);
  };
  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setError('');
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) setError(result.error ?? 'No se pudo guardar.');
        else {
          setMessage('Guardado');
          await refresh();
        }
      } catch {
        setError('No se pudo confirmar el cambio. El texto sigue aquí.');
      }
    });
  };
  return (
    <div className="space-y-3">
      {owner ? (
        <form
          onSubmit={(event) => {
            void form.handleSubmit((values) =>
              run(() =>
                actions.editQuickNoteAction({
                  id: detail.note.id,
                  version: detail.note.version,
                  body: values.body,
                }),
              ),
            )(event);
          }}
          className="space-y-3"
        >
          <label className="block text-sm">
            Texto de la nota
            <textarea
              rows={5}
              className={noteInput}
              {...form.register('body', { required: true, maxLength: 4000 })}
            />
          </label>
          {form.formState.errors.body && (
            <p role="alert">{form.formState.errors.body.message}</p>
          )}
          <p className="text-xs text-sp-admin-muted">
            Editar esta nota no cambia la tarea vinculada.
          </p>
          <button className={noteButton} disabled={pending}>
            Guardar cambios
          </button>
        </form>
      ) : (
        <p className="whitespace-pre-wrap break-words">{detail.note.body}</p>
      )}
      <details className="text-sm">
        <summary>Nota original</summary>
        <p className="whitespace-pre-wrap break-words">
          {detail.note.originalText}
        </p>
      </details>
      {detail.relation && (
        <p className="text-sm">Vinculada a: {detail.relation.label}</p>
      )}
      {detail.task && (
        <Link
          href={'/admin/tareas/' + detail.task.id}
          className={noteSecondary}
        >
          Abrir tarea · {detail.task.status.replaceAll('_', ' ')}
        </Link>
      )}
      {detail.conversion?.undoneAt && (
        <p>
          Conversión deshecha. Se conserva la tarea archivada y el historial.
        </p>
      )}
      {owner && (
        <div className="flex flex-wrap gap-2">
          {!detail.conversion && !detail.note.archivedAt && (
            <button
              className={noteSecondary}
              onClick={() => setConvert(!convert)}
            >
              Convertir en tarea
            </button>
          )}
          {detail.conversion && !detail.conversion.undoneAt && (
            <button
              className={noteSecondary}
              disabled={pending}
              onClick={() =>
                run(() => actions.undoQuickNoteAction({ id: detail.note.id }))
              }
            >
              Deshacer conversión
            </button>
          )}
          <button className={noteSecondary} onClick={() => setShare(!share)}>
            Compartir nota
          </button>
          <button
            className={noteSecondary}
            disabled={pending}
            onClick={() =>
              run(() =>
                actions.archiveQuickNoteAction({
                  id: detail.note.id,
                  archived: !detail.note.archivedAt,
                }),
              )
            }
          >
            {detail.note.archivedAt ? 'Restaurar nota' : 'Archivar nota'}
          </button>
        </div>
      )}
      {share && owner && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            void form.handleSubmit((values) =>
              run(() =>
                actions.shareQuickNoteAction({
                  id: detail.note.id,
                  userIds: values.userIds,
                }),
              ),
            )(event);
          }}
        >
          <p className="text-sm">
            Estas personas podrán leer el texto actual y original. No podrán
            editarlo. Desmarca todas para volver a hacerla privada.
          </p>
          {options.data?.users
            .filter((u) => u.id !== userId)
            .map((u) => (
              <label key={u.id} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  value={u.id}
                  {...form.register('userIds')}
                />
                {u.name}
              </label>
            ))}
          <button className={noteButton} disabled={pending || !options.data}>
            Guardar acceso
          </button>
        </form>
      )}
      {convert && !detail.conversion && options.data && !proposal.isPending && (
        <TaskConversion
          noteId={detail.note.id}
          version={detail.note.version}
          text={detail.note.body}
          userId={userId}
          users={options.data.users}
          suggestion={proposal.data ?? null}
          canAssign={canAssignTasksToOthers(role)}
          onCreated={() => {
            setConvert(false);
            void refresh();
          }}
        />
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
