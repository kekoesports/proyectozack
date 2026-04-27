import Link from 'next/link';

import { StateBadge } from '@/components/admin/ui/StateBadge';
import { EmptyState } from '@/components/admin/ui/EmptyState';

import type { Tone } from '@/components/admin/ui/StateBadge';

type TaskItem = {
  readonly id: number;
  readonly title: string;
  readonly priority: string;
  readonly dueDate: Date | null;
  readonly ownerName: string | null;
};

type UrgentTasksWidgetProps = {
  readonly tasks: readonly TaskItem[];
};

function priorityTone(priority: string): Tone {
  if (priority === 'alta') return 'danger';
  if (priority === 'media') return 'warning';
  return 'neutral';
}

function priorityLabel(priority: string): string {
  if (priority === 'alta') return 'Alta';
  if (priority === 'media') return 'Media';
  return 'Baja';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function relativeLabel(date: Date): string {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDue = new Date(date);
  startOfDue.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `Hace ${Math.abs(diffDays)} días`;
  if (diffDays === 0) return 'Hoy';
  return `En ${diffDays} días`;
}

function isOverdueLabel(label: string): boolean {
  return label.startsWith('Hace ');
}

export function UrgentTasksWidget({ tasks }: UrgentTasksWidgetProps): React.ReactElement {
  return (
    <section className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <div className="px-5 py-3 border-b border-sp-admin-border flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Tareas urgentes
        </h2>
        <Link
          href="/admin/tareas"
          prefetch={false}
          className="text-[11px] font-semibold text-sp-admin-accent hover:underline"
        >
          Ver todas →
        </Link>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="Sin tareas urgentes"
          description="No hay tareas con fecha vencida pendientes"
        />
      ) : (
        <div className="divide-y divide-sp-admin-border/60">
          {tasks.map((t) => {
            const dueText = t.dueDate !== null ? relativeLabel(t.dueDate) : null;

            return (
              <div key={t.id} className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-sp-admin-hover transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-sp-admin-text truncate">{t.title}</div>
                  {t.ownerName !== null && (
                    <div className="text-[11px] text-sp-admin-muted truncate">{t.ownerName}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StateBadge tone={priorityTone(t.priority)}>
                    {priorityLabel(t.priority)}
                  </StateBadge>
                  {t.dueDate !== null && dueText !== null && (
                    <div className="text-right">
                      <div className="text-[11px] text-sp-admin-muted tabular-nums">{formatDate(t.dueDate)}</div>
                      <div className={`text-[10px] ${isOverdueLabel(dueText) ? 'text-red-400' : 'text-sp-admin-muted'}`}>
                        {dueText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
