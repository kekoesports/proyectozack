'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CrmTask, CrmTaskPriority } from '@/types';
import type { RelatedLabel } from '@/lib/queries/crmTasks';
import { TaskModal } from './TaskModal';
import {
  completeTaskAction,
  deleteTaskAction,
  updateTaskPartialAction,
} from '@/app/admin/(dashboard)/tareas/actions';
import type { RelatedOptions } from './RelatedSelector';
import {
  TaskListFilters,
  TaskRow,
  FeedbackToast,
  fieldLabel,
  type UserOption,
  type Feedback,
  type FieldPatch,
  type StatusFilter,
} from './TaskList.parts';

type Props = {
  readonly tasks: readonly CrmTask[];
  readonly users: readonly UserOption[];
  readonly currentUserId: string;
  readonly suggestedCategories: readonly string[];
  readonly weekLabel: string;
  readonly relatedOptions: RelatedOptions;
  readonly relatedLabels?: ReadonlyMap<string, RelatedLabel>;
};

/**
 * Vista lista de tareas con filtros (estado, prioridad, owner, categoría, búsqueda) y bulk actions.
 * Es la vista por defecto del workspace de tareas.
 *
 * @kind client
 * @feature admin/tasks
 * @route /admin/tareas
 */
export function TaskList({
  tasks,
  users,
  currentUserId,
  suggestedCategories,
  weekLabel,
  relatedOptions,
  relatedLabels,
}: Props): React.ReactElement {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [ownerFilter, setOwnerFilter]   = useState<string>('todos');
  const [priorityFilter, setPriorityFilter] = useState<CrmTaskPriority | 'todos'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const isOverdue = (t: CrmTask): boolean =>
    t.status !== 'completada' && t.dueDate !== null && t.dueDate < todayStr;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter === 'vencida') {
        if (!isOverdue(t)) return false;
      } else if (statusFilter !== 'todos') {
        if (t.status !== statusFilter) return false;
      }
      if (ownerFilter   !== 'todos' && t.ownerId   !== ownerFilter)    return false;
      if (priorityFilter !== 'todos' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== '' && t.category !== categoryFilter)      return false;
      if (needle && !t.title.toLowerCase().includes(needle) && !t.category.toLowerCase().includes(needle)) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, statusFilter, ownerFilter, priorityFilter, categoryFilter, search, todayStr]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      todos: tasks.length, pendiente: 0, en_progreso: 0, completada: 0, vencida: 0,
    };
    for (const t of tasks) {
      c[t.status]++;
      if (isOverdue(t)) c.vencida++;
    }
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, todayStr]);

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

  return (
    <>
      <TaskListFilters
        statusFilter={statusFilter}
        counts={counts}
        search={search}
        ownerFilter={ownerFilter}
        priorityFilter={priorityFilter}
        categoryFilter={categoryFilter}
        categories={suggestedCategories}
        users={users}
        onStatusFilterChange={setStatusFilter}
        onSearchChange={setSearch}
        onOwnerFilterChange={setOwnerFilter}
        onPriorityFilterChange={setPriorityFilter}
        onCategoryFilterChange={setCategoryFilter}
        onCreate={openCreate}
      />

      <div className="overflow-hidden rounded-xl border border-sp-admin-border bg-sp-admin-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border/60 text-[10px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
              <th className="px-3 py-3 w-10"></th>
              <th className="px-3 py-3">Título</th>
              <th className="px-3 py-3">Prioridad</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Categoría</th>
              <th className="px-3 py-3">Límite</th>
              <th className="px-3 py-3">Asignado</th>
              <th className="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sp-admin-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sp-admin-muted">
                  No hay tareas que cumplan los filtros.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  users={users}
                  usersById={usersById}
                  currentUserId={currentUserId}
                  isPending={isPending}
                  relatedLabel={
                    t.relatedType && t.relatedId && relatedLabels
                      ? (relatedLabels.get(`${t.relatedType}:${t.relatedId}`) ?? null)
                      : null
                  }
                  onToggleComplete={toggleComplete}
                  onEdit={openEdit}
                  onRemove={remove}
                  onFieldChange={handleFieldChange}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-sp-admin-muted">
        Semana actual: <span className="font-semibold text-sp-admin-text">{weekLabel}</span>
      </p>

      <FeedbackToast feedback={feedback} />

      {modalOpen && (
        <TaskModal
          key={modalTask?.id ?? 'new'}
          onCloseAction={closeModal}
          task={modalTask}
          users={users}
          suggestedCategories={suggestedCategories}
          defaultOwnerId={currentUserId}
          relatedOptions={relatedOptions}
        />
      )}
    </>
  );
}
