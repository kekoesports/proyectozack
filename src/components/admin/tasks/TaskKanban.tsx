'use client';

import { useState, useTransition } from 'react';
import type { CrmTask, CrmTaskStatus, CrmTaskPriority } from '@/types';
import { updateTaskPartialAction } from '@/app/admin/(dashboard)/tareas/actions';
import { Avatar } from '@/components/admin/Avatar';
import type { RelatedLabel } from '@/lib/queries/crmTasks';

type UserOption = { readonly id: string; readonly name: string };

type Props = {
  readonly tasks: readonly CrmTask[];
  readonly users: readonly UserOption[];
  readonly relatedLabels: ReadonlyMap<string, RelatedLabel>;
  readonly onOpenAction: (task: CrmTask) => void;
};

const COLUMNS: ReadonlyArray<{ readonly status: CrmTaskStatus; readonly label: string; readonly color: string }> = [
  { status: 'pendiente',  label: 'Pendiente',  color: '#5b9bd5' },
  { status: 'en_progreso', label: 'En progreso', color: '#f59e0b' },
  { status: 'completada', label: 'Completada',  color: '#16a34a' },
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
            className={`rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all ${
              isHover ? 'ring-1 ring-sp-admin-accent shadow-[0_4px_16px_rgba(245,99,42,0.12)]' : ''
            }`}
          >
            {/* Column header */}
            <div className="bg-sp-admin-card border-b border-sp-admin-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">{col.label}</h3>
              </div>
              <span
                className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                style={{ color: col.color, background: `${col.color}14` }}
              >
                {items.length}
              </span>
            </div>

            {/* Tasks */}
            <div className="bg-sp-admin-bg/60 p-3 min-h-[400px] space-y-2">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-24 border-2 border-dashed border-sp-admin-border rounded-lg">
                  <p className="text-[11px] text-sp-admin-muted/60">Suelta tareas aquí</p>
                </div>
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
                      className={`rounded-lg bg-sp-admin-card border border-sp-admin-border p-3 cursor-grab active:cursor-grabbing hover:border-sp-admin-accent/40 hover:shadow-sm transition-all ${
                        draggingId === t.id ? 'opacity-40 scale-95' : ''
                      }`}
                    >
                      {/* Título + prioridad */}
                      <div className="flex items-start gap-2">
                        <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${PRIORITY_DOT[t.priority]}`} />
                        <p className={`text-[12px] font-medium flex-1 leading-snug ${
                          t.status === 'completada' ? 'text-sp-admin-muted line-through' : 'text-sp-admin-text'
                        }`}>
                          {t.title}
                        </p>
                      </div>

                      {/* Categoría + fecha */}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        {t.category && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted bg-sp-admin-hover border border-sp-admin-border px-1.5 py-0.5 rounded-full">
                            {t.category}
                          </span>
                        )}
                        {t.dueDate && (
                          <span className={`text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-full ml-auto ${
                            overdue ? 'bg-red-50 text-red-600 border border-red-200' : 'text-sp-admin-muted'
                          }`}>
                            {overdue ? '⚠ ' : ''}{t.dueDate.slice(5)}
                          </span>
                        )}
                      </div>

                      {/* Entidad relacionada */}
                      {related && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${RELATED_BG[related.type] ?? ''} truncate max-w-full`}>
                            {related.label}
                          </span>
                        </div>
                      )}

                      {/* Owner */}
                      {owner && (
                        <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-sp-admin-border/40">
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
