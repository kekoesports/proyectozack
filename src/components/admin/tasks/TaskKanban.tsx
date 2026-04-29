'use client';

import { useState, useTransition } from 'react';
import type { CrmTask, CrmTaskStatus, CrmTaskPriority } from '@/types';
import { updateTaskPartialAction, completeTaskAction } from '@/app/admin/(dashboard)/tareas/actions';
import { Avatar } from '@/components/admin/Avatar';

type UserOption = { readonly id: string; readonly name: string };

type Props = {
  readonly tasks: readonly CrmTask[];
  readonly users: readonly UserOption[];
  readonly relatedLabels?: unknown;
  readonly onOpenAction: (task: CrmTask) => void;
};

// Columnas "reales" (drag & drop)
const MAIN_COLUMNS: ReadonlyArray<{ readonly status: CrmTaskStatus; readonly label: string; readonly color: string }> = [
  { status: 'pendiente',   label: 'Pendiente',   color: '#5b9bd5' },
  { status: 'en_progreso', label: 'En progreso', color: '#f59e0b' },
  { status: 'completada',  label: 'Completada',  color: '#16a34a' },
];

const PRIORITY_DOT: Record<CrmTaskPriority, string> = {
  alta:  'bg-red-500',
  media: 'bg-amber-400',
  baja:  'bg-slate-400',
};

const PRIORITY_LABEL: Record<CrmTaskPriority, string> = {
  alta: 'Alta', media: 'Media', baja: 'Baja',
};

const CATEGORY_COLOR: Record<string, string> = {
  revenue:          'bg-emerald-50 text-emerald-700 border-emerald-200',
  operativo:        'bg-sky-50 text-sky-700 border-sky-200',
  growth:           'bg-purple-50 text-purple-700 border-purple-200',
  legal:            'bg-orange-50 text-orange-700 border-orange-200',
  facturación:      'bg-teal-50 text-teal-700 border-teal-200',
  facturacion:      'bg-teal-50 text-teal-700 border-teal-200',
  gestoría:         'bg-orange-50 text-orange-700 border-orange-200',
  gestoria:         'bg-orange-50 text-orange-700 border-orange-200',
  cm:               'bg-pink-50 text-pink-700 border-pink-200',
  scouting:         'bg-indigo-50 text-indigo-700 border-indigo-200',
  'gestión interna':'bg-slate-100 text-slate-600 border-slate-200',
  general:          'bg-slate-100 text-slate-600 border-slate-200',
  influencer:       'bg-purple-50 text-purple-700 border-purple-200',
  marca:            'bg-sky-50 text-sky-700 border-sky-200',
};

function categoryStyle(cat: string): string {
  return CATEGORY_COLOR[cat.toLowerCase()] ?? 'bg-sp-admin-hover text-sp-admin-muted border-sp-admin-border';
}

function deadlineBadge(dueDate: string | null, status: CrmTaskStatus): { text: string; cls: string } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (status === 'completada') return null;
  if (diff < 0)  return { text: `⚠ Venció ${due.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`, cls: 'bg-red-50 text-red-600 border border-red-200' };
  if (diff === 0) return { text: 'Vence hoy',  cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
  if (diff === 1) return { text: 'Mañana',     cls: 'bg-sky-50 text-sky-700 border border-sky-200' };
  return { text: due.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), cls: 'bg-slate-100 text-slate-500 border border-slate-200' };
}

// ── Componente de card de tarea ───────────────────────────────────────

