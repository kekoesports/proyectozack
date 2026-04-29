'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as Popover from '@radix-ui/react-popover';
import type { CrmTask, CrmTaskPriority, CrmTaskStatus } from '@/types';
import type { RelatedLabel } from '@/lib/queries/crmTasks';
import { Avatar } from '@/components/admin/Avatar';
import { PriorityBadge } from './PriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskModal } from './TaskModal';
import {
  bulkDeleteTasksAction,
  completeTaskAction,
  deleteTaskAction,
  updateTaskPartialAction,
} from '@/app/admin/(dashboard)/tareas/actions';
import { CRM_TASK_PRIORITIES, CRM_TASK_STATUSES } from '@/lib/schemas/task';
import { TEMPLATE_TITLES } from '@/lib/taskTemplates';

type UserOption = {
  readonly id: string;
  readonly name: string;
};

type Props = {
  readonly tasks: readonly CrmTask[];
  readonly users: readonly UserOption[];
  readonly currentUserId: string;
  readonly suggestedCategories?: readonly string[];
  readonly weekLabel: string;
  readonly relatedOptions?: unknown;
  readonly relatedLabels?: ReadonlyMap<string, RelatedLabel> | undefined;
};

// Ocultar tareas generadas por tests automáticos (e.g. E2E Task 1777316726545)
const TEST_TASK_RE = /^(E2E\s+Task\s+\d+|Test\s+Task\b|Demo\s+Task\b)/i;
function isTestTask(title: string): boolean {
  return TEST_TASK_RE.test(title.trim());
}

type StatusFilter = 'todos' | CrmTaskStatus | 'vencida';

type Feedback = {
  readonly kind: 'ok' | 'error';
  readonly message: string;
};

type FieldPatch =
  | { readonly priority: CrmTaskPriority }
  | { readonly status: CrmTaskStatus }
  | { readonly ownerId: string };

const STATUS_TABS: readonly { readonly key: StatusFilter; readonly label: string }[] = [
  { key: 'todos',       label: 'Todas' },
  { key: 'pendiente',   label: 'Pendientes' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'completada',  label: 'Completadas' },
  { key: 'vencida',     label: 'Vencidas' },
];

const PRIORITY_LABELS: Record<CrmTaskPriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const STATUS_LABELS: Record<CrmTaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
};

const FIELD_LABELS: Record<'priority' | 'status' | 'ownerId', string> = {
  priority: 'Prioridad',
  status: 'Estado',
  ownerId: 'Asignado',
};

function fieldLabel(key: string | undefined): string {
  if (key === 'priority' || key === 'status' || key === 'ownerId') {
    return FIELD_LABELS[key];
  }
  return 'Campo';
}

const POPOVER_PANEL_CLS =
  'rounded-xl border border-sp-admin-border bg-white shadow-xl p-1 min-w-[160px] z-50';

const OPTION_CLS =
  'w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-sp-admin-text hover:bg-sp-admin-hover focus-visible:bg-sp-admin-hover focus-visible:outline-none data-[selected=true]:bg-sp-admin-accent/10 data-[selected=true]:text-sp-admin-accent';

// Colores semánticos por categoría (spec actualizado)
const CATEGORY_STYLES: Record<string, string> = {
  'revenue':          'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'operativo':        'bg-sky-50 text-sky-700 border border-sky-200',
  'growth':           'bg-purple-50 text-purple-700 border border-purple-200',
  'legal':            'bg-orange-50 text-orange-700 border border-orange-200',
  'facturación':      'bg-teal-50 text-teal-700 border border-teal-200',
  'facturacion':      'bg-teal-50 text-teal-700 border border-teal-200',
  'gestoría':         'bg-amber-50 text-amber-700 border border-amber-200',
  'gestoria':         'bg-amber-50 text-amber-700 border border-amber-200',
  'cm':               'bg-pink-50 text-pink-700 border border-pink-200',
  'scouting':         'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'gestión interna':  'bg-slate-100 text-slate-600 border border-slate-200',
  // Legacy
  'general':          'bg-slate-100 text-slate-600 border border-slate-200',
  'influencer':       'bg-purple-50 text-purple-700 border border-purple-200',
  'marca':            'bg-sky-50 text-sky-700 border border-sky-200',
};

