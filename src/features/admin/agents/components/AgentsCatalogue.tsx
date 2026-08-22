import Link from 'next/link';
import type { ReactElement } from 'react';

import { setAgentModeAction, setAgentStatusAction } from '@/app/admin/(dashboard)/agents/actions';
import { ActionButton } from './ActionButton';
import type { AgentWithActivity } from '@/lib/queries/agents/admin';

import { agentModeLabel, formatCost, formatRelative } from '../format';
import { AgentStatusBadge } from './AgentBadges';

/**
 * Catálogo de agentes.
 *
 * Server Component: lee y pinta. Los botones son `ActionButton`, un cliente
 * mínimo que invoca la Server Action y enseña lo que respondió.
 *
 * `canManage` decide qué se pinta; la Server Action decide qué se ejecuta. La
 * segunda es la que manda: esconder un botón no autoriza ni desautoriza nada.
 */
export function AgentsCatalogue({
  agents,
  canManage,
  globalKillSwitchOn,
}: {
  readonly agents: readonly AgentWithActivity[];
  readonly canManage: boolean;
  readonly globalKillSwitchOn: boolean;
}): ReactElement {
  return (
    <div className="space-y-3">
      {!globalKillSwitchOn && (
        <div className="rounded border border-amber-600/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
          <strong>AGENTS_ENABLED está apagado.</strong> Ningún agente se ejecutará aunque figure como
          activo. Es una variable de entorno: se cambia en el despliegue, no desde aquí.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {agents.map((agente) => (
          <article
            key={agente.id}
            className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-3"
          >
            <header className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-sp-admin-text">{agente.displayName}</h2>
                <p className="text-[11px] text-sp-admin-muted">{agente.slug}</p>
              </div>
              <AgentStatusBadge status={agente.status} mode={agente.mode} />
            </header>

            <p className="mt-2 text-xs leading-relaxed text-sp-admin-muted">{agente.description}</p>
            <p className="mt-1 text-[11px] text-sp-admin-muted">{agentModeLabel(agente.mode)}</p>

            <dl className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
              <div>
                <dt className="text-sp-admin-muted">7 días</dt>
                <dd className="font-semibold text-sp-admin-text">{agente.runsLast7Days}</dd>
              </div>
              <div>
                <dt className="text-sp-admin-muted">fallidas</dt>
                <dd className={agente.failedLast7Days > 0 ? 'font-semibold text-red-400' : 'font-semibold text-sp-admin-text'}>
                  {agente.failedLast7Days}
                </dd>
              </div>
              <div>
                <dt className="text-sp-admin-muted">firmas</dt>
                <dd className={agente.pendingApprovals > 0 ? 'font-semibold text-sky-400' : 'font-semibold text-sp-admin-text'}>
                  {agente.pendingApprovals}
                </dd>
              </div>
              <div>
                <dt className="text-sp-admin-muted">gasto</dt>
                <dd className="font-semibold text-sp-admin-text">
                  {formatCost(agente.spentThisMonthMicros, false)}
                </dd>
              </div>
            </dl>

            <p className="mt-2 text-[11px] text-sp-admin-muted">
              Última ejecución: {formatRelative(agente.lastRunAt)}
            </p>

            {canManage && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sp-admin-border pt-3">
                <ActionButton
                  action={setAgentStatusAction}
                  fields={{ id: agente.id, status: agente.status === 'active' ? 'disabled' : 'active' }}
                  label={agente.status === 'active' ? 'Apagar' : 'Activar'}
                  variant={agente.status === 'active' ? 'neutro' : 'confirmar'}
                  confirm={
                    agente.status === 'active'
                      ? undefined
                      : `Activar ${agente.slug}. A partir de ahí podrá ejecutarse solo, dentro de su modo y su presupuesto. ¿Seguir?`
                  }
                />

                {agente.mode !== 'execute' && (
                  <ActionButton
                    action={setAgentModeAction}
                    fields={{ id: agente.id, mode: agente.mode === 'shadow' ? 'recommend' : 'execute' }}
                    label={`→ ${agente.mode === 'shadow' ? 'recommend' : 'execute'}`}
                    title="Subir un escalón de autonomía. El blueprint pide medir antes de hacerlo."
                    confirm={
                      agente.mode === 'recommend'
                        ? `Pasar ${agente.slug} a execute: podrá ejecutar las acciones que su política permita sin pedir permiso cada vez. ¿Seguir?`
                        : undefined
                    }
                  />
                )}

                <Link
                  href={`/admin/agents/runs?agentId=${agente.id}`}
                  className="ml-auto text-[11px] font-semibold text-sp-admin-muted hover:text-sp-orange"
                >
                  Ver ejecuciones →
                </Link>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