function TaskCard({
  t,
  owner,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  readonly t: CrmTask;
  readonly owner: UserOption | undefined;
  readonly dragging: boolean;
  readonly onDragStart: () => void;
  readonly onDragEnd: () => void;
  readonly onOpen: () => void;
}): React.ReactElement {
  const [, startTransition] = useTransition();
  const deadline = deadlineBadge(t.dueDate, t.status);
  const isOverdue = deadline?.text.startsWith('⚠');
  const isDone = t.status === 'completada';

  const handleComplete = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (isDone) return;
    startTransition(async () => { await completeTaskAction(t.id); });
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`rounded-lg bg-sp-admin-card border p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group/card ${
        isOverdue
          ? 'border-red-200 bg-red-50/30'
          : 'border-sp-admin-border hover:border-sp-admin-accent/40'
      } ${dragging ? 'opacity-40 scale-95' : ''}`}
    >
      {/* Fila superior: prioridad dot + título + botón completar */}
      <div className="flex items-start gap-2">
        <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${PRIORITY_DOT[t.priority]}`} title={`Prioridad ${PRIORITY_LABEL[t.priority]}`} />
        <p className={`text-[12px] font-medium flex-1 leading-snug ${isDone ? 'text-sp-admin-muted line-through' : 'text-sp-admin-text'}`}>
          {t.title}
        </p>
        {!isDone && (
          <button
            type="button"
            onClick={handleComplete}
            className="shrink-0 w-5 h-5 rounded-full border-2 border-sp-admin-border text-transparent hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-center opacity-0 group-hover/card:opacity-100"
            title="Marcar como completada"
          >
            <span className="text-[9px] text-emerald-600 font-bold">✓</span>
          </button>
        )}
      </div>

      {/* Descripción corta */}
      {t.description && (
        <p className="text-[10px] text-sp-admin-muted mt-1 leading-snug line-clamp-2 ml-4">
          {t.description}
        </p>
      )}

      {/* Badges: categoría + rolled-over + vencida */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-4">
        {t.category && (
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${categoryStyle(t.category)}`}>
            {t.category}
          </span>
        )}
        {t.rolledOver && (
          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
            ↻ Arrastrada
          </span>
        )}
        {deadline && (
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${deadline.cls}`}>
            {deadline.text}
          </span>
        )}
      </div>

      {/* Owner */}
      {owner && (
        <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-sp-admin-border/40 ml-4">
          <Avatar userId={owner.id} name={owner.name} size="sm" />
          <span className="text-[10px] text-sp-admin-muted">{owner.name}</span>
        </div>
      )}
    </div>
  );
}

// ── Kanban principal ──────────────────────────────────────────────────

export function TaskKanban({ tasks, users, onOpenAction }: Props): React.ReactElement {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoverCol,   setHoverCol]   = useState<CrmTaskStatus | null>(null);
  const [, startTransition] = useTransition();

  const usersById = new Map<string, UserOption>();
  for (const u of users) usersById.set(u.id, u);

  const today = new Date().toISOString().slice(0, 10);

  // Tareas vencidas (no completadas con dueDate pasado)
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completada' && t.dueDate !== null && t.dueDate < today
  );

  // Tareas por columna excluyendo las que ya están en "vencidas" para no duplicar en pendiente
  const tasksByStatus = new Map<CrmTaskStatus, CrmTask[]>();
  for (const c of MAIN_COLUMNS) tasksByStatus.set(c.status, []);
  for (const t of tasks) {
    if (t.status !== 'completada' && t.dueDate !== null && t.dueDate < today) continue;
    tasksByStatus.get(t.status)?.push(t);
  }

  const handleDrop = (status: CrmTaskStatus): void => {
    if (draggingId === null) return;
    const task = tasks.find((t) => t.id === draggingId);
    setHoverCol(null);
    setDraggingId(null);
    if (!task || task.status === status) return;
    startTransition(async () => { await updateTaskPartialAction(task.id, { status }); });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Columna Vencidas — siempre primera para llamar la atención */}
      <div className="rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="bg-sp-admin-card border-b border-red-200/60 px-4 py-3 flex items-center justify-between bg-red-50/40">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-600">Vencidas</h3>
          </div>
          <span className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full text-red-600 bg-red-100">
            {overdueTasks.length}
          </span>
        </div>
        <div className="bg-red-50/20 p-3 min-h-[400px] space-y-2">
          {overdueTasks.length === 0 ? (
            <div className="flex items-center justify-center h-24 border-2 border-dashed border-red-200/40 rounded-lg">
              <p className="text-[11px] text-red-400/60">Sin tareas vencidas 🎉</p>
            </div>
          ) : (
            overdueTasks.map((t) => (
              <TaskCard
                key={t.id}
                t={t}
                owner={usersById.get(t.ownerId)}
                dragging={draggingId === t.id}
                onDragStart={() => setDraggingId(t.id)}
                onDragEnd={() => { setDraggingId(null); setHoverCol(null); }}
                onOpen={() => onOpenAction(t)}
              />
            ))
          )}
        </div>
      </div>

      {/* Columnas principales */}
      {MAIN_COLUMNS.map((col) => {
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
            <div className="bg-sp-admin-card border-b border-sp-admin-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">{col.label}</h3>
              </div>
              <span className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                style={{ color: col.color, background: `${col.color}14` }}>
                {items.length}
              </span>
            </div>
            <div className="bg-sp-admin-bg/60 p-3 min-h-[400px] space-y-2">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-24 border-2 border-dashed border-sp-admin-border rounded-lg">
                  <p className="text-[11px] text-sp-admin-muted/60">Suelta tareas aquí</p>
                </div>
              ) : (
                items.map((t) => (
                  <TaskCard
                    key={t.id}
                    t={t}
                    owner={usersById.get(t.ownerId)}
                    dragging={draggingId === t.id}
                    onDragStart={() => setDraggingId(t.id)}
                    onDragEnd={() => { setDraggingId(null); setHoverCol(null); }}
                    onOpen={() => onOpenAction(t)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
