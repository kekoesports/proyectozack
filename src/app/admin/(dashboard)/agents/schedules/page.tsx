import { setScheduleEnabledAction } from '@/app/admin/(dashboard)/agents/actions';
import { ActionButton } from '@/features/admin/agents/components/ActionButton';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { Badge } from '@/features/admin/agents/components/AgentBadges';
import { formatDateTime } from '@/features/admin/agents/format';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { listAgentSchedulesForAdmin } from '@/lib/queries/agents/admin';

export const metadata = { title: 'Rutinas | Agentes' };

/**
 * Rutinas programadas.
 *
 * Activar una rutina es la acción con más consecuencias del panel después de
 * encender un agente: a partir de ahí el sistema actúa sin que nadie lo invoque.
 * Por eso exige `agents:manage` y por eso la página avisa cuando la rutina
 * pertenece a un agente apagado — estaría activa y no haría nada, que es peor
 * que estar desactivada, porque parece que funciona.
 */
export default async function AgentSchedulesPage(): Promise<React.ReactElement> {
  const sesion = await requirePermission('agents', 'read');
  const canManage = hasPermission(sesion.user.role, 'agents', 'manage');

  const rutinas = await listAgentSchedulesForAdmin();
  const activas = rutinas.filter((r) => r.enabled).length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Rutinas"
        subtitle="Ejecuciones programadas. Todas nacen desactivadas."
        stats={[
          { label: 'rutinas', value: rutinas.length },
          ...(activas > 0 ? [{ label: 'activas', value: activas, accent: '#10b981' }] : [{ label: 'activas', value: activas }]),
        ]}
        actions={[{ label: 'Agentes', href: '/admin/agents' }]}
      />

      {rutinas.length === 0 ? (
        <div className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-6 text-center">
          <p className="text-sm font-semibold text-sp-admin-text">No hay ninguna rutina</p>
          <p className="mt-1 text-xs text-sp-admin-muted">
            Las creará el seed de cada agente cuando llegue su fase. Ninguna se activa sola.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rutinas.map((rutina) => (
            <li
              key={rutina.id}
              className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-sp-admin-text">{rutina.name}</h2>
                  <p className="text-[11px] text-sp-admin-muted">
                    {rutina.slug} · {rutina.agentSlug} · <code>{rutina.cronExpression}</code> (
                    {rutina.timezone})
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tone={rutina.enabled ? 'ok' : 'neutro'}>
                    {rutina.enabled ? 'activa' : 'desactivada'}
                  </Badge>
                  <Badge tone="neutro">{rutina.catchUpPolicy}</Badge>
                </div>
              </div>

              {rutina.enabled && rutina.agentStatus !== 'active' && (
                <p className="mt-2 rounded border border-amber-600/40 bg-amber-950/20 px-2 py-1.5 text-[11px] text-amber-300">
                  El agente <strong>{rutina.agentSlug}</strong> está {rutina.agentStatus}: la rutina
                  se disparará y la ventana se descartará. Parece que funciona y no hace nada.
                </p>
              )}

              <p className="mt-2 text-[11px] text-sp-admin-muted">
                Próxima: {formatDateTime(rutina.nextRunAt)}
                {rutina.lastScheduledFor && <> · última: {formatDateTime(rutina.lastScheduledFor)}</>}
              </p>

              {canManage && rutina.enabled && (
                <div className="mt-3">
                  <ActionButton
                    action={setScheduleEnabledAction}
                    fields={{ id: rutina.id, enabled: 'false' }}
                    label="Desactivar"
                    variant="peligro"
                  />
                </div>
              )}

              {canManage && !rutina.enabled && (
                <p className="mt-3 text-[11px] text-sp-admin-muted">
                  Activarla exige calcular su próxima ventana desde el worker. Se hace con{' '}
                  <code>npm run agents:schedules:tick</code> tras marcarla en la base — deliberado:
                  no es un interruptor de un clic.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
