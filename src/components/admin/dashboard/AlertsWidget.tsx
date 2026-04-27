import { AlertList } from '@/components/admin/ui/AlertList';
import { EmptyState } from '@/components/admin/ui/EmptyState';

type AlertsWidgetProps = {
  readonly overdueFollowups: number;
  readonly overdueTasks: number;
};

export function AlertsWidget({ overdueFollowups, overdueTasks }: AlertsWidgetProps): React.ReactElement {
  const hasAlerts = overdueFollowups > 0 || overdueTasks > 0;

  const items = [
    ...(overdueFollowups > 0
      ? [
          {
            id: 'followups-overdue',
            message: `${overdueFollowups} follow-up${overdueFollowups > 1 ? 's' : ''} vencido${overdueFollowups > 1 ? 's' : ''} — requieren atención inmediata`,
            tone: 'danger' as const,
            href: '/admin/brands',
          },
        ]
      : []),
    ...(overdueTasks > 0
      ? [
          {
            id: 'tasks-overdue',
            message: `${overdueTasks} tarea${overdueTasks > 1 ? 's' : ''} urgente${overdueTasks > 1 ? 's' : ''} con fecha vencida`,
            tone: 'warning' as const,
            href: '/admin/tareas',
          },
        ]
      : []),
  ];

  return (
    <section className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <div className="px-5 py-3 border-b border-sp-admin-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Alertas
        </h2>
      </div>
      <div className="px-5 py-4">
        {hasAlerts ? (
          <AlertList items={items} />
        ) : (
          <EmptyState
            title="Todo al día"
            description="No hay follow-ups ni tareas vencidas"
          />
        )}
      </div>
    </section>
  );
}
