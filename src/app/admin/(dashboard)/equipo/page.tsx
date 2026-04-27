import Link from 'next/link';
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Equipo</h1>
          <p className="text-sm text-sp-admin-muted mt-1">Resumen semanal · {weekLabel}</p>
        </div>
        <Link
          href="/admin/equipo/fotos"
          className="rounded-lg border border-sp-admin-border px-3 py-1.5 text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text"
        >
          Fotos del equipo →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {summary.map((m) => {
          const isMe = m.userId === session.user.id;
          return (
            <div
              key={m.userId}
              className={`rounded-2xl border p-5 transition-colors ${
                isMe
                  ? 'border-sp-admin-accent/40 bg-sp-admin-accent/5'
                  : 'border-sp-admin-border bg-sp-admin-card'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar userId={m.userId} name={m.name} size="md" highlight={isMe} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sp-admin-text">{m.name}</p>
                  <p className="truncate text-[11px] uppercase tracking-wider text-sp-admin-muted">
                    {m.role ?? '—'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Hechas" value={m.completed} accent="text-emerald-400" />
                <Stat label="Pend." value={m.pending} accent="text-sp-admin-text" />
                <Stat label="Vencidas" value={m.overdue} accent={m.overdue > 0 ? 'text-red-400' : 'text-sp-admin-muted'} />
              </div>
            </div>
          );
        })}
      </div>

      {summary.length === 0 && (
        <p className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-10 text-center text-sm text-sp-admin-muted">
          No hay usuarios con rol admin o staff. Asigna roles en la DB para ver el resumen.
        </p>
      )}

      {session.user.role === 'admin' && <InviteStaffForm />}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  readonly label: string;
  readonly value: number;
  readonly accent: string;
}): ReactElement {
  return (
    <div className="rounded-lg bg-sp-admin-bg/60 p-2">
      <p className={`font-display text-2xl font-black ${accent}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-sp-admin-muted">{label}</p>
    </div>
  );
}
