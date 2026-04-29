import Link from 'next/link';
import { requireAnyRole } from '@/lib/auth-guard';
import {
  getAdminDashboardData,
  getRecentContacts,
  getOverdueFollowupsCount,
  getUrgentTasksCount,
  getUpcomingFollowups,
  getUrgentTasks,
  getActiveBrandsCount,
  getActiveCampaignsCount,
  getPendingBrandPaymentsTotal,
  getPendingTalentPaymentsTotal,
} from '@/lib/queries/dashboard';
import { getMonthRevenue, getPreviousMonthRevenue, getRevenueTrend } from '@/lib/queries/invoices';
import { getStaleStatsCreators } from '@/lib/queries/analytics';
import { formatCompact } from '@/lib/utils/format';
import { platformMatchesKey, SOCIAL_PLATFORMS } from '@/lib/utils/platform';
import { KpiCard } from '@/features/admin/_shared/components/KpiCard';
import { AlertsWidget } from '@/features/admin/dashboard/components/AlertsWidget';
import { UpcomingFollowupsWidget } from '@/features/admin/dashboard/components/UpcomingFollowupsWidget';
import { UrgentTasksWidget } from '@/features/admin/dashboard/components/UrgentTasksWidget';
import { StaleStatsWidget } from '@/features/admin/dashboard/components/StaleStatsWidget';
import { ActiveCampaignsWidget } from '@/features/admin/dashboard/components/ActiveCampaignsWidget';
import { PendingPaymentsWidget } from '@/features/admin/dashboard/components/PendingPaymentsWidget';
import { RevenueMonthWidget } from '@/features/admin/dashboard/components/RevenueMonthWidget';
import { RevenueTrendChart } from '@/features/admin/dashboard/components/RevenueTrendChart';
import {
  ContactIcon,
  ChartIcon,
  StarIcon,
} from '@/features/admin/_shared/components/SidebarIcons';

import type { ReactElement } from 'react';

