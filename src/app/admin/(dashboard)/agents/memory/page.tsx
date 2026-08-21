import { revokeMemoryAction, verifyMemoryAction } from '@/app/admin/(dashboard)/agents/actions';
import { ActionButton } from '@/features/admin/agents/components/ActionButton';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { Badge } from '@/features/admin/agents/components/AgentBadges';
import { formatDateTime } from '@/features/admin/agents/format';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { listAgentMemories } from '@/lib/queries/agents/admin';

export const metadata = { title: 'Memoria | Agentes' };

/**
 * Memoria curada.
 *
 * Solo lo **verificado, vigente y no restringido** entra en los prompts. Esta
 * página existe para que alguien pueda ver exactamente qué creen los agentes
 * que es cierto, y retirarlo cuando deje de serlo.
 *
 * Verificar exige `agents:approve`, no `write`: es afirmar que algo es cierto, y
 * a partir de ahí el hecho entra en el razonamiento de los agentes.
 */
export default async function AgentMemoryPage(): Promise<React.ReactElement> {
  const sesion = await requirePermission('agents', 'read');
  const canApprove = hasPermission(sesion.user.role, 'agents', 'approve');

  const memorias = await listAgentMemories();
  const verificadas = memorias.filter((m) => m.verificationStatus === 'verified').length;
  const propuestas = memorias.filter((m) => m.verificationStatus === 'proposed').length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Memoria"
        subtitle="Hechos estables que los agentes pueden dar por ciertos"
        stats={[
          { label: 'hechos', value: memorias.length },
          { label: 'verificados', value: verificadas, accent: '#10b981' },
          ...(propuestas > 0 ? [{ label: 'por verificar', value: propuestas, accent: '#f59e0b' }] : [{ label: 'por verificar', value: propuestas }]),
        ]}
        actions={[{ label: 'Agentes', href: '/admin/agents' }]}
      />

      <div className="rounded border border-sp-admin-border bg-sp-admin-panel px-3 py-2 text-[11px] text-sp-admin-muted">
        Aquí van políticas, umbrales y convenciones. <strong>No</strong> importes, estados ni fechas:
        eso se consulta al CRM con una herramienta cada vez. Un dato vivo memorizado es un dato que
        envejece sin avisar.
      </div>

      {memorias.length === 0 ? (
        <div className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-6 text-center">
          <p className="text-sm font-semibold text-sp-admin-text">Sin memoria todavía</p>
          <p className="mt-1 text-xs text-sp-admin-muted">
            Ningún agente ha propuesto nada, y nadie ha añadido un hecho a mano.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {memorias.map((memoria) => (
            <li
              key={memoria.id}
              className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-sp-admin-text">{memoria.memoryKey}</h2>
                  <p className="text-[11px] text-sp-admin-muted">
                    {memoria.scope}
                    {memoria.agentSlug && <> · {memoria.agentSlug}</>} · fuente: {memoria.sourceType}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    tone={
                      memoria.verificationStatus === 'verified'
                        ? 'ok'
                        : memoria.verificationStatus === 'proposed'
                          ? 'aviso'
                          : 'neutro'
                    }
                  >
                    {memoria.verificationStatus}
                  </Badge>
                  <Badge
                    tone={memoria.sensitivity === 'restricted' ? 'alarma' : 'neutro'}
                    title={
                      memoria.sensitivity === 'restricted'
                        ? 'Restringida: nunca entra en un prompt, aunque esté verificada.'
                        : undefined
                    }
                  >
                    {memoria.sensitivity}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-sp-admin-text">{memoria.content}</p>

              <p className="mt-2 text-[11px] text-sp-admin-muted">
                {memoria.createdByName && <>Propuesta por {memoria.createdByName} · </>}
                {formatDateTime(memoria.updatedAt)}
                {memoria.validUntil && <> · caduca {formatDateTime(memoria.validUntil)}</>}
              </p>

              {canApprove && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-sp-admin-border pt-3">
                  {memoria.verificationStatus === 'proposed' && (
                    <ActionButton
                      action={verifyMemoryAction}
                      fields={{ id: memoria.id }}
                      label="Verificar"
                      variant="confirmar"
                      confirm={`Verificar «${memoria.memoryKey}» significa que los agentes lo darán por cierto y entrará en sus prompts. ¿Seguir?`}
                    />
                  )}
                  {memoria.verificationStatus !== 'revoked' && (
                    <ActionButton
                      action={revokeMemoryAction}
                      fields={{ id: memoria.id }}
                      label="Revocar"
                      variant="peligro"
                      title="No se borra: la fila se conserva porque saber qué se creyó cierto es parte de la auditoría."
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
