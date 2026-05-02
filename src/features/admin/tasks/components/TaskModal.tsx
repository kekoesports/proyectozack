'use client';

import { useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';
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
  readonly defaultCategory?: string;
};

const RELATED_SEARCH_TYPES = ['brand', 'talent', 'campaign'] as const;
const RELATED_SEARCH_LABELS: Record<typeof RELATED_SEARCH_TYPES[number], string> = {
  brand: 'Marcas', talent: 'Talentos', campaign: 'Campañas',
};

/**
 * Modal CRUD de una tarea. Muestra campos primarios (título, asignado, fecha, prioridad)
 * y sección secundaria colapsable (descripción, categoría, estado, relacionado con).
 * La categoría es opcional y por defecto "General".
 * El campo "relacionado con" usa un buscador unificado sobre marcas, talentos y campañas.
 *
 * @kind client
 * @feature admin/tasks
 */
export function TaskModal({
  onCloseAction,
  task,
  users,
  suggestedCategories = [],
  defaultOwnerId,
  relatedOptions,
  defaultCategory,
}: Props): React.ReactElement {
  const titleId   = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [title,       setTitle]       = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [ownerId,     setOwnerId]     = useState(task?.ownerId ?? defaultOwnerId);
  const [dueDate,     setDueDate]     = useState(task?.dueDate ?? '');
  const [priority,    setPriority]    = useState<CrmTaskPriority>(task?.priority ?? 'media');
  const [status,      setStatus]      = useState<CrmTaskStatus>(task?.status ?? 'pendiente');
  const [category,    setCategory]    = useState(task?.category ?? defaultCategory ?? 'General');
  const [relatedType, setRelatedType] = useState<string>((task?.relatedType ?? '') as string);
  const [relatedId,   setRelatedId]   = useState<string>(
    task?.relatedId !== null && task?.relatedId !== undefined ? String(task.relatedId) : '',
  );
  const [relatedSearch, setRelatedSearch] = useState('');
  const [error,       setError]       = useState<string | null>(null);
  const [isPending,   startTransition] = useTransition();

  // Auto-abrir sección avanzada si la tarea tiene campos secundarios
  const [showAdvanced, setShowAdvanced] = useState(() => {
    if (!task) return false;
    return !!(task.description?.trim() || (task.category && task.category !== 'General') || task.relatedType);
  });

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
      const last  = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && active === first)  { e.preventDefault(); last.focus();  }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCloseAction]);

  // Buscador unificado: filtra marca, talento y campaña a la vez
  const relatedSearchResults = useMemo(() => {
    const q = relatedSearch.trim().toLowerCase();
    if (q.length < 1 || !relatedOptions) return [];
    const results: Array<{ rtype: typeof RELATED_SEARCH_TYPES[number]; id: number; label: string }> = [];
    for (const rtype of RELATED_SEARCH_TYPES) {
      for (const o of relatedOptions[rtype]) {
        if (o.label.toLowerCase().includes(q)) results.push({ rtype, id: Number(o.id), label: o.label });
      }
    }
    return results.slice(0, 12);
  }, [relatedOptions, relatedSearch]);

  // Label de la entidad relacionada seleccionada
  const selectedRelatedLabel = useMemo(() => {
    if (!relatedType || !relatedId) return null;
    if (relatedType === 'general') return 'General';
    if (!relatedOptions) return null;
    const opts = relatedOptions[relatedType as keyof RelatedOptions] ?? [];
    const opt  = opts.find((o) => String(o.id) === relatedId);
    if (!opt) return null;
    const typeLabel = RELATED_TYPE_LABELS[relatedType as keyof typeof RELATED_TYPE_LABELS] ?? relatedType;
    return `${typeLabel} · ${opt.label}`;
  }, [relatedType, relatedId, relatedOptions]);

  // ¿Hay algún campo secundario relleno?
  const hasSecondaryData = !!(description || category !== 'General' || relatedType);

  const clearRelated = (): void => { setRelatedType(''); setRelatedId(''); setRelatedSearch(''); };

  const submit = (): void => {
    if (!title.trim()) { setError('El título es obligatorio'); return; }

    const input: TaskFormInput = {
      title:       title.trim(),
      description: description.trim() || null,
      ownerId,
      dueDate:     dueDate || null,
      priority,
      status,
      category:    category.trim() || 'General',
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
          <button
            type="button"
            onClick={onCloseAction}
            className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="p-6 space-y-4">

          {/* ── Campos primarios ──────────────────────────────── */}

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CrmTaskPriority)}
                className={inputCls}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Toggle sección avanzada ───────────────────────── */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text transition-colors"
          >
            <svg
              width="10" height="10" viewBox="0 0 10 10"
              className={`transition-transform duration-150 ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
              aria-hidden
            >
              <path d="M2 3.5L5 6.5L8 3.5" />
            </svg>
            {showAdvanced ? 'Menos opciones' : 'Más opciones'}
            {hasSecondaryData && !showAdvanced && (
              <span className="w-1.5 h-1.5 rounded-full bg-sp-admin-accent" aria-hidden />
            )}
          </button>

          {/* ── Sección avanzada (colapsable) ────────────────── */}
          {showAdvanced && (
            <div className="space-y-4 pt-1 border-t border-sp-admin-border/60">

              <Field label="Descripción">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={`${inputCls} resize-none`}
                  placeholder="Notas adicionales…"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoría">
                  <input
                    list="task-category-suggestions"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputCls}
                    placeholder="General"
                    maxLength={40}
                  />
                  <datalist id="task-category-suggestions">
                    <option value="General" />
                    {suggestedCategories
                      .filter((c) => c !== 'General')
                      .map((c) => <option key={c} value={c} />)}
                  </datalist>
                </Field>

                <Field label="Estado">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CrmTaskStatus)}
                    className={inputCls}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Relacionado con — buscador unificado */}
              {relatedOptions && (
                <Field label="Relacionado con">
                  {selectedRelatedLabel ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sp-admin-hover border border-sp-admin-border px-3 py-1 text-xs font-semibold text-sp-admin-text">
                        {selectedRelatedLabel}
                        <button
                          type="button"
                          onClick={clearRelated}
                          className="text-sp-admin-muted hover:text-red-500 transition-colors leading-none"
                          aria-label="Quitar relación"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="search"
                        value={relatedSearch}
                        onChange={(e) => setRelatedSearch(e.target.value)}
                        placeholder="Buscar marca, talento o campaña…"
                        className={inputCls}
                        autoComplete="off"
                      />
                      {relatedSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-sp-admin-border bg-sp-admin-card shadow-lg">
                          {RELATED_SEARCH_TYPES.map((rtype) => {
                            const items = relatedSearchResults.filter((r) => r.rtype === rtype);
                            if (items.length === 0) return null;
                            return (
                              <div key={rtype}>
                                <div className="sticky top-0 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-sp-admin-muted bg-sp-admin-bg/90 border-b border-sp-admin-border/40">
                                  {RELATED_SEARCH_LABELS[rtype]}
                                </div>
                                {items.map((r) => (
                                  <button
                                    key={`${r.rtype}:${r.id}`}
                                    type="button"
                                    onClick={() => {
                                      setRelatedType(r.rtype);
                                      setRelatedId(String(r.id));
                                      setRelatedSearch('');
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Field>
              )}

            </div>
          )}

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
