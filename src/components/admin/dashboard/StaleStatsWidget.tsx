import Link from 'next/link';
import { EmptyState } from '@/components/admin/ui/EmptyState';

import type { StaleCreator } from '@/lib/queries/analytics';

type Props = {
  readonly count: number;
  readonly staleCreators: readonly StaleCreator[];
};

function formatLastUpdate(date: Date | null): string {
  if (date === null) return 'Sin datos';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function StaleStatsWidget({ count, staleCreators }: Props): React.ReactElement {
  const preview = staleCreators.slice(0, 3);

  return (
    <section className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <div className="px-5 py-3 border-b border-sp-admin-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
            Stats desactualizadas
          </h3>
          {count > 0 && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
              style={{ background: 'var(--color-sp-danger)' }}
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </div>
        <Link
          href="/admin/stats"
          prefetch={false}
          className="text-[11px] font-semibold text-sp-admin-accent hover:underline"
        >
          Ver todos →
        </Link>
      </div>

      {count === 0 ? (
        <EmptyState
          title="Stats al día"
          description="Todos los creadores tienen snapshots recientes"
        />
      ) : (
        <div className="divide-y divide-sp-admin-border/60">
          {preview.map((creator) => (
            <div
              key={creator.id}
              className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-sp-admin-hover transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-sp-admin-text truncate">
                  {creator.name}
                </div>
                <div className="text-[11px] text-sp-admin-muted">
                  Último: {formatLastUpdate(creator.lastSnapshotDate)}
                </div>
              </div>
              <Link
                href={`/admin/talents/${creator.id}`}
                prefetch={false}
                className="text-[11px] font-semibold text-sp-admin-accent hover:underline shrink-0"
              >
                Actualizar →
              </Link>
            </div>
          ))}
          {count > 3 && (
            <div className="px-5 py-2.5 text-center">
              <Link
                href="/admin/stats"
                prefetch={false}
                className="text-[11px] font-semibold text-sp-admin-accent hover:underline"
              >
                +{count - 3} más — Ver todos →
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
