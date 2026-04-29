'use client';

import * as Popover from '@radix-ui/react-popover';
import type { CrmTask, CrmTaskPriority, CrmTaskStatus } from '@/types';
import { Avatar } from '@/features/admin/_shared/components/Avatar';
import { PriorityBadge } from './PriorityBadge';
import { RecurrenceBadge } from './RecurrenceBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { CRM_TASK_PRIORITIES, CRM_TASK_STATUSES } from '@/lib/schemas/task';

// Shared types used across TaskList.tsx + parts
export type UserOption = {
  readonly id: string;
  readonly name: string;
};

export type Feedback = {
  readonly kind: 'ok' | 'error';
  readonly message: string;
};

export type FieldPatch =
  | { readonly priority: CrmTaskPriority }
  | { readonly status: CrmTaskStatus }
  | { readonly ownerId: string };

export type StatusFilter = 'todos' | CrmTaskStatus;

// Shared constants and helpers
export const STATUS_TABS: readonly { readonly key: StatusFilter; readonly label: string }[] = [
  { key: 'todos', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'completada', label: 'Completadas' },
];

export const PRIORITY_LABELS: Record<CrmTaskPriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const STATUS_LABELS: Record<CrmTaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
};

const FIELD_LABELS: Record<'priority' | 'status' | 'ownerId', string> = {
  priority: 'Prioridad',
  status: 'Estado',
  ownerId: 'Asignado',
};

export function fieldLabel(key: string | undefined): string {
  if (key === 'priority' || key === 'status' || key === 'ownerId') {
    return FIELD_LABELS[key];
  }
  return 'Campo';
}

const POPOVER_PANEL_CLS =
  'rounded-xl border border-sp-admin-border bg-sp-admin-bg shadow-2xl ring-1 ring-white/5 p-1 min-w-[160px] z-50';

const OPTION_CLS =
  'w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-sp-admin-text hover:bg-sp-admin-hover focus-visible:bg-sp-admin-hover focus-visible:outline-none data-[selected=true]:bg-sp-admin-accent/10 data-[selected=true]:text-sp-admin-accent';

// ─────────────────────────────────────────────────────────
// TaskListFilters — top bar: status tabs, search, owner filter, create button.
// ─────────────────────────────────────────────────────────

type FiltersProps = {
  readonly statusFilter: StatusFilter;
  readonly counts: Record<StatusFilter, number>;
  readonly search: string;
  readonly ownerFilter: string;
  readonly users: readonly UserOption[];
  readonly onStatusFilterChange: (value: StatusFilter) => void;
  readonly onSearchChange: (value: string) => void;
  readonly onOwnerFilterChange: (value: string) => void;
  readonly onCreate: () => void;
};

