'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  pollTaskNoticesAction,
  changeTaskNoticesAction,
  saveTaskNoticeSettingsAction,
} from '@/app/admin/(dashboard)/notas/actions';
import { NoticeTimeForm, NoticeHoursForm } from '@/lib/schemas/quickNoteForms';
import { madridInstant } from '@/lib/quick-notes/time';
import { NoteDialog, noteButton, noteInput, noteSecondary } from './NoteDialog';
type Settings = { startHour: number; endHour: number; weekdaysOnly: boolean };
export function TaskNotices({ userId }: { userId: string }) {
  const [tabId] = useState(() => crypto.randomUUID());
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const acked = useRef(new Set<number>());
  const query = useQuery({
    queryKey: ['task-notices', userId, tabId],
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      const result = await pollTaskNoticesAction(tabId);
      if (!result.ok) throw Error(result.error);
      return result.data;
    },
  });
  const visible = query.data?.notices.filter((n) => n.claimed) ?? [];
  // ACK after a successful render, not on receipt. Server leases arbitrate competing tabs.
  useEffect(() => {
    const ids =
      query.data?.notices
        .filter((n) => n.claimed && !acked.current.has(n.id))
        .map((n) => n.id) ?? [];
    if (!ids.length) return;
    void changeTaskNoticesAction({ ids, action: 'presented', tabId })
      .then((result) => {
        if (result.ok) ids.forEach((id) => acked.current.add(id));
      })
      .catch(() => undefined);
  }, [query.data, tabId]);
  const form = useForm<{ until: string }>({
    resolver: zodResolver(NoticeTimeForm),
    defaultValues: { until: '' },
  });
  const change = (ids: number[], action: 'read' | 'snooze', until?: string) => {
    setError('');
    startTransition(async () => {
      try {
        const result = await changeTaskNoticesAction({
          ids,
          action,
          tabId,
          ...(until ? { until } : {}),
        });
        if (!result.ok) setError(result.error);
        else {
          ids.forEach((id) => acked.current.delete(id));
          setCustom(false);
          await query.refetch();
        }
      } catch {
        setError('No se pudo guardar el aviso. Vuelve a intentarlo.');
      }
    });
  };
  const ids = visible.map((n) => n.id);
  return (
    <div className="shrink-0 border-b border-sp-admin-border px-4 py-2 text-sp-admin-text">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="underline" onClick={() => setOpen(true)}>
          Avisos de tareas (
          {query.data?.notices.filter((n) => !n.readAt).length ?? 0})
        </button>
        {visible.length > 0 && (
          <div
            role="status"
            data-testid="task-notice-banner"
            className="flex flex-wrap items-center gap-2"
          >
            <strong>
              {visible.length}{' '}
              {visible.length === 1 ? 'tarea requiere' : 'tareas requieren'}{' '}
              atención
            </strong>
            <button className={noteSecondary} onClick={() => setOpen(true)}>
              Ver tareas
            </button>
            <button
              className={noteSecondary}
              disabled={pending}
              onClick={() =>
                change(
                  ids,
                  'snooze',
                  new Date(Date.now() + 3_600_000).toISOString(),
                )
              }
            >
              Recordar en 1 hora
            </button>
            <button
              className={noteSecondary}
              onClick={() => {
                setCustom(true);
                setOpen(true);
              }}
            >
              Otro momento
            </button>
            <button
              className={noteSecondary}
              disabled={pending}
              onClick={() => change(ids, 'read')}
            >
              Cerrar aviso
            </button>
          </div>
        )}
        {query.isError && (
          <span role="alert">No se pudieron cargar los avisos.</span>
        )}
      </div>
      <NoteDialog open={open} onOpenChange={setOpen} title="Avisos de tareas">
        <p className="mb-3 text-sm text-sp-admin-muted">
          Cerrar marca el aviso como leído; no completa la tarea. Avisos dentro
          del CRM, en horario de Madrid.
        </p>
        {query.data?.notices.length === 0 && <p>No hay avisos pendientes.</p>}
        <div className="space-y-3">
          {query.data?.notices.map((notice) => (
            <article
              key={notice.id}
              className="rounded-lg border border-sp-admin-border p-3 text-sm space-y-2"
            >
              <Link
                href={'/admin/tareas/' + notice.taskId}
                onClick={() => setOpen(false)}
                className="font-semibold underline"
              >
                {notice.title}
              </Link>
              <p>
                {notice.type === 'important_task_overdue'
                  ? 'Prioridad alta · vencida ' + notice.dueDate
                  : 'Recordatorio programado'}
              </p>
              <p>
                {notice.readAt
                  ? 'Aviso leído'
                  : notice.snoozedUntil
                    ? 'Pospuesto hasta ' +
                      new Date(notice.snoozedUntil).toLocaleString('es-ES', {
                        timeZone: 'Europe/Madrid',
                      })
                    : 'Pendiente de lectura'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={noteSecondary}
                  disabled={pending}
                  onClick={() => change([notice.id], 'read')}
                >
                  Marcar leído
                </button>
                <button
                  className={noteSecondary}
                  disabled={pending}
                  onClick={() =>
                    change(
                      [notice.id],
                      'snooze',
                      new Date(Date.now() + 3_600_000).toISOString(),
                    )
                  }
                >
                  Recordar en 1 hora
                </button>
              </div>
            </article>
          ))}
        </div>
        {query.data?.notices.length ? (
          <button
            className={noteSecondary + ' mt-3'}
            onClick={() => setCustom(!custom)}
          >
            Elegir otro momento para los avisos no leídos
          </button>
        ) : null}
        {custom && (
          <form
            className="space-y-2 my-3"
            onSubmit={(event) => {
              void form.handleSubmit((value) => {
                const until = madridInstant(value.until);
                if (!until) {
                  setError(
                    'Hora inválida o ambigua por el cambio horario. Elige otra.',
                  );
                  return;
                }
                const unread =
                  query.data?.notices
                    .filter((n) => !n.readAt)
                    .map((n) => n.id) ?? [];
                if (unread.length) change(unread, 'snooze', until);
              })(event);
            }}
          >
            <label className="text-sm">
              Recordar el día y hora (Madrid)
              <input
                className={noteInput}
                type="datetime-local"
                {...form.register('until', { required: true })}
              />
            </label>
            <button className={noteButton} disabled={pending}>
              Posponer avisos
            </button>
          </form>
        )}
        {query.data && (
          <NoticeSettingsForm
            settings={query.data.settings}
            onSaved={() => {
              void query.refetch();
            }}
          />
        )}
        {error && (
          <p role="alert" className="mt-3">
            {error}
          </p>
        )}
      </NoteDialog>
    </div>
  );
}
function NoticeSettingsForm({
  settings,
  onSaved,
}: {
  settings: Settings;
  onSaved: () => void;
}) {
  const form = useForm<Settings>({
    resolver: zodResolver(NoticeHoursForm),
    defaultValues: settings,
  });
  const [message, setMessage] = useState('');
  return (
    <details className="mt-4 border-t border-sp-admin-border pt-3 text-sm">
      <summary>Horario de avisos · Europe/Madrid</summary>
      <form
        className="space-y-3 mt-2"
        onSubmit={(event) => {
          void form.handleSubmit(async (values) => {
            try {
              const result = await saveTaskNoticeSettingsAction({
                ...values,
                timezone: 'Europe/Madrid',
              });
              setMessage(result.ok ? 'Horario guardado.' : result.error);
              if (result.ok) onSaved();
            } catch {
              setMessage('No se pudo guardar el horario.');
            }
          })(event);
        }}
      >
        <label className="block">
          Desde las
          <input
            className={noteInput}
            type="number"
            min={0}
            max={23}
            {...form.register('startHour', { valueAsNumber: true })}
          />
        </label>
        <label className="block">
          Hasta las
          <input
            className={noteInput}
            type="number"
            min={1}
            max={24}
            {...form.register('endHour', { valueAsNumber: true })}
          />
        </label>
        <label className="flex gap-2">
          <input type="checkbox" {...form.register('weekdaysOnly')} />
          Solo de lunes a viernes
        </label>
        <button className={noteButton} disabled={form.formState.isSubmitting}>
          Guardar horario
        </button>
        <p role="status">{message}</p>
        {Object.keys(form.formState.errors).length > 0 && (
          <p role="alert">
            Indica un horario válido, con la hora final posterior a la inicial.
          </p>
        )}
      </form>
    </details>
  );
}
