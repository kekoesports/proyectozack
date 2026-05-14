import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getActiveStatsShares } from '@/lib/queries/stats';
import { getStaleStatsCreators, getTopCreatorsByFollowers } from '@/lib/queries/analytics';
import { env } from '@/lib/env';
import { ShareLinkPanel } from '@/features/admin/stats/components/ShareLinkPanel';
import { RankingTable } from '@/features/admin/stats/components/RankingTable';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';

import type { ReactElement } from 'react';

function formatLastUpdate(date: Date | null): string {
  if (date === null) return 'Sin datos';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function AdminStatsPage(): Promise<ReactElement> {
  await requirePermission('analytics', 'read');

  const [topCreators, staleCreators, shares] = await Promise.all([
    getTopCreatorsByFollowers(20),
    getStaleStatsCreators(30),
    getActiveStatsShares(),
  ]);

  const shareRows = shares.map((s) => ({
    id: s.id,
    token: s.token,
    createdAt: s.createdAt,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">
          Ranking & Crecimiento
        </h1>
        <p className="text-sm text-sp-admin-muted mt-1">
          Top creadores por followers · Stats desactualizadas · Links compartibles
        </p>
      </div>

      {/* ── Sección 1: Ranking de creadores ──────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Ranking de creadores
        </h2>
        <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <div className="px-5 py-3 border-b border-sp-admin-border flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
              Top {topCreators.length} por followers totales (snapshots)
            </p>
            <Link
              href="/admin/talents"
              prefetch={false}
              className="text-[11px] font-semibold text-sp-admin-accent hover:underline"
            >
              Ver roster →
            </Link>
          </div>
          <RankingTable creators={topCreators} />
        </div>
      </section>

      {/* ── Sección 2: Stats desactualizadas ─────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Stats desactualizadas{' '}
          {staleCreators.length > 0 && (
            <span
              className="ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ background: 'var(--color-sp-danger)' }}
            >
              {staleCreators.length}
            </span>
          )}
        </h2>
        <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <div className="px-5 py-3 border-b border-sp-admin-border">
            <p className="text-[11px] text-sp-admin-muted">
              Creadores sin snapshot en los últimos 30 días
            </p>
          </div>
          {staleCreators.length === 0 ? (
            <EmptyState
              title="Stats al día"
              description="Todos los creadores tienen snapshots recientes (últimos 30 días)"
            />
          ) : (
            <div className="divide-y divide-sp-admin-border/60">
              {staleCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-sp-admin-hover transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-sp-admin-text truncate">
                      {creator.name}
                    </div>
                    <div className="text-[11px] text-sp-admin-muted mt-0.5">
                      Último snapshot: {formatLastUpdate(creator.lastSnapshotDate)}
                    </div>
                  </div>
                  <Link
                    href={`/admin/talents/${creator.id}`}
                    prefetch={false}
                    className="shrink-0 text-[11px] font-semibold text-sp-admin-accent hover:underline"
                  >
                    Actualizar →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Sección 3: Links compartibles ────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Links compartibles
        </h2>
        <ShareLinkPanel shares={shareRows} siteUrl={env.NEXT_PUBLIC_SITE_URL} />
      </section>
    </div>
  );
}