export function TaskListFilters({
  statusFilter,
  counts,
  search,
  ownerFilter,
  users,
  onStatusFilterChange,
  onSearchChange,
  onOwnerFilterChange,
  onCreate,
}: FiltersProps): React.ReactElement {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onStatusFilterChange(tab.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'border-sp-admin-accent bg-sp-admin-accent/10 text-sp-admin-accent'
                  : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'
              }`}
            >
              {tab.label} <span className="ml-1 opacity-60">{counts[tab.key]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar…"
          className="rounded-lg border border-sp-admin-border bg-sp-admin-card px-3 py-1.5 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:border-sp-admin-accent focus:outline-none"
        />
        <select
          value={ownerFilter}
          onChange={(e) => onOwnerFilterChange(e.target.value)}
          className="rounded-lg border border-sp-admin-border bg-sp-admin-card px-3 py-1.5 text-sm text-sp-admin-text"
        >
          <option value="todos">Todos</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg bg-sp-admin-accent px-3 py-1.5 text-xs font-bold text-sp-admin-bg"
        >
          + Añadir
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TaskRow — single <tr> with title, priority/status/owner popovers, delete.
// ─────────────────────────────────────────────────────────

type RowProps = {
  readonly task: CrmTask;
  readonly users: readonly UserOption[];
  readonly usersById: Map<string, UserOption>;
  readonly currentUserId: string;
  readonly isPending: boolean;
  readonly onToggleComplete: (task: CrmTask) => void;
  readonly onEdit: (task: CrmTask) => void;
  readonly onRemove: (task: CrmTask) => void;
  readonly onFieldChange: (taskId: number, patch: FieldPatch) => void;
};

export function TaskRow({
  task: t,
  users,
  usersById,
  currentUserId,
  isPending,
  onToggleComplete,
  onEdit,
  onRemove,
  onFieldChange,
}: RowProps): React.ReactElement {
  const owner = usersById.get(t.ownerId);
  const mine = t.ownerId === currentUserId;
  const isDone = t.status === 'completada';
  return (
    <tr className={`${mine ? 'bg-sp-admin-accent/5' : ''} hover:bg-sp-admin-hover`}>
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => onToggleComplete(t)}
          disabled={isDone}
          aria-label={`Completar ${t.title}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <button type="button" onClick={() => onEdit(t)} className="text-left">
          <span className={`font-medium ${isDone ? 'text-sp-admin-muted line-through' : 'text-sp-admin-text'}`}>
            {t.title}
          </span>
          {t.recurrenceTemplateId !== null && t.recurrence && (
            <span className="ml-2 inline-flex align-middle">
              <RecurrenceBadge frequency={t.recurrence} />
            </span>
          )}
          {t.rolledOver && (
            <span className="ml-2 text-[10px] text-amber-400" title={`Arrastrada de ${t.rolledFromWeek}`}>↻</span>
          )}
        </button>
      </td>
      <td className="px-3 py-2.5">
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
            <Popover.Content sideOffset={6} align="start" className={POPOVER_PANEL_CLS}>
              <ul role="listbox" aria-label="Prioridad" className="flex flex-col">
                {CRM_TASK_PRIORITIES.map((value) => {
                  const selected = t.priority === value;
                  return (
                    <li key={value} role="option" aria-selected={selected}>
                      <Popover.Close asChild>
                        <button
                          type="button"
                          onClick={() => onFieldChange(t.id, { priority: value })}
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
            <Popover.Content sideOffset={6} align="start" className={POPOVER_PANEL_CLS}>
              <ul role="listbox" aria-label="Estado" className="flex flex-col">
                {CRM_TASK_STATUSES.map((value) => {
                  const selected = t.status === value;
                  return (
                    <li key={value} role="option" aria-selected={selected}>
                      <Popover.Close asChild>
                        <button
                          type="button"
                          onClick={() => onFieldChange(t.id, { status: value })}
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
      <td className="px-3 py-2.5 text-sp-admin-muted">{t.category}</td>
      <td className="px-3 py-2.5 text-sp-admin-muted">{t.dueDate ?? '—'}</td>
      <td className="px-3 py-2.5">
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
            <Popover.Content sideOffset={6} align="start" className={`${POPOVER_PANEL_CLS} max-h-64 overflow-auto`}>
              <ul role="listbox" aria-label="Asignado" className="flex flex-col">
                {users.map((u) => {
                  const selected = t.ownerId === u.id;
                  return (
                    <li key={u.id} role="option" aria-selected={selected}>
                      <Popover.Close asChild>
                        <button
                          type="button"
                          onClick={() => onFieldChange(t.id, { ownerId: u.id })}
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
          onClick={() => onRemove(t)}
          className="text-sp-admin-muted hover:text-red-400"
          aria-label="Eliminar"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────
// FeedbackToast — bottom-right toast pill with sr-only live region.
// ─────────────────────────────────────────────────────────

type ToastProps = {
  readonly feedback: Feedback | null;
};

export function FeedbackToast({ feedback }: ToastProps): React.ReactElement {
  return (
    <>
      {/* Screen reader live region para cambios correctos. */}
      <div role="status" aria-live="polite" className="sr-only">
        {feedback && feedback.kind === 'ok' ? feedback.message : ''}
      </div>

      {/* Pill visible. Usa role="alert" + assertive para errores; status/polite para ok. */}
      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2 text-sm font-medium shadow-lg ring-1 ${
            feedback.kind === 'ok'
              ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
              : 'bg-red-500/15 text-red-300 ring-red-500/30'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </>
  );
}
