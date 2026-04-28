import type { ReactElement } from 'react';
import { requireAnyRole } from '@/lib/auth-guard';
import { getTeamTasksSummary } from '@/lib/queries/crmTasks';
import { getIsoWeekLabel } from '@/lib/utils/week';
import { Avatar } from '@/features/admin/_shared/components/Avatar';
import { InviteStaffForm } from '@/features/admin/equipo/components/InviteStaffForm';

export const metadata = { title: 'Equipo | Admin' };

export default async function EquipoAdminPage(): Promise<ReactElement> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const weekLabel = getIsoWeekLabel(new Date());
  const summary = await getTeamTasksSummary(weekLabel);

  const totalDone = summary.reduce((s, m) => s + m.completed, 0);
  const totalPending = summary.reduce((s, m) => s + m.pending, 0);
  const totalOverdue = summary.reduce((s, m) => s + m.overdue, 0);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Equipo"
        subtitle={weekLabel}
        stats={[
          { label: 'miembros', value: summary.length },
          { label: 'completadas', value: totalDone, accent: '#16a34a' },
          { label: 'pendientes', value: totalPending, accent: '#f5632a' },
          ...(totalOverdue > 0 ? [{ label: 'vencidas', value: totalOverdue, accent: '#ef4444' }] : []),
        ]}
      />

      {summary.length === 0 ? (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-10 text-center">
          <p className="text-sm font-medium text-sp-admin-muted">No hay usuarios con rol admin o staff.</p>
          <p className="text-[11px] text-sp-admin-muted/60 mt-1">Asigna roles para ver el resumen semanal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {summary.map((m) => {
            const isMe = m.userId === session.user.id;
            const completionRate = m.completed + m.pending > 0
              ? Math.round((m.completed / (m.completed + m.pending)) * 100)
              : 0;

            return (
              <div
                key={m.userId}
                className={`rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${
                  isMe
                    ? 'ring-1 ring-sp-admin-accent/30'
                    : ''
                }`}
              >
                {/* Header de la card */}
                <div className={`px-4 py-3 flex items-center gap-3 ${
                  isMe ? 'bg-sp-admin-accent/8' : 'bg-sp-admin-card'
                } border-b border-sp-admin-border/60`}>
                  <Avatar userId={m.userId} name={m.name} size="md" highlight={isMe} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-sp-admin-text truncate">
                      {m.name}
                      {isMe && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-sp-admin-accent">· tú</span>}
                    </p>
                    <p className="text-[10px] text-sp-admin-muted uppercase tracking-wide">{m.role ?? '—'}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-sp-admin-card px-4 py-3 grid grid-cols-3 gap-2">
                  <StatCell label="Hechas" value={m.completed} color="#16a34a" />
                  <StatCell label="Pend." value={m.pending} color="#72728a" />
                  <StatCell label="Vencidas" value={m.overdue} color={m.overdue > 0 ? '#ef4444' : '#72728a'} />
                </div>

                {/* Progress bar */}
                <div className="bg-sp-admin-card px-4 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-sp-admin-muted">Progreso semanal</span>
                    <span className="text-[9px] font-bold text-sp-admin-text">{completionRate}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-sp-admin-bg overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${completionRate}%`,
                        background: completionRate >= 80 ? '#16a34a' : completionRate >= 50 ? '#f59e0b' : '#f5632a',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {session.user.role === 'admin' && (
        <div className="mt-2">
          <InviteStaffForm />
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, color }: { readonly label: string; readonly value: number; readonly color: string }): ReactElement {
  return (
    <div className="text-center">
      <p className="text-[18px] font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
      <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}
