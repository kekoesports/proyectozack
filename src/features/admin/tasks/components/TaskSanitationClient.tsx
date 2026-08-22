'use client';

import { useState } from 'react';
import Link from 'next/link';

import { sanitizeTaskAction } from '@/app/admin/(dashboard)/tareas/sanitation-actions';
import type { SanitationQueueRow } from '@/lib/queries/task-sanitation';
import type { SanitationAction } from '@/lib/task-rollover-policy';

type Props = {
  readonly rows: readonly SanitationQueueRow[];
  readonly todayIso: string;
};

export function TaskSanitationClient({ rows, todayIso }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-sp-dark">Saneamiento de tareas</h1>
        <p className="text-sm text-sp-muted">
          Una a una. No hay acción masiva de completar, omitir o archivar.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-sp-muted border border-dashed border-sp-border rounded-lg px-4 py-8 text-center">
          No hay tareas vencidas ni arrastradas.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <SanitationCard row={row} todayIso={todayIso} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SanitationCard({
  row,
  todayIso,
}: {
  readonly row: SanitationQueueRow;
  readonly todayIso: string;
}) {
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState(row.dueDate && row.dueDate > todayIso ? row.dueDate : todayIso);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const overdue = row.dueDate !== null && row.dueDate < todayIso;
  const kind = row.recurrenceTemplateId != null ? 'Recurrente' : 'Puntual';

  async function run(action: SanitationAction): Promise<void> {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set('taskId', String(row.id));
    form.set('action', action);
    if (note.trim()) form.set('note', note.trim());
    if (action === 'reschedule') form.set('dueDate', dueDate);
    const result = await sanitizeTaskAction(form);
    setPending(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <article className="border border-sp-border rounded-xl p-4 space-y-3 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-sp-dark">{row.title}</h2>
          <p className="text-xs text-sp-muted">
            {kind}
            {row.rolledOver ? ' · arrastrada' : ''}
            {overdue && row.dueDate ? ` · vencida ${row.dueDate}` : ''}
            {row.weekLabel ? ` · ${row.weekLabel}` : ''}
          </p>
        </div>
        <Link
          href={`/admin/tareas?t=${row.id}`}
          className="text-xs font-semibold text-sp-orange hover:underline"
        >
          Abrir
        </Link>
      </header>

      <label className="block text-xs text-sp-muted">
        Nueva fecha (reprogramar)
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1 block border border-sp-border rounded-lg px-2 py-1 text-sm text-sp-dark"
        />
      </label>

      <label className="block text-xs text-sp-muted">
        Motivo
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={2}
          className="mt-1 w-full border border-sp-border rounded-lg px-2 py-1.5 text-sm text-sp-dark"
        />
      </label>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <ActionButton pending={pending} onClick={() => { void run('keep'); }}>
          Mantener
        </ActionButton>
        <ActionButton pending={pending} onClick={() => { void run('complete'); }}>
          Completar
        </ActionButton>
        <ActionButton pending={pending} onClick={() => { void run('omit'); }}>
          Omitir
        </ActionButton>
        <ActionButton pending={pending} onClick={() => { void run('reschedule'); }}>
          Reprogramar
        </ActionButton>
        <ActionButton pending={pending} onClick={() => { void run('archive'); }}>
          Archivar
        </ActionButton>
      </div>
    </article>
  );
}

function ActionButton({
  pending,
  onClick,
  children,
}: {
  readonly pending: boolean;
  readonly onClick: () => void;
  readonly children: string;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-sp-border text-sp-dark disabled:opacity-40"
    >
      {children}
    </button>
  );
}