void platformMatchesKey;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default async function AdminDashboardPage(): Promise<ReactElement> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const [
    { stats, topCreators },
    recentContacts,
    overdueFollowups,
    overdueTasks,
    upcomingFollowups,
    urgentTasks,
    activeBrandsCount,
    staleCreators,
    activeCampaignsCount,
    pendingBrandTotal,
    pendingTalentTotal,
    monthRevenue,
    prevMonthRevenue,
    revenueTrend,
  ] = await Promise.all([
    getAdminDashboardData(),
    getRecentContacts(5),
    getOverdueFollowupsCount(),
    getUrgentTasksCount({ userId: session.user.id, role: session.user.role as 'admin' | 'manager' | 'staff' }),
    getUpcomingFollowups(7),
    getUrgentTasks(5, { userId: session.user.id, role: session.user.role as 'admin' | 'manager' | 'staff' }),
    getActiveBrandsCount(),
    getStaleStatsCreators(30),
    getActiveCampaignsCount(),
    getPendingBrandPaymentsTotal(),
    getPendingTalentPaymentsTotal(),
    getMonthRevenue(),
    getPreviousMonthRevenue(),
    getRevenueTrend(12),
  ]);

  void getGreeting;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Dashboard</h1>
        <p className="text-sm text-sp-admin-muted mt-1">Panel de inicio</p>
      </div>

      {/* ── Sección 1: KPIs operativos ───────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Resumen operativo
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            title="Marcas activas"
            value={activeBrandsCount}
            tone={activeBrandsCount > 0 ? 'success' : 'neutral'}
            href="/admin/brands"
          />
          <KpiCard
            title="Follow-ups vencidos"
            value={overdueFollowups}
            tone={overdueFollowups > 0 ? 'danger' : 'success'}
            href="/admin/brands"
          />
          <KpiCard
            title="Tareas urgentes"
            value={overdueTasks}
            tone={overdueTasks > 0 ? 'danger' : 'success'}
            href="/admin/tareas"
          />
          <KpiCard
            title="Creadores"
            value={formatCompact(stats.talentCount)}
            tone="neutral"
            href="/admin/talents"
          />
          <ActiveCampaignsWidget count={activeCampaignsCount} />
          <div className="col-span-2">
            <PendingPaymentsWidget
              pendingBrandTotal={pendingBrandTotal}
              pendingTalentTotal={pendingTalentTotal}
            />
          </div>
          <RevenueMonthWidget amount={monthRevenue} previousAmount={prevMonthRevenue} />
        </div>
      </section>

      {/* ── Sección 2: Alertas ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Alertas
        </h2>
        <AlertsWidget
          overdueFollowups={overdueFollowups}
          overdueTasks={overdueTasks}
        />
      </section>

      {/* ── Sección 3: Operativo ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Operativo
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UrgentTasksWidget tasks={urgentTasks} />
          <UpcomingFollowupsWidget followups={upcomingFollowups} />
          <StaleStatsWidget count={staleCreators.length} staleCreators={staleCreators} />

          <section className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
            <div className="px-5 py-3 border-b border-sp-admin-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 shrink-0 text-sp-admin-muted"><StarIcon /></span>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
                  Top 5 creadores
                </h3>
              </div>
              <Link
                href="/admin/talents"
                prefetch={false}
                className="text-[11px] font-semibold text-sp-admin-accent hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {topCreators.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-sp-admin-muted">Sin creadores</div>
            ) : (
              <div className="divide-y divide-sp-admin-border/60">
                {topCreators.map((creator, i) => (
                  <div key={creator.slug} className="px-5 py-2.5 flex items-center justify-between hover:bg-sp-admin-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-sp-admin-muted tabular-nums w-4 text-center">{i + 1}</span>
                      <span className="font-semibold text-sp-admin-text text-[13px]">{creator.name}</span>
                    </div>
                    <span className="font-display text-sm font-bold text-sp-admin-text tabular-nums">
                      {creator.totalFormatted}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="contactos" className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
            <div className="px-5 py-3 border-b border-sp-admin-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 shrink-0 text-sp-admin-muted"><ContactIcon /></span>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
                  Contactos recientes
                </h3>
              </div>
              {recentContacts.length > 0 && (
                <span className="text-[11px] font-semibold text-sp-admin-accent">
                  {stats.contactCount} total
                </span>
              )}
            </div>
            {recentContacts.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-sp-admin-border/30 flex items-center justify-center">
                  <span className="w-5 h-5 text-sp-admin-muted"><ContactIcon /></span>
                </div>
                <p className="text-sm font-medium text-sp-admin-muted">Sin contactos todavía</p>
                <p className="text-[11px] text-sp-admin-muted/60 mt-1">Los nuevos contactos del formulario aparecerán aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-sp-admin-border">
                {recentContacts.map((c) => (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between hover:bg-sp-admin-hover transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-sp-admin-text truncate">{c.name}</div>
                      <div className="text-[11px] text-sp-admin-muted truncate">{c.email}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-sp-admin-border text-sp-admin-text">
                        {c.type}
                      </span>
                      <span className="text-[11px] text-sp-admin-muted tabular-nums">
                        {c.createdAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {/* ── Tendencia de revenue — full width ─────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Tendencia financiera
        </h2>
        <RevenueTrendChart trend={revenueTrend} />
      </section>

      {/* ── Followers por plataforma ─────────────────────────────────── */}
      <section className="rounded-xl bg-sp-admin-card border border-sp-admin-border">
        <div className="px-5 py-3 border-b border-sp-admin-border flex items-center gap-2">
          <span className="w-4 h-4 shrink-0 text-sp-admin-muted"><ChartIcon /></span>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
            Followers por plataforma
          </h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-sp-admin-border">
          {SOCIAL_PLATFORMS.map((p) => {
            const count = stats.followersByPlatform[p.key] ?? 0;
            return (
              <div key={p.key} className="px-4 py-4 text-center">
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: p.color }}
                >
                  {p.label}
                </div>
                <div className="font-display text-xl font-black text-sp-admin-text tabular-nums">
                  {count > 0 ? formatCompact(count) : '--'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Top 5 creadores desglose ─────────────────────────────────── */}
      <section className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
        <div className="px-5 py-3 border-b border-sp-admin-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 shrink-0 text-sp-admin-muted"><ChartIcon /></span>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
              Top 5 creadores — desglose por plataforma
            </h2>
          </div>
          <Link
            href="/admin/talents"
            prefetch={false}
            className="text-[11px] font-semibold text-sp-admin-accent hover:underline"
          >
            Ver roster completo
          </Link>
        </div>
      </section>
    </div>
  );
}
