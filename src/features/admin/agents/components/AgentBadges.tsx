import type { ReactElement } from 'react';

import { runStatusLabel, runStatusTone, type Tono } from '../format';

/**
 * Distintivos del panel de agentes.
 *
 * Server Components: solo pintan. Que un estado sea alarma o espera se decide
 * en `format.ts`, que es puro y está probado; aquí solo se traduce a color.
 */

const TONOS: Record<Tono, string> = {
  neutro: 'border-sp-admin-border text-sp-admin-muted',
  ok: 'border-emerald-600/40 text-emerald-400',
  aviso: 'border-amber-600/40 text-amber-400',
  alarma: 'border-red-600/40 text-red-400',
  espera: 'border-sky-600/40 text-sky-400',
};

export function Badge({
  children,
  tone = 'neutro',
  title,
}: {
  readonly children: React.ReactNode;
  readonly tone?: Tono | undefined;
  readonly title?: string | undefined;
}): ReactElement {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONOS[tone]}`}
    >
      {children}
    </span>
  );
}

export function RunStatusBadge({ status }: { readonly status: string }): ReactElement {
  return <Badge tone={runStatusTone(status)}>{runStatusLabel(status)}</Badge>;
}

export function AgentStatusBadge({
  status,
  mode,
}: {
  readonly status: string;
  readonly mode: string;
}): ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone={status === 'active' ? 'ok' : status === 'paused' ? 'aviso' : 'neutro'}>
        {status === 'active' ? 'activo' : status === 'paused' ? 'pausado' : 'apagado'}
      </Badge>
      {/* El modo importa tanto como el estado: un agente activo en shadow no
          actúa, y confundirlos lleva a esperar acciones que no van a ocurrir. */}
      <Badge tone={mode === 'execute' ? 'aviso' : 'neutro'}>{mode}</Badge>
    </span>
  );
}

/**
 * Aviso de desenlace desconocido.
 *
 * Se pinta como alarma aunque la ejecución figure como fallida: "no se sabe si
 * pasó" pide que alguien vaya a comprobarlo, y un fallo corriente no.
 */
export function UnknownOutcomeBadge({ detail }: { readonly detail: string | null }): ReactElement {
  return (
    <Badge tone="alarma" title={detail ?? undefined}>
      ⚠ desenlace desconocido
    </Badge>
  );
}

export function StuckBadge(): ReactElement {
  return (
    <Badge tone="alarma" title="En cola con los intentos agotados: el worker ya no la coge.">
      atascada
    </Badge>
  );
}
