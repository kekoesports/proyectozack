import Link from 'next/link';
import type { ReactElement } from 'react';

import { decideApprovalAction } from '@/app/admin/(dashboard)/agents/actions';
import { ActionButton } from './ActionButton';
import { canApproveActionClass } from '@/lib/agents/policy';
import type { Role } from '@/lib/auth-guard';
import type { PendingApprovalItem } from '@/lib/queries/agents/admin';

import { formatDateTime } from '../format';
import { Badge } from './AgentBadges';

/**
 * Centro de aprobaciones.
 *
 * Lo que se firma aquí es una acción **exacta**: tool, versión y argumentos
 * concretos, congelados en un hash. Por eso la vista enseña los argumentos
 * redactados y no un resumen bonito — quien firma tiene que ver qué firma.
 *
 * Esconder el botón a quien no puede aprobar es cortesía, no seguridad: la
 * Server Action vuelve a comprobar rango y permiso de dominio en cada envío.
 */
export function ApprovalsQueue({
  approvals,
  role,
  ahora,
}: {
  readonly approvals: readonly PendingApprovalItem[];
  readonly role: Role;
  readonly ahora: Date;
}): ReactElement {
  if (approvals.length === 0) {
    return (
      <div className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-6 text-center">
        <p className="text-sm font-semibold text-sp-admin-text">Nada pendiente de firma</p>
        <p className="mt-1 text-xs text-sp-admin-muted">
          Cuando un agente proponga una acción con efecto externo o privilegio, aparecerá aquí
          congelada hasta que alguien la decida.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {approvals.map((aprobacion) => {
        const caducada = aprobacion.expiresAt.getTime() <= ahora.getTime();
        const puedeFirmar = canApproveActionClass(role, aprobacion.actionClass);

        return (
          <article
            key={aprobacion.id}
            className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-3"
          >
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-sp-admin-text">{aprobacion.title}</h2>
                <p className="text-[11px] text-sp-admin-muted">
                  {aprobacion.agentSlug} · {aprobacion.toolName} v{aprobacion.toolVersion}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone={aprobacion.riskLevel === 'critical' ? 'alarma' : 'aviso'}>
                  {aprobacion.riskLevel}
                </Badge>
                <Badge tone="neutro">{aprobacion.actionClass}</Badge>
              </div>
            </header>

            {aprobacion.summary && (
              <p className="mt-2 text-xs leading-relaxed text-sp-admin-muted">{aprobacion.summary}</p>
            )}

            {/* Los argumentos exactos, redactados. Es lo que se firma. */}
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-sp-admin-muted hover:text-sp-orange">
                Ver los argumentos exactos
              </summary>
              <pre className="mt-1 overflow-x-auto rounded bg-sp-admin-bg p-2 text-[10px] leading-relaxed text-sp-admin-text">
                {JSON.stringify(aprobacion.parametersPreviewJson, null, 2)}
              </pre>
            </details>

            <p className="mt-2 text-[11px] text-sp-admin-muted">
              Pedida {formatDateTime(aprobacion.requestedAt)} · caduca {formatDateTime(aprobacion.expiresAt)}
              {aprobacion.requiredPermissionModule && (
                <>
                  {' '}
                  · exige {aprobacion.requiredPermissionModule}:{aprobacion.requiredPermissionAction}
                </>
              )}
            </p>

            {caducada ? (
              <p className="mt-3 rounded border border-sp-admin-border px-2 py-1.5 text-[11px] text-sp-admin-muted">
                Caducada. Hay que pedirla de nuevo: el contexto que la justificaba ya no es el mismo.
              </p>
            ) : !puedeFirmar ? (
              <p className="mt-3 rounded border border-sp-admin-border px-2 py-1.5 text-[11px] text-sp-admin-muted">
                Tu rol no puede firmar acciones de clase <code>{aprobacion.actionClass}</code>.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sp-admin-border pt-3">
                <ActionButton
                  action={decideApprovalAction}
                  fields={{ id: aprobacion.id, decision: 'approved' }}
                  label="Aprobar y reanudar"
                  variant="confirmar"
                  confirm={`Vas a autorizar «${aprobacion.title}» con los argumentos exactos que muestra la ficha. Se ejecutará una sola vez y la ejecución se reanudará. ¿Seguir?`}
                />

                <ActionButton
                  action={decideApprovalAction}
                  fields={{ id: aprobacion.id, decision: 'rejected' }}
                  label="Rechazar"
                  variant="peligro"
                  title="Rechazar termina la ejecución: queda cancelada."
                />

                <Link
                  href={`/admin/agents/runs/${aprobacion.runId}`}
                  className="ml-auto text-[11px] font-semibold text-sp-admin-muted hover:text-sp-orange"
                >
                  Ver la ejecución →
                </Link>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
