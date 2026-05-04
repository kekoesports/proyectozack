import type { ReactElement } from 'react';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { requireAnyRole } from '@/lib/auth-guard';
import {
  getMyTasks,
  getRolledOverCount,
  getUsedCategories,
  getTaskRelatedOptions,
  resolveRelatedLabels,
  rollOverPendingTasks,
} from '@/lib/queries/crmTasks';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { getIsoWeekLabel } from '@/lib/utils/week';
import { RolledOverBanner } from '@/features/admin/tasks/components/RolledOverBanner';
import { TaskList } from '@/features/admin/tasks/components/TaskList';

export const metadata = { title: 'Mi Semana | Admin' };

type KpiCardProps = {
  readonly label: string;
  readonly value: number;
  readonly accent: string;
};

function KpiCard({ label, value, accent }: KpiCardProps): ReactElement {
  return (
    <div className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-3 py-2.5">
        <p className="text-[8px] font-bold uppercase tracking-wide text-sp-admin-muted truncate">{label}</p>
        <p className="text-[18px] font-bold mt-0.5" style={{ color: accent }}>{value}</p>
      </div>
    </div>
  );
}

export default async function MiSemanaPage(): Promise<ReactElement> {
  const session  = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const weekLabel = getIsoWeekLabel(new Date());
  const prevDate  = new Date(); prevDate.setDate(prevDate.getDate() - 7);
  const prevWeek  = getIsoWeekLabel(prevDate);
  const todayStr  = new Date().toISOString().slice(0, 10);

  // Auto-rollover silencioso
  await rollOverPendingTasks(prevWeek, weekLabel);

  const [tasks, users, suggestedCategories, rolledCount, relatedOptions] = await Promise.all([
    getMyTasks(session.user.id, weekLabel),
    getAllStaffUsers(),
    getUsedCategories(),
    getRolledOverCount(session.user.id, weekLabel),
    getTaskRelatedOptions(),
  ]);

  const relatedLabels = await resolveRelatedLabels(tasks);

  // KPIs calculados server-side
  const kpis = {
    pendientes:   tasks.filter((t) => t.status === 'pendiente').length,
    enProgreso:   tasks.filter((t) => t.status === 'en_progreso').length,
    completadas:  tasks.filter((t) => t.status === 'completada').length,
    vencidas:     tasks.filter((t) => t.status !== 'completada' && !!t.dueDate && t.dueDate < todayStr).length,
    arrastradas:  rolledCount,
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Mi semana"
        subtitle={weekLabel}
        stats={[
          { label: 'pendientes',  value: kpis.pendientes,  accent: kpis.pendientes > 0  ? '#f5632a' : '#72728a' },
          { label: 'completadas', value: kpis.completadas, accent: '#16a34a' },
          ...(kpis.vencidas > 0 ? [{ label: 'vencidas', value: kpis.vencidas, accent: '#ef4444' }] : []),
        ]}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <KpiCard label="Pendientes"  value={kpis.pendientes}  accent={kpis.pendientes  > 0 ? '#f5632a' : '#72728a'} />
        <KpiCard label="En progreso" value={kpis.enProgreso}  accent={kpis.enProgreso  > 0 ? '#f59e0b' : '#72728a'} />
        <KpiCard label="Completadas" value={kpis.completadas} accent="#16a34a" />
        <KpiCard label="Vencidas"    value={kpis.vencidas}    accent={kpis.vencidas    > 0 ? '#ef4444' : '#72728a'} />
        <KpiCard label="Arrastradas" value={kpis.arrastradas} accent={kpis.arrastradas > 0 ? '#8b3aad' : '#72728a'} />
      </div>

      <RolledOverBanner count={rolledCount} tasks={tasks} />

      <TaskList
        tasks={tasks}
        users={users.map((u) => ({ id: u.id, name: u.name }))}
        currentUserId={session.user.id}
        suggestedCategories={suggestedCategories}
        weekLabel={weekLabel}
        relatedOptions={relatedOptions}
        relatedLabels={relatedLabels}
      />
    </div>
  );
}
