'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  DirectTaskForm,
  type DirectTaskFields,
} from '@/lib/schemas/quickNoteForms';
import type { CrmTask } from '@/types';
import { updateTaskPartialAction } from '@/app/admin/(dashboard)/tareas/actions';
import { madridInstant } from '@/lib/quick-notes/time';
import { NoteDialog, noteButton, noteInput } from './NoteDialog';
type Fields = DirectTaskFields;
export function DirectTaskEditor({
  task,
  initialEdit,
}: {
  task: CrmTask;
  initialEdit: boolean;
}) {
  const [open, setOpen] = useState(initialEdit);
  const [error, setError] = useState('');
  const router = useRouter();
  const form = useForm<Fields>({
    resolver: zodResolver(DirectTaskForm),
    values: {
      title: task.title,
      startDate: task.startDate ?? '',
      dueDate: task.dueDate ?? '',
      priority: task.priority,
      status: task.status,
      reminder: task.remindAt
        ? new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Europe/Madrid',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          })
            .format(new Date(task.remindAt))
            .replace(' ', 'T')
        : '',
    },
  });
  return (
    <>
      <button className={noteButton} onClick={() => setOpen(true)}>
        Editar tarea
      </button>
      <NoteDialog open={open} onOpenChange={setOpen} title="Editar tarea">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            void form.handleSubmit(async (values) => {
              setError('');
              const remindAt = values.reminder
                ? madridInstant(values.reminder)
                : null;
              if (values.reminder && !remindAt) {
                setError('Hora inválida o ambigua por el cambio horario.');
                return;
              }
              try {
                const result = await updateTaskPartialAction(task.id, {
                  title: values.title,
                  startDate: values.startDate || null,
                  dueDate: values.dueDate || null,
                  remindAt,
                  priority: values.priority,
                  status: values.status,
                });
                if (result.error) setError(result.error);
                else {
                  setOpen(false);
                  router.refresh();
                }
              } catch {
                setError(
                  'No se pudo guardar. Conservamos los cambios para que reintentes.',
                );
              }
            })(event);
          }}
        >
          <label className="block text-sm">
            Título
            <input
              className={noteInput}
              {...form.register('title', { required: true, maxLength: 200 })}
            />
          </label>
          <label className="block text-sm">
            Fecha de trabajo
            <input
              className={noteInput}
              type="date"
              {...form.register('startDate')}
            />
          </label>
          <label className="block text-sm">
            Fecha límite
            <input
              className={noteInput}
              type="date"
              {...form.register('dueDate')}
            />
          </label>
          <label className="block text-sm">
            Recordatorio (Madrid)
            <input
              className={noteInput}
              type="datetime-local"
              {...form.register('reminder')}
            />
          </label>
          <label className="block text-sm">
            Prioridad
            <select className={noteInput} {...form.register('priority')}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>
          <label className="block text-sm">
            Estado
            <select className={noteInput} {...form.register('status')}>
              {[
                'pendiente',
                'en_progreso',
                'completada',
                'omitida',
                'no_realizada',
                'archivada',
              ].map((s) => (
                <option value={s} key={s}>
                  {s.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          {error && <p role="alert">{error}</p>}
          {Object.keys(form.formState.errors).length > 0 && (
            <p role="alert">Revisa el título y las fechas de la tarea.</p>
          )}
          <button className={noteButton} disabled={form.formState.isSubmitting}>
            Guardar tarea
          </button>
        </form>
      </NoteDialog>
    </>
  );
}
