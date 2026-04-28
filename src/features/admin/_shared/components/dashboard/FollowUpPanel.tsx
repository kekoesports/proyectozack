import Link from 'next/link';
import type { DashboardFollowup } from '@/lib/queries/dashboard';

type Priority = 'ALTA' | 'MEDIA' | 'BAJA';

function derivePriority(scheduledAt: Date): Priority {
  const now = new Date();
  const diff = scheduledAt.getTime() - now.getTime();
  const hours = diff / 3600_000;
  if (hours <= 24) return 'ALTA';
  if (hours <= 48) return 'MEDIA';
  return 'BAJA';
}

const PRIORITY_STYLES: Record<Priority, string> = {
  ALTA: 'bg-red-50 text-red-600 border border-red-200',
  MEDIA: 'bg-amber-50 text-amber-600 border border-amber-200',
  BAJA: 'bg-slate-100 text-slate-500 border border-slate-200',
};

type Bucket = { label: string; items: DashboardFollowup[] };

function bucketFollowups(items: readonly DashboardFollowup[]): Bucket[] {
  const now = new Date();
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const tomorrowEnd = new Date(now); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1); tomorrowEnd.setHours(23, 59, 59, 999);

  const today: DashboardFollowup[] = [];
  const tomorrow: DashboardFollowup[] = [];
  const week: DashboardFollowup[] = [];

  for (const item of items) {
    const d = item.scheduledAt;
    if (d <= todayEnd) today.push(item);
    else if (d <= tomorrowEnd) tomorrow.push(item);
    else week.push(item);
  }

  return [
    { label: 'Hoy', items: today },
    { label: 'Mañana', items: tomorrow },
    { label: 'Esta semana', items: week },
  ].filter((b) => b.items.length > 0);
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

type FollowUpPanelProps = {
  readonly followups: readonly DashboardFollowup[];
};

export function FollowUpPanel({ followups }: FollowUpPanelProps): React.ReactElement {
  const buckets = bucketFollowups(followups);

  return (
    <section className="flex flex-col rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sp-admin-accent animate-pulse" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
            Follow-ups y seguimientos
          </h2>
        </div>
        <Link href="/admin/brands" prefetch={false} className="text-[11px] font-medium text-sp-admin-accent hover:opacity-70 transition-opacity">
          Ver marcas →
        </Link>
      </div>

      {/* Content */}
      {buckets.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-sp-admin-muted">Sin seguimientos próximos</p>
          <p className="text-[11px] text-sp-admin-muted/60 mt-1">
            Añade recordatorios desde la sección de marcas
          </p>
        </div>
      ) : (
        <div className="divide-y divide-sp-admin-border/40">
          {buckets.map((bucket) => (
            <div key={bucket.label}>
              {/* Bucket label */}
              <div className="px-4 py-1 bg-sp-admin-hover/30">
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-sp-admin-muted/70">
                  {bucket.label}
                </span>
              </div>
              {/* Items */}
              {bucket.items.map((item) => {
                const priority = derivePriority(item.scheduledAt);
                const timeStr = item.scheduledAt.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isPast = item.scheduledAt < new Date();

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-sp-admin-hover transition-colors"
                  >
                    {/* Time */}
                    <span className={`text-[11px] font-semibold tabular-nums shrink-0 w-10 ${isPast ? 'text-red-500' : 'text-sp-admin-muted'}`}>
                      {timeStr}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-sp-admin-text truncate">
                        {item.brandName}
                      </p>
                      <p className="text-[11px] text-sp-admin-muted truncate mt-0.5">
                        {item.note}
                      </p>
                    </div>

                    {/* Priority badge */}
                    <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_STYLES[priority]}`}>
                      {priority}
                    </span>

                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #8b3aad, #c42880)' }}
                      title={item.brandName}
                    >
                      {initials(item.brandName)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
