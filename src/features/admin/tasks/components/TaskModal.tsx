'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { CrmTask, CrmTaskPriority, CrmTaskStatus } from '@/types';
import { createTaskAction, updateTaskAction, type TaskFormInput } from '@/app/admin/(dashboard)/tareas/actions';
import type { RelatedOptions } from './RelatedSelector';
import {
  Field,
  PRIORITIES,
  RELATED_TYPE_LABELS,
  STATUSES,
  inputCls,
  type UserOption,
} from './TaskModal.parts';

type Props = {
  readonly onCloseAction: () => void;
  readonly task: CrmTask | null;
  readonly users: readonly UserOption[];
  readonly suggestedCategories?: readonly string[];
  readonly defaultOwnerId: string;
  readonly relatedOptions?: RelatedOptions;
};

/**
 * Modal CRUD de una tarea. Crea (task=null) o edita una tarea existente vía createTaskAction/updateTaskAction.
 * Incluye selección de owner, dueDate, prioridad, estado, categoría y entidad relacionada.
 *
 * @kind client
 * @feature admin/tasks
 */
export function TaskModal({ onCloseAction, task, users, suggestedCategories = [], defaultOwnerId, relatedOptions }: Props): React.ReactElement {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [title,       setTitle]       = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [ownerId,     setOwnerId]     = useState(task?.ownerId ?? defaultOwnerId);
  const [dueDate,     setDueDate]     = useState(task?.dueDate ?? '');
  const [priority,    setPriority]    = useState<CrmTaskPriority>(task?.priority ?? 'media');
  const [status,      setStatus]      = useState<CrmTaskStatus>(task?.status ?? 'pendiente');
  const [category,    setCategory]    = useState(task?.category ?? '');
  const [relatedType, setRelatedType] = useState<string>((task?.relatedType ?? '') as string);
  const [relatedId,   setRelatedId]   = useState<string>(task?.relatedId !== null && task?.relatedId !== undefined ? String(task.relatedId) : '');
  const [relatedSearch, setRelatedSearch] = useState('');
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

  // Lista filtrada por búsqueda
  const relatedList = (() => {
    if (!relatedType || relatedType === 'general' || !relatedOptions) return [];
    const opts = relatedOptions[relatedType as keyof typeof relatedOptions] ?? [];
    if (!relatedSearch) return opts;
    const q = relatedSearch.toLowerCase();
    return opts.filter((o: { id: number | string; label: string }) => o.label.toLowerCase().includes(q));
  })();

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
      relatedType: (relatedType || undefined) as TaskFormInput['relatedType'],
      relatedId:   relatedId ? Number(relatedId) : undefined,
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
          <Field label="Título *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              autoFocus
              required
              maxLength={200}
              placeholder="¿Qué hay que hacer?"
            />
          </Field>

          {/* Descripción */}
          <Field label="Descripción (opcional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Notas adicionales…"
            />
          </Field>

          {/* Asignado + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Asignado">
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>

            <Field label="Fecha límite">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Prioridad">
              <select value={priority} onChange={(e) => setPriority(e.target.value as CrmTaskPriority)} className={inputCls}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <Field label="Estado">
              <select value={status} onChange={(e) => setStatus(e.target.value as CrmTaskStatus)} className={inputCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>

            <div className="col-span-2">
              <Field label="Categoría">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputCls}
                  required
                >
                  <option value="">— Seleccionar categoría —</option>
                  {suggestedCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Relacionado con">
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => { setRelatedType(''); setRelatedId(''); setRelatedSearch(''); }}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${relatedType === '' ? 'bg-sp-admin-accent/10 border-sp-admin-accent text-sp-admin-accent' : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'}`}
                    >
                      Ninguna
                    </button>
                    {(['brand', 'talent', 'campaign', 'invoice', 'general'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => { setRelatedType(k); setRelatedId(''); setRelatedSearch(''); }}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${relatedType === k ? 'bg-sp-admin-accent/10 border-sp-admin-accent text-sp-admin-accent' : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'}`}
                      >
                        {RELATED_TYPE_LABELS[k]}
                      </button>
                    ))}
                  </div>
                  {relatedType && relatedType !== 'general' && (
                    <>
                      <input
                        type="search"
                        value={relatedSearch}
                        onChange={(e) => setRelatedSearch(e.target.value)}
                        placeholder={`Buscar ${RELATED_TYPE_LABELS[relatedType as keyof typeof RELATED_TYPE_LABELS] ?? relatedType}...`}
                        className={inputCls}
                      />
                      <div className="max-h-32 overflow-y-auto rounded-lg border border-sp-admin-border bg-sp-admin-bg">
                        {relatedList.length === 0 ? (
                          <p className="px-3 py-2 text-xs italic text-sp-admin-muted">Sin resultados.</p>
                        ) : (
                          relatedList.map((o: { id: number | string; label: string }) => {
                            const isSel = relatedId === String(o.id);
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => setRelatedId(String(o.id))}
                                className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer ${isSel ? 'bg-sp-admin-accent/15 text-sp-admin-accent font-semibold' : 'text-sp-admin-text hover:bg-sp-admin-hover'}`}
                              >
                                {o.label}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </Field>
            </div>
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
