import {
  getAdminDashboardData,
  getCrmBrandCounts,
  getDashboardPendingTasks,
  getDashboardUpcomingFollowups,
  getMonthlyRevenue,
  getDealStats,
} from '@/lib/queries/dashboard';
import { getDashboardAlerts } from '@/lib/queries/alerts';
import { DashboardAlerts } from '@/components/admin/dashboard/DashboardAlerts';
import { getIsoWeekLabel, getWeekStart } from '@/lib/week';
import {
  MOCK_PIPELINE_TOTAL,
  MOCK_PIPELINE_TREND,
  MOCK_ACTIVITY,
  MOCK_INSIGHTS,
} from '@/lib/mock-dashboard-data';

import { StatCard }         from '@/components/admin/dashboard/StatCard';
import { FollowUpPanel }    from '@/components/admin/dashboard/FollowUpPanel';
import { PipelineChartCard } from '@/components/admin/dashboard/PipelineChartCard';
import { TaskPanel }         from '@/components/admin/dashboard/TaskPanel';
import { ActivityPanel }     from '@/components/admin/dashboard/ActivityPanel';
import { InsightsPanel }     from '@/components/admin/dashboard/InsightsPanel';
import {
  BrandIcon, TalentIcon, GiveawayIcon, TasksIcon, InvoiceIcon,
} from '@/components/admin/SidebarIcons';

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
  const weekLabel = getIsoWeekLabel(new Date());
  const weekStart = getWeekStart(weekLabel);
  const weekStr = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  const [{ stats }, brandCounts, pendingTasks, followups, revenue, deals, { alerts, summary: alertSummary }] = await Promise.all([
    getAdminDashboardData(),
    getCrmBrandCounts(),
    getDashboardPendingTasks(weekLabel),
    getDashboardUpcomingFollowups(8),
    getMonthlyRevenue(),
    getDealStats(),
    getDashboardAlerts(),
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

      {/* ── KPIs — fila 1: negocio ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard
          label="Revenue este mes"
          value={formatEur(revenue.income)}
          description="Facturas cobradas y emitidas"
          icon={<InvoiceIcon />}
          accent="#f5632a"
          href="/admin/facturacion"
        />
        <StatCard
          label="Pipeline total"
          value={formatEur(MOCK_PIPELINE_TOTAL)}
          description="Valor estimado en negociación"
          trend={MOCK_PIPELINE_TREND}
          icon={<BrandIcon />}
          accent="#8b3aad"
          href="/admin/brands"
          isMock
        />
        <StatCard
          label="Tratos cerrados"
          value={deals.yearlyDeals}
          description={`Acuerdos cobrados en ${new Date().getFullYear()}`}
          icon={<GiveawayIcon />}
          accent="#16a34a"
          href="/admin/facturacion"
        />
        <StatCard
          label="Tratos activos"
          value={deals.activeDeals}
          description="Facturas emitidas pendientes de cobro"
          icon={<TasksIcon />}
          accent="#e8a800"
          href="/admin/facturacion"
        />
      </div>

      {/* ── KPIs — fila 2: cartera ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          label="Influencers"
          value={stats.talentCount}
          description={`${stats.publicCount} públicos · ${stats.internalCount} internos`}
          icon={<TalentIcon />}
          accent="#f5632a"
          href="/admin/talents"
        />
        <StatCard
          label="Marcas activas"
          value={brandCounts.activa}
          description="Clientes con campaña en curso"
          icon={<BrandIcon />}
          accent="#5b9bd5"
          href="/admin/brands"
        />
        <StatCard
          label="Leads CRM"
          value={brandCounts.lead}
          description="Oportunidades en negociación"
          icon={<BrandIcon />}
          accent="#c42880"
          href="/admin/brands"
        />
        <StatCard
          label="Sorteos activos"
          value={stats.activeGiveawayCount}
          description="Giveaways en curso"
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
          <PipelineChartCard total={MOCK_PIPELINE_TOTAL} trend={MOCK_PIPELINE_TREND} />
        </div>
      </div>

      {/* ── Tareas + Actividad + Insights ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <TaskPanel tasks={pendingTasks} weekLabel={weekLabel} />
        <ActivityPanel items={MOCK_ACTIVITY} />
        <InsightsPanel insights={MOCK_INSIGHTS} />
      </div>

    </div>
  );
}
