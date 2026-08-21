import Link from 'next/link';
import type { ReactElement } from 'react';

import { unstickRunAction } from '@/app/admin/(dashboard)/agents/actions';
import { ActionButton } from './ActionButton';
import type { AgentRunListItem } from '@/lib/queries/agents/admin';

import { errorCodeLabel, formatDateTime, formatRelative } from '../format';
import { RunStatusBadge, StuckBadge, UnknownOutcomeBadge } from './AgentBadges';

/**
 * Lista de ejecuciones.
 *
 * Dos estados se destacan por encima del resto porque piden que alguien haga
 * algo, y en una lista de cien filas se perderían:
 *
 * - **desenlace desconocido**: no se sabe si una acción llegó a ocurrir;
 * - **atascada**: en cola con los intentos agotados, así que el worker ya no la
 *   coge y `recoverExpiredLeases` tampoco la ve —solo mira las `running`—.
 *   Sin esta columna, ese huérfano solo se descubre cuando alguien pregunta por
 *   qué una rutina dejó de producir informes.
 */
export function RunsTable({
  runs,
  canManage,
}: {
  readonly runs: readonly AgentRunListItem[];
  readonly canManage: boolean;
}): ReactElement {
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-6 text-center">
        <p className="text-sm font-semibold text-sp-admin-text">Sin ejecuciones</p>
        <p className="mt-1 text-xs text-sp-admin-muted">
          No se ha encolado ninguna todavía. Los agentes nacen apagados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-sp-admin-border">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="bg-sp-admin-panel text-[10px] uppercase tracking-wide text-sp-admin-muted">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Agente</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Origen</th>
            <th className="px-3 py-2">Intentos</th>
            <th className="px-3 py-2">Creada</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-sp-admin-border">
          {runs.map((run) => (
            <tr key={run.id} className={run.outcomeUnknown || run.stuck ? 'bg-red-950/10' : undefined}>
              <td className="px-3 py-2 font-mono text-[11px] text-sp-admin-muted">{run.id}</td>
              <td className="px-3 py-2">
                <span className="font-semibold text-sp-admin-text">{run.agentSlug}</span>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-1">
                  <RunStatusBadge status={run.status} />
                  {run.outcomeUnknown && <UnknownOutcomeBadge detail={errorCodeLabel(run.lastErrorCode)} />}
                  {run.stuck && <StuckBadge />}
                </div>
                {run.lastErrorCode && !run.outcomeUnknown && (
                  <p className="mt-0.5 text-[10px] text-sp-admin-muted">
                    {errorCodeLabel(run.lastErrorCode)}
                  </p>
                )}
              </td>
              <td className="px-3 py-2 text-sp-admin-muted">{run.triggerType}</td>
              <td className="px-3 py-2 text-sp-admin-muted">
                {run.attempt}/{run.maxAttempts}
              </td>
              <td className="px-3 py-2 text-sp-admin-muted" title={formatDateTime(run.createdAt)}>
                {formatRelative(run.createdAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  {run.stuck && canManage && (
                    <ActionButton
                      action={unstickRunAction}
                      fields={{ id: run.id }}
                      label="Desatascar"
                      title="Devuelve a la cola con un intento más. Manual a propósito: subir el límite solo lo convertiría en una sugerencia."
                    />
                  )}
                  <Link
                    href={`/admin/agents/runs/${run.id}`}
                    className="text-[11px] font-semibold text-sp-admin-muted hover:text-sp-orange"
                  >
                    Ver →
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
