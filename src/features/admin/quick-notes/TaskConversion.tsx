'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { convertQuickNoteAction } from '@/app/admin/(dashboard)/notas/actions';
import {
  TaskProposalForm,
  type TaskProposalFields,
} from '@/lib/schemas/quickNoteForms';
import type { NoteSuggestion } from '@/lib/schemas/quickNote';
import type { NoteUser } from '@/lib/quick-notes/interpret';
import { madridInstant } from '@/lib/quick-notes/time';
import { noteInput, noteButton } from './NoteDialog';

type Fields = TaskProposalFields;
export type ConvertedTaskSummary = {
  assigneeName: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
};
export function TaskConversion({
  noteId,
  version,
  text,
  userId,
  users,
  suggestion,
  canAssign,
  onCreated,
}: {
  noteId: string;
  version: number;
  text: string;
  userId: string;
  users: readonly NoteUser[];
  suggestion?: NoteSuggestion | null;
  canAssign: boolean;
  onCreated: (id: number | null, summary: ConvertedTaskSummary | null) => void;
}) {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const form = useForm<Fields>({
    resolver: zodResolver(TaskProposalForm),
    defaultValues: {
      title: suggestion?.title ?? text.replace(/\s+/g, ' ').slice(0, 200),
      assigneeId: suggestion?.assigneeId ?? userId,
      priority: 'media',
      confirmDisclosure: false,
      start: suggestion?.startDate ?? '',
      due: suggestion?.dueDate ?? '',
      reminder: suggestion?.remindAt
        ? new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Europe/Madrid',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          })
            .format(new Date(suggestion.remindAt))
            .replace(' ', 'T')
        : '',
    },
  });
  const assignee = useWatch({ control: form.control, name: 'assigneeId' });
  const submit = form.handleSubmit((fields) => {
    setError('');
    const reminder = fields.reminder ? madridInstant(fields.reminder) : null;
    if (fields.reminder && !reminder) {
      setError(
        'La hora no es válida o es ambigua por el cambio horario. Elige otra.',
      );
      return;
    }
    startTransition(async () => {
      try {
        const result = await convertQuickNoteAction({
          id: noteId,
          version,
          title: fields.title,
          assigneeId: fields.assigneeId,
          priority: fields.priority,
          startDate: fields.start || null,
          dueDate: fields.due || null,
          remindAt: reminder,
          confirmDisclosure: fields.confirmDisclosure,
        });
        if (!result.ok) setError(result.error);
        else onCreated(result.data.taskId, result.data.summary);
      } catch {
        setError(
          'No se pudo confirmar. La nota sigue guardada; puedes reintentar.',
        );
      }
    });
  });
  return (
    <form
      onSubmit={(event) => {
        void submit(event);
      }}
      className="mt-3 space-y-3 rounded-lg border border-sp-admin-border p-3"
    >
      <p className="text-sm font-semibold">Revisar una tarea</p>
      {suggestion?.reason && (
        <p className="text-sm text-sp-admin-muted">{suggestion.reason}</p>
      )}
      <label className="block text-sm">
        Texto que verá el responsable
        <input
          className={noteInput}
          {...form.register('title', { required: true, maxLength: 200 })}
        />
      </label>
      <label className="block text-sm">
        Responsable
        <select className={noteInput} {...form.register('assigneeId')}>
          {users
            .filter((u) => canAssign || u.id === userId)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.id === userId ? u.name + ' (yo)' : u.name}
              </option>
            ))}
        </select>
      </label>
      <label className="block text-sm">
        Prioridad
        <select className={noteInput} {...form.register('priority')}>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="baja">Baja</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          Fecha de trabajo
          <input
            type="date"
            className={noteInput}
            {...form.register('start')}
          />
        </label>
        <label className="text-sm">
          Fecha límite
          <input type="date" className={noteInput} {...form.register('due')} />
        </label>
      </div>
      <label className="block text-sm">
        Recordatorio (hora de Madrid)
        <input
          type="datetime-local"
          className={noteInput}
          {...form.register('reminder')}
        />
      </label>
      <p className="text-xs text-sp-admin-muted">
        Sin fecha si lo dejas vacío. La nota original permanece privada; el
        responsable verá el texto de tarea mostrado arriba y la relación
        vinculada.
      </p>
      {assignee !== userId && (
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            {...form.register('confirmDisclosure', { required: true })}
          />
          Confirmo que esta persona puede ver ese contenido.
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {Object.keys(form.formState.errors).length > 0 && (
        <p role="alert" className="text-sm text-red-500">
          Revisa el título, las fechas y la confirmación para compartir la
          tarea.
        </p>
      )}
      <button disabled={pending} className={noteButton}>
        {pending ? 'Creando…' : 'Confirmar y crear tarea'}
      </button>
    </form>
  );
}
