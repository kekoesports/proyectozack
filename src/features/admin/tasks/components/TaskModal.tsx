'use client';

import { useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';
import type { CrmTask, CrmTaskPriority, CrmTaskStatus, CrmTaskRelatedType } from '@/types';
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
  readonly suggestedCategories: readonly string[];
  readonly defaultOwnerId: string;
  readonly relatedOptions: RelatedOptions;
};

/**
 * Modal CRUD de una tarea. Crea (task=null) o edita una tarea existente vía createTaskAction/updateTaskAction.
 * Incluye selección de owner, dueDate, prioridad, estado, categoría y entidad relacionada.
 *
 * @kind client
 * @feature admin/tasks
 */
export function TaskModal({ onCloseAction, task, users, suggestedCategories, defaultOwnerId, relatedOptions }: Props): React.ReactElement {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [ownerId, setOwnerId] = useState(task?.ownerId ?? defaultOwnerId);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [priority, setPriority] = useState<CrmTaskPriority>(task?.priority ?? 'media');
  const [status, setStatus] = useState<CrmTaskStatus>(task?.status ?? 'pendiente');
  const [category, setCategory] = useState(task?.category ?? '');
  const [relatedType, setRelatedType] = useState<CrmTaskRelatedType | ''>(task?.relatedType ?? '');
  const [relatedId, setRelatedId] = useState<number | ''>(task?.relatedId ?? '');
  const [relatedSearch, setRelatedSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const relatedList = useMemo(() => {
    if (!relatedType) return [] as readonly { id: number; label: string }[];
    const list = relatedOptions[relatedType];
    const q = relatedSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter((o) => o.label.toLowerCase().includes(q));
  }, [relatedType, relatedOptions, relatedSearch]);

  // Restaurar foco al desmontar. Si antes del mount el activeElement era body
  // (deep-link sin trigger), no guardamos nada y el foco se queda donde esté.
  useEffect(() => {
    const active = document.activeElement;
    const prev =
      active instanceof HTMLElement && active !== document.body ? active : null;
    return () => {
      if (prev && document.body.contains(prev)) {
        prev.focus();
      }
    };
  }, []);

  // ESC para cerrar + focus trap (Tab/Shift+Tab cicla dentro del dialog).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseAction();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCloseAction]);

  const submit = (): void => {
    if (!title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    if (!category.trim()) {
      setError('La categoría es obligatoria');
      return;
    }
    if (relatedType && relatedId === '') {
      setError('Selecciona la entidad relacionada o quita el tipo');
      return;
    }

    const input: TaskFormInput = {
      title: title.trim(),
      description: description.trim() || null,
      ownerId,
      dueDate: dueDate || null,
      priority,
      status,
      category: category.trim(),
      ...(relatedType
        ? { relatedType, relatedId: typeof relatedId === 'number' ? relatedId : Number(relatedId) }
        : {}),
    };

    startTransition(async () => {
      const result = task
        ? await updateTaskAction(task.id, input)
        : await createTaskAction(input);
      if (result?.error) {
        setError(result.error);
      } else {
        onCloseAction();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div ref={dialogRef} className="w-full max-w-lg rounded-2xl border border-sp-admin-border bg-sp-admin-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 id={titleId} className="font-display text-xl font-black uppercase text-sp-admin-text">
            {task ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button type="button" onClick={onCloseAction} className="text-sp-admin-muted hover:text-sp-admin-text" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <Field label="Título">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              autoFocus
              required
              maxLength={200}
            />
          </Field>

          <Field label="Descripción (opcional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Asignado">
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
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
                        placeholder={`Buscar ${RELATED_TYPE_LABELS[relatedType].toLowerCase()}...`}
                        className={inputCls}
                      />
                      <div className="max-h-32 overflow-y-auto rounded-lg border border-sp-admin-border bg-sp-admin-bg">
                        {relatedList.length === 0 ? (
                          <p className="px-3 py-2 text-xs italic text-sp-admin-muted">Sin resultados.</p>
                        ) : (
                          relatedList.map((o) => {
                            const isSel = relatedId === o.id;
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => setRelatedId(o.id)}
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCloseAction}
              className="rounded-xl border border-sp-admin-border px-4 py-2 text-sm text-sp-admin-muted hover:text-sp-admin-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-sp-admin-bg disabled:opacity-60"
            >
              {isPending ? 'Guardando…' : task ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
