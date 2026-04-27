'use client';

import { useState, useTransition } from 'react';
import type { CrmTask, CrmTaskStatus, CrmTaskPriority } from '@/types';
import { updateTaskPartialAction } from '@/app/admin/(dashboard)/tareas/actions';
import { Avatar } from '@/features/admin/_shared/components/Avatar';
import { RecurrenceBadge } from './RecurrenceBadge';
import type { RelatedLabel } from '@/lib/queries/crmTasks';

type UserOption = { readonly id: string; readonly name: string };

type Props = {
  readonly tasks: readonly CrmTask[];
  readonly users: readonly UserOption[];
  readonly relatedLabels: ReadonlyMap<string, RelatedLabel>;
  readonly onOpenAction: (task: CrmTask) => void;
};

const COLUMNS: ReadonlyArray<{ readonly status: CrmTaskStatus; readonly label: string; readonly accent: string }> = [
  { status: 'pendiente', label: 'Pendiente', accent: 'border-l-blue-500/60' },
  { status: 'en_progreso', label: 'En progreso', accent: 'border-l-amber-500/60' },
  { status: 'completada', label: 'Completada', accent: 'border-l-emerald-500/60' },
];

const PRIORITY_DOT: Record<CrmTaskPriority, string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-500',
  baja: 'bg-slate-500',
};

const RELATED_BG: Record<string, string> = {
  brand: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  talent: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  invoice: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

/**
 * Tablero kanban de tareas con columnas pendiente / en_progreso / completada.
 * Soporta drag & drop para cambiar estado vía updateTaskPartialAction.
 *
 * @kind client
 * @feature admin/tasks
 * @route /admin/tareas
 */
export function TaskKanban({ tasks, users, relatedLabels, onOpenAction }: Props): React.ReactElement {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<CrmTaskStatus | null>(null);
  const [, startTransition] = useTransition();

  const usersById = new Map<string, UserOption>();
  for (const u of users) usersById.set(u.id, u);

  const tasksByStatus = new Map<CrmTaskStatus, CrmTask[]>();
  for (const c of COLUMNS) tasksByStatus.set(c.status, []);
  for (const t of tasks) tasksByStatus.get(t.status)?.push(t);

  const handleDrop = (status: CrmTaskStatus): void => {
    if (draggingId === null) return;
    const task = tasks.find((t) => t.id === draggingId);
    setHoverCol(null);
    setDraggingId(null);
    if (!task || task.status === status) return;
    startTransition(async () => {
      await updateTaskPartialAction(task.id, { status });
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const items = tasksByStatus.get(col.status) ?? [];
        const isHover = hoverCol === col.status;
        return (
          <div
            key={col.status}
            onDragOver={(e) => { e.preventDefault(); setHoverCol(col.status); }}
            onDragLeave={() => setHoverCol((prev) => (prev === col.status ? null : prev))}
            onDrop={() => handleDrop(col.status)}
            className={`rounded-2xl border bg-sp-admin-card p-4 min-h-[400px] transition-colors ${isHover ? 'border-sp-admin-accent bg-sp-admin-accent/5' : 'border-sp-admin-border'}`}
          >
            <div className={`flex items-center justify-between mb-3 pb-2 border-b border-sp-admin-border/60 border-l-4 pl-3 -mx-1 ${col.accent}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-sp-admin-text">{col.label}</h3>
              <span className="text-xs tabular-nums text-sp-admin-muted">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-xs italic text-sp-admin-muted text-center py-6">Suelta tareas aquí.</p>
              ) : (
                items.map((t) => {
                  const owner = usersById.get(t.ownerId);
                  const related = t.relatedType && t.relatedId
                    ? relatedLabels.get(`${t.relatedType}:${t.relatedId}`) ?? null
                    : null;
                  const overdue = t.dueDate && t.status !== 'completada'
                    && new Date(t.dueDate) < new Date(new Date().toISOString().slice(0, 10));
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDraggingId(t.id)}
                      onDragEnd={() => { setDraggingId(null); setHoverCol(null); }}
                      onClick={() => onOpenAction(t)}
                      className={`group rounded-xl bg-sp-admin-bg border border-sp-admin-border p-3 cursor-grab active:cursor-grabbing hover:border-sp-admin-accent/50 transition-colors ${draggingId === t.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${PRIORITY_DOT[t.priority]}`} />
                        <p className={`text-sm font-medium flex-1 ${t.status === 'completada' ? 'text-sp-admin-muted line-through' : 'text-sp-admin-text'}`}>
                          {t.title}
                        </p>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-sp-admin-muted">{t.category}</span>
                        {t.recurrenceTemplateId !== null && t.recurrence && <RecurrenceBadge frequency={t.recurrence} />}
                        {t.dueDate && (
                          <span className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded ${overdue ? 'bg-red-500/15 text-red-400' : 'text-sp-admin-muted'}`}>
                            {t.dueDate.slice(5)}
                          </span>
                        )}
                      </div>
                      {related && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${RELATED_BG[related.type] ?? ''} truncate max-w-full`} title={related.label}>
                            {related.label}
                          </span>
                        </div>
                      )}
                      {owner && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Avatar userId={owner.id} name={owner.name} size="sm" />
                          <span className="text-[10px] text-sp-admin-muted">{owner.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
