import type { ReactElement } from 'react';

import { cancelRunAction } from '@/app/admin/(dashboard)/agents/actions';
import { ActionButton } from './ActionButton';
import type { AgentRunDetail } from '@/lib/queries/agents/admin';

import { errorCodeLabel, formatCost, formatDateTime } from '../format';
import { Badge, RunStatusBadge, StuckBadge, UnknownOutcomeBadge } from './AgentBadges';

/**
 * Timeline de una ejecución.
 *
 * Se lee de arriba abajo tal como ocurrió, incluidos los pasos que fallaron y
 * las llamadas que se bloquearon. Es deliberado: saber qué **intentó** hacer un
 * agente vale tanto como saber qué consiguió, y una timeline que solo enseñe
 * los aciertos no sirve para auditar nada.
 *
 * Los JSON van dentro de un `<details>` cerrado. No es solo ruido: el resultado
 * de una tool puede traer datos de negocio, y aunque estén redactados no tienen
 * por qué estar a la vista de quien solo quería mirar por qué falló algo.
 */
export function RunTimeline({
  detail,
  canWrite,
}: {
  readonly detail: AgentRunDetail;
  readonly canWrite: boolean;
}): ReactElement {
  const { run, steps, toolCalls, approvals, usageMicros } = detail;
  const enMarcha = run.status === 'running' || run.status === 'queued' || run.status === 'retry_scheduled';

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-3">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-sp-admin-text">
              Ejecución #{run.id} · {run.agentName}
            </h2>
            <p className="text-[11px] text-sp-admin-muted">
              {run.triggerType} · correlación {run.correlationId}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <RunStatusBadge status={run.status} />
            {run.outcomeUnknown && <UnknownOutcomeBadge detail={errorCodeLabel(run.lastErrorCode)} />}
            {run.stuck && <StuckBadge />}
          </div>
        </header>

        {run.outcomeUnknown && (
          <div className="mt-2 rounded border border-red-600/40 bg-red-950/20 px-3 py-2 text-xs text-red-300">
            <strong>No se sabe si la acción llegó a ocurrir.</strong>{' '}
            {errorCodeLabel(run.lastErrorCode)}. No se ha reintentado a propósito: repetirla podría
            duplicar algo que ya pasó. Hay que comprobarlo a mano.
          </div>
        )}

        <dl className="mt-3 grid grid-cols-2 gap-3 text-[11px] md:grid-cols-4">
          <div>
            <dt className="text-sp-admin-muted">Intentos</dt>
            <dd className="font-semibold text-sp-admin-text">
              {run.attempt}/{run.maxAttempts}
            </dd>
          </div>
          <div>
            <dt className="text-sp-admin-muted">Turnos</dt>
            <dd className="font-semibold text-sp-admin-text">{run.modelTurns}</dd>
          </div>
          <div>
            <dt className="text-sp-admin-muted">Tools</dt>
            <dd className="font-semibold text-sp-admin-text">{run.toolCalls}</dd>
          </div>
          <div>
            <dt className="text-sp-admin-muted">Coste</dt>
            <dd className="font-semibold text-sp-admin-text">{formatCost(usageMicros, false)}</dd>
          </div>
        </dl>

        <p className="mt-2 text-[11px] text-sp-admin-muted">
          Creada {formatDateTime(run.createdAt)}
          {run.startedAt && <> · iniciada {formatDateTime(run.startedAt)}</>}
          {run.completedAt && <> · terminada {formatDateTime(run.completedAt)}</>}
        </p>

        {run.outputSummary && (
          <p className="mt-2 whitespace-pre-wrap rounded bg-sp-admin-bg p-2 text-xs text-sp-admin-text">
            {run.outputSummary}
          </p>
        )}

        {enMarcha && canWrite && !run.cancelRequestedAt && (
          <div className="mt-3 border-t border-sp-admin-border pt-3">
            <ActionButton
              action={cancelRunAction}
              fields={{ id: run.id }}
              label="Pedir cancelación"
              variant="peligro"
              title="Cooperativa: el worker la mira entre pasos, no corta una herramienta a mitad."
            />
          </div>
        )}

        {run.cancelRequestedAt && (
          <p className="mt-2 text-[11px] text-amber-400">
            Cancelación pedida {formatDateTime(run.cancelRequestedAt)}. Se aplicará en el siguiente
            paso: no se corta una herramienta a mitad.
          </p>
        )}
      </section>

      {approvals.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-admin-muted">
            Aprobaciones
          </h3>
          <ul className="space-y-1.5">
            {approvals.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-2 rounded border border-sp-admin-border px-3 py-2 text-[11px]"
              >
                <Badge tone={a.status === 'consumed' ? 'ok' : a.status === 'pending' ? 'espera' : 'neutro'}>
                  {a.status}
                </Badge>
                <span className="text-sp-admin-text">{a.title}</span>
                <span className="ml-auto text-sp-admin-muted">
                  {a.decidedAt ? formatDateTime(a.decidedAt) : `caduca ${formatDateTime(a.expiresAt)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-admin-muted">
          Pasos ({steps.length})
        </h3>
        {steps.length === 0 ? (
          <p className="text-xs text-sp-admin-muted">Todavía no ha dado ningún paso.</p>
        ) : (
          <ol className="space-y-1.5">
            {steps.map((paso) => (
              <li key={paso.id} className="rounded border border-sp-admin-border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-mono text-sp-admin-muted">{paso.sequence}</span>
                  <Badge tone={paso.status === 'succeeded' ? 'ok' : paso.status === 'failed' ? 'alarma' : 'neutro'}>
                    {paso.stepType}
                  </Badge>
                  <span className="font-semibold text-sp-admin-text">{paso.name}</span>
                  <span className="ml-auto text-sp-admin-muted">{formatDateTime(paso.createdAt)}</span>
                </div>
                {paso.errorMessage && (
                  <p className="mt-1 text-[11px] text-red-400">{paso.errorMessage}</p>
                )}
                {paso.outputJson && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[10px] text-sp-admin-muted hover:text-sp-orange">
                      Ver datos
                    </summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-sp-admin-bg p-2 text-[10px] text-sp-admin-text">
                      {JSON.stringify(paso.outputJson, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {toolCalls.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-sp-admin-muted">
            Herramientas ({toolCalls.length})
          </h3>
          <ul className="space-y-1.5">
            {toolCalls.map((llamada) => (
              <li key={llamada.id} className="rounded border border-sp-admin-border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <Badge
                    tone={
                      llamada.status === 'succeeded'
                        ? 'ok'
                        : llamada.status === 'executing'
                          ? 'alarma'
                          : llamada.status === 'blocked'
                            ? 'aviso'
                            : 'neutro'
                    }
                    title={
                      llamada.status === 'executing'
                        ? 'Sigue en `executing` con la ejecución terminada: es la marca de un desenlace desconocido.'
                        : undefined
                    }
                  >
                    {llamada.status}
                  </Badge>
                  <span className="font-semibold text-sp-admin-text">
                    {llamada.toolName} v{llamada.toolVersion}
                  </span>
                  <Badge tone="neutro">{llamada.actionClass}</Badge>
                  <span className="ml-auto font-mono text-[10px] text-sp-admin-muted">
                    {llamada.inputHash.slice(0, 12)}…
                  </span>
                </div>
                {llamada.errorMessage && (
                  <p className="mt-1 text-[11px] text-red-400">{llamada.errorMessage}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