function categoryStyle(cat: string): string {
  return CATEGORY_STYLES[cat.toLowerCase()] ?? 'bg-sp-admin-hover text-sp-admin-muted border border-sp-admin-border';
}

function formatDueDate(dueDate: string | null): { text: string; cls: string } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)  return { text: `Venció ${due.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`, cls: 'bg-red-50 text-red-600 border border-red-200' };
  if (diff === 0) return { text: 'Hoy',    cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
  if (diff === 1) return { text: 'Mañana', cls: 'bg-sky-50 text-sky-700 border border-sky-200' };
  return { text: due.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), cls: 'bg-sp-admin-hover text-sp-admin-muted border border-sp-admin-border' };
}

export function TaskList({
  tasks,
  users,
  currentUserId,
  weekLabel,
  suggestedCategories,
  relatedLabels,
}: Props): React.ReactElement {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('todos');
  const [ownerFilter, setOwnerFilter]     = useState<string>('todos');
  const [priorityFilter, setPriorityFilter] = useState<CrmTaskPriority | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selected, setSelected]           = useState<ReadonlySet<number>>(new Set());
  const [creating, setCreating]           = useState(false);
  const [feedback, setFeedback]           = useState<Feedback | null>(null);
  const [isPending, startTransition]      = useTransition();
  const selectAllRef                      = useRef<HTMLInputElement>(null);

  const activeId = searchParams.get('t');
  const editingTask = useMemo<CrmTask | null>(() => {
    if (!activeId) return null;
    return tasks.find((t) => String(t.id) === activeId) ?? null;
  }, [tasks, activeId]);
  const modalOpen = creating || editingTask !== null;

  // Si `?t=<id>` no resuelve a una tarea visible, limpiar el param.
  useEffect(() => {
    if (activeId && editingTask === null) {
      router.replace(pathname, { scroll: false });
    }
  }, [activeId, editingTask, router, pathname]);

  // Auto-ocultar el feedback tras 4s.
  useEffect(() => {
    if (feedback === null) return;
    const handle = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(handle);
  }, [feedback]);

  const usersById = useMemo(() => {
    const map = new Map<string, UserOption>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const needle   = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (isTestTask(t.title)) return false;
      if (statusFilter === 'vencida') {
        if (t.status === 'completada' || !t.dueDate || t.dueDate >= todayStr) return false;
      } else if (statusFilter !== 'todos') {
        if (t.status !== statusFilter) return false;
      }
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (categoryFilter && t.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (ownerFilter !== 'todos' && t.ownerId !== ownerFilter) return false;
      if (needle && !t.title.toLowerCase().includes(needle) && !t.category.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, categoryFilter, ownerFilter, search]);

  const counts = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const visible = tasks.filter((t) => !isTestTask(t.title));
    return {
      todos:       visible.length,
      pendiente:   visible.filter((t) => t.status === 'pendiente').length,
      en_progreso: visible.filter((t) => t.status === 'en_progreso').length,
      completada:  visible.filter((t) => t.status === 'completada').length,
      vencida:     visible.filter((t) => t.status !== 'completada' && !!t.dueDate && t.dueDate < todayStr).length,
    };
  }, [tasks]);

  // ── Selección masiva ─────────────────────────────────────────────────
  const allFilteredIds   = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const allSelected      = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const someSelected     = !allSelected && allFilteredIds.some((id) => selected.has(id));
  const selectedInView   = allFilteredIds.filter((id) => selected.has(id));

  // Efecto: estado indeterminado del checkbox de cabecera
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = (): void => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allFilteredIds));
    }
  };

  const toggleSelectOne = (id: number): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = (): void => {
    const ids = [...selectedInView];
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar ${ids.length} ${ids.length === 1 ? 'tarea' : 'tareas'} seleccionadas? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await bulkDeleteTasksAction(ids);
      setSelected(new Set());
      if (result?.error) {
        setFeedback({ kind: 'error', message: result.error });
      } else {
        setFeedback({ kind: 'ok', message: `${ids.length} ${ids.length === 1 ? 'tarea eliminada' : 'tareas eliminadas'}` });
      }
    });
  };

  const openCreate = (): void => {
    setCreating(true);
  };

  const openEdit = (task: CrmTask): void => {
    router.replace(`${pathname}?t=${task.id}`, { scroll: false });
  };

  const closeModal = (): void => {
    if (creating) {
      setCreating(false);
      return;
    }
    router.replace(pathname, { scroll: false });
  };

  const toggleComplete = (task: CrmTask): void => {
    if (task.status === 'completada') return; // re-open flow not in Fase 1
    startTransition(async () => {
      const result = await completeTaskAction(task.id);
      if (result?.error) {
        setFeedback({ kind: 'error', message: result.error });
      } else {
        setFeedback({ kind: 'ok', message: 'Tarea completada' });
      }
    });
  };

  const remove = (task: CrmTask): void => {
    if (!confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteTaskAction(task.id);
      if (result?.error) {
        setFeedback({ kind: 'error', message: result.error });
      } else {
        setFeedback({ kind: 'ok', message: 'Tarea eliminada' });
      }
    });
  };

  const handleFieldChange = (taskId: number, patch: FieldPatch): void => {
    startTransition(async () => {
      const result = await updateTaskPartialAction(taskId, patch);
      if (result?.error) {
        setFeedback({ kind: 'error', message: result.error });
      } else {
        const entry = Object.keys(patch)[0];
        setFeedback({ kind: 'ok', message: `${fieldLabel(entry)} actualizado` });
      }
    });
  };

  const modalTask: CrmTask | null = editingTask;

  const INPUT_CLS = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Tabs de estado */}
        <div className="flex items-center gap-1 bg-sp-admin-card border border-sp-admin-border rounded-lg p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  active
                    ? 'bg-sp-admin-accent text-white shadow-sm'
                    : 'text-sp-admin-muted hover:text-sp-admin-text'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-[9px] tabular-nums ${active ? 'text-white/70' : 'text-sp-admin-muted/60'}`}>
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Búsqueda + filtros + CTA */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarea…"
            className={INPUT_CLS}
          />
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className={INPUT_CLS}>
            <option value="todos">Todos los miembros</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as CrmTaskPriority | '')} className={INPUT_CLS}>
            <option value="">Toda prioridad</option>
            {CRM_TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
          {suggestedCategories && suggestedCategories.length > 0 && (
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={INPUT_CLS}>
              <option value="">Toda categoría</option>
              {suggestedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors"
          >
            + Nueva tarea
          </button>
        </div>
      </div>

      {/* Barra de acciones masivas */}
      {selectedInView.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
          <span className="text-[12px] font-semibold text-red-800">
            {selectedInView.length} {selectedInView.length === 1 ? 'tarea seleccionada' : 'tareas seleccionadas'}
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            Eliminar seleccionadas
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="h-7 px-3 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
          >
            Cancelar selección
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
              {/* Checkbox seleccionar todo */}
              <th className="px-3 py-2.5 w-8">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Seleccionar todas las tareas visibles"
                  className="rounded accent-sp-admin-accent cursor-pointer"
                />
              </th>
              <th className="px-3 py-2.5 w-8" />
              <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Título</th>
              <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted hidden md:table-cell">Prioridad</th>
              <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Estado</th>
              <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted hidden lg:table-cell">Categoría</th>
              <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted hidden lg:table-cell">Límite</th>
              <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted hidden xl:table-cell">Asignado</th>
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sp-admin-border/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sp-admin-muted text-sm">
                  No hay tareas que cumplan los filtros.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const owner = usersById.get(t.ownerId);
                const mine = t.ownerId === currentUserId;
                const isDone = t.status === 'completada';
                const dueFmt = formatDueDate(t.dueDate);
                const isSelected = selected.has(t.id);
                const isOverdue = dueFmt !== null && t.dueDate !== null && new Date(t.dueDate) < new Date() && !isDone;
                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-sp-admin-hover transition-colors ${
                      isSelected ? 'bg-sp-admin-accent/[0.06]' : isOverdue ? 'bg-red-50/40' : mine ? 'bg-sp-admin-accent/[0.03]' : ''
                    }`}
                  >
                    {/* Checkbox selección */}
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(t.id)}
                        aria-label={`Seleccionar ${t.title}`}
                        className="rounded accent-sp-admin-accent cursor-pointer"
                      />
                    </td>
                    {/* Checkbox completar */}
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleComplete(t)}
                        disabled={isDone}
                        aria-label={`Completar ${t.title}`}
                        className="rounded accent-sp-admin-accent"
                      />
                    </td>
                    {/* Título */}
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => openEdit(t)} className="text-left group/title w-full">
                        <span className={`text-[13px] font-medium group-hover/title:text-sp-admin-accent transition-colors ${isDone ? 'text-sp-admin-muted line-through' : 'text-sp-admin-text'}`}>
                          {t.title}
                        </span>
                        {TEMPLATE_TITLES.has(t.title) && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-purple-50 text-purple-600 border border-purple-200">
                            Plantilla
                          </span>
                        )}
                        {t.rolledOver && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title={`Arrastrada de ${t.rolledFromWeek ?? ''}`}>
                            ↻ Arrastrada
                          </span>
                        )}
                      </button>
                      {t.relatedType && t.relatedId && (
                        <p className="text-[10px] text-sp-admin-muted/70 mt-0.5 truncate">
                          → {relatedLabels?.get(`${t.relatedType}:${t.relatedId}`)?.label ?? t.relatedType}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <Popover.Root>
                        <Popover.Trigger asChild>
                          <button
                            type="button"
                            aria-label={`Prioridad ${PRIORITY_LABELS[t.priority]}, pulsa para cambiar`}
                            aria-busy={isPending}
                            disabled={isPending}
                            className={`cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sp-admin-accent rounded-full ${
                              isPending ? 'opacity-70' : ''
                            }`}
                          >
                            <PriorityBadge priority={t.priority} />
                          </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                          <Popover.Content
                            sideOffset={6}
                            align="start"
                            className={POPOVER_PANEL_CLS}
                          >
                            <ul role="listbox" aria-label="Prioridad" className="flex flex-col">
                              {CRM_TASK_PRIORITIES.map((value) => {
                                const selected = t.priority === value;
                                return (
                                  <li key={value} role="option" aria-selected={selected}>
                                    <Popover.Close asChild>
                                      <button
                                        type="button"
                                        onClick={() => handleFieldChange(t.id, { priority: value })}
                                        data-selected={selected}
                                        className={OPTION_CLS}
                                      >
                                        <PriorityBadge priority={value} />
                                        <span className="ml-auto text-[11px] text-sp-admin-muted">
                                          {PRIORITY_LABELS[value]}
                                        </span>
                                      </button>
                                    </Popover.Close>
                                  </li>
                                );
                              })}
                            </ul>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    </td>
                    <td className="px-3 py-2.5">
                      <Popover.Root>
                        <Popover.Trigger asChild>
                          <button
                            type="button"
                            aria-label={`Estado ${STATUS_LABELS[t.status]}, pulsa para cambiar`}
                            aria-busy={isPending}
                            disabled={isPending}
                            className={`cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sp-admin-accent rounded-full ${
                              isPending ? 'opacity-70' : ''
                            }`}
                          >
                            <TaskStatusBadge status={t.status} />
                          </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                          <Popover.Content
                            sideOffset={6}
                            align="start"
                            className={POPOVER_PANEL_CLS}
                          >
                            <ul role="listbox" aria-label="Estado" className="flex flex-col">
                              {CRM_TASK_STATUSES.map((value) => {
                                const selected = t.status === value;
                                return (
                                  <li key={value} role="option" aria-selected={selected}>
                                    <Popover.Close asChild>
                                      <button
                                        type="button"
                                        onClick={() => handleFieldChange(t.id, { status: value })}
                                        data-selected={selected}
                                        className={OPTION_CLS}
                                      >
                                        <TaskStatusBadge status={value} />
                                        <span className="ml-auto text-[11px] text-sp-admin-muted">
                                          {STATUS_LABELS[value]}
                                        </span>
                                      </button>
                                    </Popover.Close>
                                  </li>
                                );
                              })}
                            </ul>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    </td>
                    {/* Categoría con color */}
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${categoryStyle(t.category)}`}>
                        {t.category}
                      </span>
                    </td>
                    {/* Fecha límite formateada */}
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      {dueFmt ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${dueFmt.cls}`}>
                          {dueFmt.text}
                        </span>
                      ) : (
                        <span className="text-[11px] text-sp-admin-muted/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      <Popover.Root>
                        <Popover.Trigger asChild>
                          <button
                            type="button"
                            aria-label={`Asignado a ${owner ? owner.name : 'sin asignar'}, pulsa para cambiar`}
                            aria-busy={isPending}
                            disabled={isPending}
                            className={`flex items-center gap-2 cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sp-admin-accent rounded-lg px-1 py-0.5 ${
                              isPending ? 'opacity-70' : ''
                            }`}
                          >
                            {owner ? (
                              <>
                                <Avatar userId={owner.id} name={owner.name} size="sm" highlight={mine} />
                                <span className="text-xs text-sp-admin-muted">{owner.name}</span>
                              </>
                            ) : (
                              <span className="text-xs text-sp-admin-muted">—</span>
                            )}
                          </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                          <Popover.Content
                            sideOffset={6}
                            align="start"
                            className={`${POPOVER_PANEL_CLS} max-h-64 overflow-auto`}
                          >
                            <ul role="listbox" aria-label="Asignado" className="flex flex-col">
                              {users.map((u) => {
                                const selected = t.ownerId === u.id;
                                return (
                                  <li key={u.id} role="option" aria-selected={selected}>
                                    <Popover.Close asChild>
                                      <button
                                        type="button"
                                        onClick={() => handleFieldChange(t.id, { ownerId: u.id })}
                                        data-selected={selected}
                                        className={OPTION_CLS}
                                      >
                                        <Avatar userId={u.id} name={u.name} size="sm" />
                                        <span>{u.name}</span>
                                      </button>
                                    </Popover.Close>
                                  </li>
                                );
                              })}
                            </ul>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => remove(t)}
                        className="text-sp-admin-muted hover:text-red-400"
                        aria-label="Eliminar"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-sp-admin-muted">Semana actual: <span className="font-semibold text-sp-admin-text">{weekLabel}</span></p>

      {/* Screen reader live region para cambios correctos. */}
      <div role="status" aria-live="polite" className="sr-only">
        {feedback && feedback.kind === 'ok' ? feedback.message : ''}
      </div>

      {/* Pill visible. Usa `role="alert"` + assertive para errores; status/polite para ok. */}
      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2 text-sm font-semibold shadow-lg border ${
            feedback.kind === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100'
              : 'bg-red-50 text-red-700 border-red-200 shadow-red-100'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {modalOpen && (
        <TaskModal
          key={modalTask?.id ?? 'new'}
          onCloseAction={closeModal}
          task={modalTask}
          users={users}
          defaultOwnerId={currentUserId}
        />
      )}
    </>
  );
}
