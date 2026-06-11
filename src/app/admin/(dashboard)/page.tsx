import {
  getAdminDashboardData,
  getCrmBrandCounts,
  getDashboardPendingTasks,
  getDashboardUpcomingFollowups,
  getMonthlyRevenue,
  getDealStats,
  getPendingBrandPaymentsTotal,
  getDashboardActivity,
  getDashboardInsights,
  getPipelineHistoryAll,
} from '@/lib/queries/dashboard';
import { getDashboardAlerts } from '@/lib/queries/alerts';
import { requirePermission } from '@/lib/permissions';
import { DashboardAlerts } from '@/features/admin/_shared/components/dashboard/DashboardAlerts';
import { getIsoWeekLabel, getWeekStart } from '@/lib/utils/week';

import { StatCard } from '@/features/admin/_shared/components/dashboard/StatCard';
import { FollowUpPanel } from '@/features/admin/_shared/components/dashboard/FollowUpPanel';
import { PipelineChartCard } from '@/features/admin/_shared/components/dashboard/PipelineChartCard';
import { TaskPanel } from '@/features/admin/_shared/components/dashboard/TaskPanel';
import { ActivityPanel } from '@/features/admin/_shared/components/dashboard/ActivityPanel';
import { InsightsPanel } from '@/features/admin/_shared/components/dashboard/InsightsPanel';
import { NewsAlertsWidget } from '@/features/admin/newsAlerts/components/NewsAlertsWidget';
import {
  BrandIcon, TalentIcon, GiveawayIcon, TasksIcon, InvoiceIcon,
} from '@/features/admin/_shared/components/SidebarIcons';

import type { ReactElement } from 'react';

function formatEur(n: number): string {
  if (n === 0) return '0 €';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default async function AdminDashboardPage(): Promise<ReactElement> {
  const session  = await requirePermission('dashboard', 'read');
  const isStaff  = session.user.role === 'staff';
  const weekLabel = getIsoWeekLabel(new Date());
  const weekStart = getWeekStart(weekLabel);
  const weekStr = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  const [{ stats }, brandCounts, pendingTasks, followups, revenue, deals, { alerts, summary: alertSummary }, pipelineTotal, activity, insights, pipelineHistory] = await Promise.all([
    getAdminDashboardData(),
    getCrmBrandCounts(),
    getDashboardPendingTasks(weekLabel),
    getDashboardUpcomingFollowups(8),
    getMonthlyRevenue(),
    getDealStats(),
    getDashboardAlerts(isStaff ? { staffUserId: session.user.id, skipFinancial: true } : undefined),
    getPendingBrandPaymentsTotal(),
    getDashboardActivity(5),
    getDashboardInsights(),
    getPipelineHistoryAll(),
  ]);

  return (
    <div className="space-y-3 max-w-[1400px]">

      {/* ── Encabezado ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-sp-admin-muted uppercase tracking-[0.18em] leading-none">
            {getGreeting()}
          </p>
          <h1 className="text-lg font-bold text-sp-admin-text leading-tight mt-0.5">Panel general</h1>
        </div>
        <p className="text-[10px] text-sp-admin-muted hidden sm:block">
          {weekLabel} · desde {weekStr}
        </p>
      </div>

      {/* ── KPIs primarios — Revenue + Pipeline ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatCard
          size="primary"
          label="Revenue este mes"
          value={formatEur(revenue.income)}
          description="Facturas cobradas y emitidas"
          icon={<InvoiceIcon />}
          accent="#f5632a"
          href="/admin/facturacion"
        />
        <StatCard
          size="primary"
          label="Pipeline total"
          value={formatEur(pipelineTotal)}
          description="Facturas pendientes de cobro"
          icon={<BrandIcon />}
          accent="#8b3aad"
          href="/admin/facturacion"
        />
      </div>

      {/* ── KPIs secundarios — 6 métricas de cartera ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <StatCard
          label="Tratos cerrados"
          value={deals.yearlyDeals}
          description={`Cobrados ${new Date().getFullYear()}`}
          icon={<GiveawayIcon />}
          accent="#16a34a"
          href="/admin/facturacion"
        />
        <StatCard
          label="Tratos activos"
          value={deals.activeDeals}
          description="Pendientes de cobro"
          icon={<TasksIcon />}
          accent="#e8a800"
          href="/admin/facturacion"
        />
        <StatCard
          label="Influencers"
          value={stats.talentCount}
          description={`${stats.publicCount} pub · ${stats.internalCount} int`}
          icon={<TalentIcon />}
          accent="#f5632a"
          href="/admin/talents"
        />
        <StatCard
          label="Marcas activas"
          value={brandCounts.activa}
          description="Con campaña en curso"
          icon={<BrandIcon />}
          accent="#5b9bd5"
          href="/admin/brands"
        />
        <StatCard
          label="Leads CRM"
          value={brandCounts.lead}
          description="En negociación"
          icon={<BrandIcon />}
          accent="#c42880"
          href="/admin/brands"
        />
        <StatCard
          label="Sorteos"
          value={stats.activeGiveawayCount}
          description="Giveaways activos"
          icon={<GiveawayIcon />}
          accent="#5b9bd5"
          href="/admin/giveaways"
        />
      </div>

      {/* ── Alertas críticas ──────────────────────────────────── */}
      <DashboardAlerts alerts={alerts} summary={alertSummary} />

      {/* ── Follow-ups + Pipeline chart ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <FollowUpPanel followups={followups} />
        </div>
        <div className="lg:col-span-2">
          <PipelineChartCard
            total={pipelineTotal}
            data7d={pipelineHistory.d7}
            data30d={pipelineHistory.d30}
            data90d={pipelineHistory.d90}
          />
        </div>
      </div>

      {/* ── Tareas + Actividad + Insights ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <TaskPanel tasks={pendingTasks} weekLabel={weekLabel} />
        <ActivityPanel items={activity} />
        <InsightsPanel insights={insights} />
      </div>

      {/* ── Alertas editoriales (NewsData) ──────────────────── */}
      <NewsAlertsWidget />

    </div>
  );
}
