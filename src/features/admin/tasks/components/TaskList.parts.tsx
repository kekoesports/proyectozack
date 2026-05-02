'use client';

import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import type { CrmTask, CrmTaskPriority, CrmTaskStatus } from '@/types';
import type { RelatedLabel } from '@/lib/queries/crmTasks';
import { Avatar } from '@/features/admin/_shared/components/Avatar';
import { PriorityBadge } from './PriorityBadge';
import { RecurrenceBadge } from './RecurrenceBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { CRM_TASK_PRIORITIES, CRM_TASK_STATUSES } from '@/lib/schemas/task';

// ── Related entity helpers ────────────────────────────────────────────────────

const RELATED_HREF: Record<RelatedLabel['type'], (id: number) => string> = {
  brand:    (id) => `/admin/brands/${id}`,
  talent:   (id) => `/admin/talents/${id}`,
  campaign: (id) => `/admin/campanas/${id}`,
  invoice:  ()   => `/admin/facturacion`,
};

const RELATED_TYPE_LABEL: Record<RelatedLabel['type'], string> = {
  brand:    'Marca',
  talent:   'Influencer',
  campaign: 'Trato',
  invoice:  'Factura',
};

const RELATED_COLOR: Record<RelatedLabel['type'], string> = {
  brand:    '#8b3aad',
  talent:   '#5b9bd5',
  campaign: '#f5632a',
  invoice:  '#16a34a',
};

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

export type StatusFilter = 'todos' | CrmTaskStatus | 'vencida';

// Shared constants and helpers
export const STATUS_TABS: readonly { readonly key: StatusFilter; readonly label: string }[] = [
  { key: 'todos',       label: 'Todas'        },
  { key: 'pendiente',   label: 'Pendientes'   },
  { key: 'en_progreso', label: 'En progreso'  },
  { key: 'completada',  label: 'Completadas'  },
  { key: 'vencida',     label: 'Vencidas'     },
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
  readonly statusFilter:   StatusFilter;
  readonly counts:         Record<StatusFilter, number>;
  readonly search:         string;
  readonly ownerFilter:    string;
  readonly priorityFilter: CrmTaskPriority | 'todos';
  readonly categoryFilter: string;
  readonly categories:     readonly string[];
  readonly users:          readonly UserOption[];
  readonly onStatusFilterChange:   (value: StatusFilter) => void;
  readonly onSearchChange:         (value: string) => void;
  readonly onOwnerFilterChange:    (value: string) => void;
  readonly onPriorityFilterChange: (value: CrmTaskPriority | 'todos') => void;
  readonly onCategoryFilterChange: (value: string) => void;
  readonly onCreate: () => void;
};

const SEL_CLS = 'h-8 rounded-lg border border-sp-admin-border bg-sp-admin-card px-3 text-[12px] text-sp-admin-text focus:border-sp-admin-accent focus:outline-none';

export function TaskListFilters({
  statusFilter, counts, search, ownerFilter, priorityFilter, categoryFilter,
  categories, users,
  onStatusFilterChange, onSearchChange, onOwnerFilterChange,
  onPriorityFilterChange, onCategoryFilterChange, onCreate,
}: FiltersProps): React.ReactElement {
  return (
    <div className="mb-4 space-y-2">
      {/* Fila 1: tabs de estado */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.key;
          const cnt = counts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onStatusFilterChange(tab.key)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-sp-admin-accent bg-sp-admin-accent/10 text-sp-admin-accent'
                  : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1 text-[10px] tabular-nums ${active ? 'bg-sp-admin-accent/20' : 'opacity-50'}`}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fila 2: búsqueda + filtros + botón */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar tarea…"
          className={`${SEL_CLS} flex-1 min-w-[160px]`}
        />
        <select value={priorityFilter} onChange={(e) => onPriorityFilterChange(e.target.value as CrmTaskPriority | 'todos')} className={SEL_CLS}>
          <option value="todos">Todas las prioridades</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <select value={categoryFilter} onChange={(e) => onCategoryFilterChange(e.target.value)} className={SEL_CLS}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={ownerFilter} onChange={(e) => onOwnerFilterChange(e.target.value)} className={SEL_CLS}>
          <option value="todos">Todos los miembros</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors shrink-0"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          Nueva tarea
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
  readonly relatedLabel?: RelatedLabel | null;
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
  relatedLabel,
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
      <td className="px-3 py-2.5 max-w-[260px]">
        <button type="button" onClick={() => onEdit(t)} className="text-left w-full">
          <span className={`font-medium text-[13px] ${isDone ? 'text-sp-admin-muted line-through' : 'text-sp-admin-text'}`}>
            {t.title}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {t.recurrenceTemplateId !== null && t.recurrence && (
              <RecurrenceBadge frequency={t.recurrence} />
            )}
            {t.rolledOver && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-700"
                title={`Arrastrada de ${t.rolledFromWeek ?? 'semana anterior'}`}
              >
                ↻ Arrastrada
              </span>
            )}
            {relatedLabel && (
              <Link
                href={RELATED_HREF[relatedLabel.type](relatedLabel.id)}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold border hover:opacity-80 transition-opacity"
                style={{
                  color:            RELATED_COLOR[relatedLabel.type],
                  borderColor:      `${RELATED_COLOR[relatedLabel.type]}40`,
                  backgroundColor:  `${RELATED_COLOR[relatedLabel.type]}10`,
                }}
                title={`${RELATED_TYPE_LABEL[relatedLabel.type]}: ${relatedLabel.label}`}
              >
                <span className="opacity-70">{RELATED_TYPE_LABEL[relatedLabel.type]}:</span>
                {' '}{relatedLabel.label}
              </Link>
            )}
          </div>
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
      <td className="px-3 py-2.5">
        <span className="inline-flex rounded-full bg-sp-admin-hover border border-sp-admin-border/60 px-2 py-0.5 text-[10px] font-semibold text-sp-admin-muted capitalize">
          {t.category}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {t.dueDate ? (() => {
          const today = new Date().toISOString().slice(0, 10);
          const isOverdue = t.status !== 'completada' && t.dueDate < today;
          const isToday   = t.dueDate === today;
          const formatted = new Date(t.dueDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
          return (
            <span className={`text-[12px] font-semibold ${isOverdue ? 'text-red-500' : isToday ? 'text-amber-600' : 'text-sp-admin-muted'}`}>
              {isOverdue && <span className="mr-1">⚠</span>}
              {isToday ? 'Hoy' : formatted}
            </span>
          );
        })() : (
          <span className="text-[11px] text-sp-admin-muted/50 italic">Sin límite</span>
        )}
      </td>
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
