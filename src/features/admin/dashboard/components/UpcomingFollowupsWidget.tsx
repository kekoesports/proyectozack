import Link from 'next/link';
import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';

import type { Tone } from '@/features/admin/_shared/components/StateBadge';

type FollowupItem = {
  readonly id: number;
  readonly brandName: string;
  readonly scheduledAt: Date;
  readonly channel: string | null;
  readonly status: string;
};

type UpcomingFollowupsWidgetProps = {
  readonly followups: readonly FollowupItem[];
};

function followupTone(status: string): Tone {
  if (status === 'vencido') return 'danger';
  if (status === 'hecho') return 'success';
  return 'info';
}

function followupStatusLabel(status: string): string {
  if (status === 'vencido') return 'Vencido';
  if (status === 'hecho') return 'Hecho';
  return 'Pendiente';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

/**
 * Widget con los próximos follow-ups de marcas (fecha, canal y estado) y badge tonal según vencimiento.
 *
 * @kind server
 * @feature admin/dashboard
 * @route /admin
 */
export function UpcomingFollowupsWidget({ followups }: UpcomingFollowupsWidgetProps): React.ReactElement {
  return (
    <section className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <div className="px-5 py-3 border-b border-sp-admin-border flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Próximos follow-ups
        </h2>
        <Link
          href="/admin/brands"
          prefetch={false}
          className="text-[11px] font-semibold text-sp-admin-accent hover:underline"
        >
          Ver todos →
        </Link>
      </div>

      {followups.length === 0 ? (
        <EmptyState
          title="Sin follow-ups próximos"
          description="No hay follow-ups programados para los próximos 7 días"
        />
      ) : (
        <div className="divide-y divide-sp-admin-border/60">
          {followups.map((f) => (
            <div key={f.id} className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-sp-admin-hover transition-colors">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-sp-admin-text truncate">{f.brandName}</div>
                {f.channel !== null && (
                  <div className="text-[11px] text-sp-admin-muted capitalize">{f.channel}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StateBadge tone={followupTone(f.status)}>
                  {followupStatusLabel(f.status)}
                </StateBadge>
                <span className="text-[11px] text-sp-admin-muted tabular-nums">
                  {formatDate(f.scheduledAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
