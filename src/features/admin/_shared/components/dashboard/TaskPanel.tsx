import Link from 'next/link';
import type { DashboardPendingTask } from '@/lib/queries/dashboard';

const PRIORITY_DOT: Record<string, string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-400',
  baja: 'bg-slate-400',
};

const CATEGORY_STYLES: Record<string, string> = {
  revenue:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  operativo: 'bg-blue-50 text-blue-700 border border-blue-200',
  growth:    'bg-purple-50 text-purple-700 border border-purple-200',
  legal:     'bg-orange-50 text-orange-700 border border-orange-200',
};

function categoryStyle(cat: string | null): string {
  if (!cat) return 'bg-sp-admin-hover text-sp-admin-muted border border-sp-admin-border';
  return CATEGORY_STYLES[cat.toLowerCase()] ?? 'bg-sp-admin-hover text-sp-admin-muted border border-sp-admin-border';
}

function categoryLabel(cat: string | null): string {
  if (!cat) return 'Tarea';
  return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
}

type TaskPanelProps = {
  readonly tasks: readonly DashboardPendingTask[];
  readonly weekLabel: string;
};

export function TaskPanel({ tasks, weekLabel }: TaskPanelProps): React.ReactElement {
  const now = new Date();

  return (
    <section className="flex flex-col rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
            Tareas esta semana
          </h2>
          {tasks.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sp-admin-accent text-white text-[9px] font-bold shrink-0">
              {tasks.length}
            </span>
          )}
        </div>
        <Link href="/admin/tareas" prefetch={false} className="text-[11px] font-medium text-sp-admin-accent hover:opacity-70 transition-opacity">
          Ver todas →
        </Link>
      </div>

      {/* Week label */}
      <div className="px-4 py-1 border-b border-sp-admin-border/40 bg-sp-admin-hover/20">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted/60">
          {weekLabel}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium text-sp-admin-muted">Sin tareas pendientes</p>
          <p className="text-[11px] text-sp-admin-muted/60 mt-1">Todo al día esta semana</p>
        </div>
      ) : (
        <div>
          {tasks.map((task) => {
            const dueDate = task.dueDate;
            const isOverdue = dueDate !== null && new Date(dueDate) < now;
            const isToday = dueDate !== null && (() => {
              const d = new Date(dueDate);
              return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
            })();
            const dueDateStr = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
              : null;

            return (
              <div
                key={task.id}
                className="flex items-center gap-2.5 px-4 py-1.5 border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors"
              >
                {/* Priority dot */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-slate-400'}`}
                  title={`Prioridad ${task.priority}`}
                />

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-sp-admin-text truncate">
                    {task.title}
                  </p>
                </div>

                {/* Category */}
                <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${categoryStyle(task.category)}`}>
                  {categoryLabel(task.category)}
                </span>

                {/* Due date */}
                {dueDateStr && (
                  <span className={`text-[10px] font-semibold tabular-nums shrink-0 px-1.5 py-0.5 rounded ${
                    isOverdue || isToday
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'text-sp-admin-muted'
                  }`}>
                    {isToday ? 'Hoy' : isOverdue ? `Venció ${dueDateStr}` : dueDateStr}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
