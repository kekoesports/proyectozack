import type { ReactElement } from 'react';
import Link from 'next/link';
import { requireAnyRole } from '@/lib/auth-guard';
import { getTeamTasksSummary } from '@/lib/queries/crmTasks';
import { getIsoWeekLabel, getWeekStart } from '@/lib/utils/week';
import { Avatar } from '@/features/admin/_shared/components/Avatar';
import { InviteStaffForm } from '@/features/admin/equipo/components/InviteStaffForm';
import { UserManageMenu } from '@/features/admin/equipo/components/UserManageMenu';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';

export const metadata = { title: 'Equipo | Admin' };

const ROLE_STYLES: Record<string, string> = {
  admin:   'bg-purple-50 text-purple-700 border border-purple-200',
  manager: 'bg-amber-50 text-amber-700 border border-amber-200',
  staff:   'bg-sky-50 text-sky-700 border border-sky-200',
};

const ROLE_LABELS: Record<string, string> = {
  admin:   'Admin',
  manager: 'Manager',
  staff:   'Staff',
};

const ROLE_ACCESS = [
  { role: 'Admin',   desc: 'Panel completo, eliminar registros, gestionar equipo' },
  { role: 'Manager', desc: 'Panel completo, sin poder eliminar ni gestionar equipo' },
  { role: 'Staff',   desc: 'Mi Semana, Tareas asignadas, Marcas y Tratos asignados' },
] as const;

export default async function EquipoAdminPage(): Promise<ReactElement> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const isAdmin = session.user.role === 'admin';
  const weekLabel = getIsoWeekLabel(new Date());
  const weekStart = getWeekStart(weekLabel);
  const weekStr = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  const rawSummary = await getTeamTasksSummary(weekLabel);
  // Staff solo ve su propio card — no expone métricas ni datos de otros empleados
  const summary = session.user.role === 'staff'
    ? rawSummary.filter((m) => m.userId === session.user.id)
    : rawSummary;

  const totalDone    = summary.reduce((s, m) => s + m.completed, 0);
  const totalPending = summary.reduce((s, m) => s + m.pending, 0);
  const totalOverdue = summary.reduce((s, m) => s + m.overdue, 0);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Equipo"
        subtitle={`Semana ${weekLabel} · desde ${weekStr}`}
        stats={[
          { label: 'miembros',    value: summary.length },
          { label: 'completadas', value: totalDone,    accent: '#16a34a' },
          { label: 'pendientes',  value: totalPending, accent: '#f5632a' },
          ...(totalOverdue > 0
            ? [{ label: 'vencidas', value: totalOverdue, accent: '#ef4444' }]
            : []),
        ]}
      />

      {summary.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-12 text-center">
          <p className="text-sm font-medium text-sp-admin-muted">No hay usuarios con rol admin o staff.</p>
          <p className="text-[11px] text-sp-admin-muted/60 mt-1">Asigna roles desde la base de datos para ver el resumen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {summary.map((m) => {
            const isMe = m.userId === session.user.id;
            const total = m.completed + m.pending;
            const completionRate = total > 0 ? Math.round((m.completed / total) * 100) : 0;
            const roleKey = m.role?.toLowerCase() ?? '';
            const roleStyle = ROLE_STYLES[roleKey] ?? 'bg-slate-100 text-slate-600 border border-slate-200';
            const roleLabel = ROLE_LABELS[roleKey] ?? (m.role ?? '—');

            return (
              <div
                key={m.userId}
                className={`rounded-xl bg-sp-admin-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow ${
                  isMe ? 'ring-2 ring-sp-admin-accent/30' : ''
                }`}
              >
                {/* Menú gestión — solo admin, no sobre sí mismo */}
                {isAdmin && !isMe && (
                  <div className="absolute top-3 right-3">
                    <UserManageMenu userId={m.userId} currentRole={roleKey} />
                  </div>
                )}

                {/* Header con avatar grande */}
                <div className={`px-5 pt-5 pb-4 flex flex-col items-center text-center gap-3 ${
                  isMe ? 'bg-gradient-to-b from-sp-admin-accent/5 to-transparent' : ''
                }`}>
                  {/* Avatar lg */}
                  <div className="relative">
                    <Avatar userId={m.userId} name={m.name} size="lg" highlight={isMe} />
                    {/* Ring de progreso visual */}
                    {completionRate > 0 && (
                      <div
                        className="absolute -inset-1 rounded-full"
                        style={{
                          background: `conic-gradient(${
                            completionRate >= 80 ? '#16a34a' : completionRate >= 50 ? '#f59e0b' : '#f5632a'
                          } ${completionRate}%, transparent ${completionRate}%)`,
                          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), white calc(100% - 3px))',
                          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), white calc(100% - 3px))',
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <p className="text-[14px] font-bold text-sp-admin-text">
                        {m.name}
                      </p>
                      {isMe && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-accent">tú</span>
                      )}
                    </div>
                    {m.email && (
                      <p className="text-[10px] text-sp-admin-muted mt-0.5 truncate max-w-[180px]">{m.email}</p>
                    )}
                    <div className="mt-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${roleStyle}`}>
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats — 3 cols */}
                <div className="grid grid-cols-3 divide-x divide-sp-admin-border/50 border-t border-sp-admin-border/60">
                  <StatCell label="Hechas"   value={m.completed} color="#16a34a" />
                  <StatCell label="Pend."    value={m.pending}   color={m.pending > 0 ? '#f5632a' : '#72728a'} />
                  <StatCell label="Vencidas" value={m.overdue}   color={m.overdue > 0 ? '#ef4444' : '#72728a'} />
                </div>

                {/* Progress + link */}
                <div className="px-4 py-3 border-t border-sp-admin-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Progreso semanal</span>
                    <span className="text-[9px] font-bold text-sp-admin-text tabular-nums">{completionRate}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-sp-admin-bg overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${completionRate}%`,
                        background: completionRate >= 80 ? '#16a34a' : completionRate >= 50 ? '#f59e0b' : '#f5632a',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[9px] text-sp-admin-muted tabular-nums">
                      {m.completed} / {total} tareas
                    </span>
                    <Link
                      href="/admin/tareas"
                      className="text-[10px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity"
                    >
                      Ver tareas →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leyenda de roles — siempre visible */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sp-admin-muted mb-3">Acceso por rol</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ROLE_ACCESS.map((r) => (
            <div key={r.role} className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${ROLE_STYLES[r.role.toLowerCase()] ?? ''}`}>
                {r.role}
              </span>
              <p className="text-[11px] text-sp-admin-muted leading-snug">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invitar — solo admin */}
      {isAdmin && (
        <div className="mt-2">
          <InviteStaffForm />
        </div>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  color,
}: {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}): ReactElement {
  return (
    <div className="py-3 text-center">
      <p className="text-[20px] font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
      <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}
