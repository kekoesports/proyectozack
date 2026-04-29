'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { CrmTask, CrmTaskPriority, CrmTaskStatus } from '@/types';
import { createTaskAction, updateTaskAction, type TaskFormInput } from '@/app/admin/(dashboard)/tareas/actions';

type UserOption = {
  readonly id: string;
  readonly name: string;
};

type Props = {
  readonly onCloseAction: () => void;
  readonly task: CrmTask | null;
  readonly users: readonly UserOption[];
  readonly suggestedCategories?: readonly string[];
  readonly defaultOwnerId: string;
  readonly relatedOptions?: unknown;   // mantenido en props para no romper el caller, ignorado internamente
};

const CATEGORIES = [
  'Revenue', 'Operativo', 'Growth', 'Legal',
  'Facturación', 'Gestoría', 'CM', 'Scouting', 'Gestión interna',
] as const;

const PRIORITIES: readonly CrmTaskPriority[] = ['alta', 'media', 'baja'];
const STATUSES: readonly CrmTaskStatus[] = ['pendiente', 'en_progreso', 'completada'];

const PRIORITY_LABELS: Record<CrmTaskPriority, string> = {
  alta:  'Alta',
  media: 'Media',
  baja:  'Baja',
};

const STATUS_LABELS: Record<CrmTaskStatus, string> = {
  pendiente:   'Pendiente',
  en_progreso: 'En progreso',
  completada:  'Completada',
};

export function TaskModal({ onCloseAction, task, users, defaultOwnerId }: Props): React.ReactElement {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [title,       setTitle]       = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [ownerId,     setOwnerId]     = useState(task?.ownerId ?? defaultOwnerId);
  const [dueDate,     setDueDate]     = useState(task?.dueDate ?? '');
  const [priority,    setPriority]    = useState<CrmTaskPriority>(task?.priority ?? 'media');
  const [status,      setStatus]      = useState<CrmTaskStatus>(task?.status ?? 'pendiente');
  const [category,    setCategory]    = useState(task?.category ?? '');
  const [error,       setError]       = useState<string | null>(null);
  const [isPending,   startTransition] = useTransition();

  // Restaurar foco al desmontar
  useEffect(() => {
    const active = document.activeElement;
    const prev = active instanceof HTMLElement && active !== document.body ? active : null;
    return () => { if (prev && document.body.contains(prev)) prev.focus(); };
  }, []);

  // ESC + focus trap
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseAction(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCloseAction]);

  const submit = (): void => {
    if (!title.trim()) { setError('El título es obligatorio'); return; }
    if (!category.trim()) { setError('La categoría es obligatoria'); return; }

    const input: TaskFormInput = {
      title:       title.trim(),
      description: description.trim() || null,
      ownerId,
      dueDate:     dueDate || null,
      priority,
      status,
      category:    category.trim(),
    };

    startTransition(async () => {
      const result = task
        ? await updateTaskAction(task.id, input)
        : await createTaskAction(input);
      if (result?.error) setError(result.error);
      else onCloseAction();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div ref={dialogRef} className="w-full max-w-lg rounded-xl border border-sp-admin-border bg-sp-admin-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border">
          <h2 id={titleId} className="text-base font-bold text-sp-admin-text">
            {task ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button type="button" onClick={onCloseAction} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none transition-colors" aria-label="Cerrar">
            ×
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="p-6 space-y-4">

          {/* Título */}
          <div>
            <label className={LABEL}>Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT}
              autoFocus
              required
              maxLength={200}
              placeholder="¿Qué hay que hacer?"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className={LABEL}>Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${INPUT} resize-none`}
              placeholder="Notas adicionales…"
            />
          </div>

          {/* Asignado + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Asignado</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={INPUT}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Fecha límite</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={INPUT} />
            </div>
          </div>

          {/* Prioridad + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Prioridad</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as CrmTaskPriority)} className={INPUT}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as CrmTaskStatus)} className={INPUT}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className={LABEL}>Categoría *</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
                    category === c
                      ? 'bg-sp-admin-accent text-white border-sp-admin-accent shadow-sm'
                      : 'bg-sp-admin-hover border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text hover:border-sp-admin-accent/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {/* Input por si quiere escribir una categoría libre */}
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${INPUT} mt-2`}
              maxLength={40}
              placeholder="O escribe una categoría personalizada…"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-2 border-t border-sp-admin-border">
            <button
              type="button"
              onClick={onCloseAction}
              className="px-4 py-2 rounded-lg border border-sp-admin-border text-[13px] font-medium text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Guardando…' : task ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const INPUT = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[13px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:border-sp-admin-accent/50 focus:outline-none transition-colors';
const LABEL = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
