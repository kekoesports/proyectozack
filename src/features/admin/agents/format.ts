import { CODIGOS_INDETERMINADOS } from '@/lib/agents/run-state';

/**
 * Formato compartido del panel de agentes.
 *
 * Puro y sin dependencias de React, para que las decisiones que importan
 * —cuándo un estado se pinta como alarma, cómo se enseña un coste que no se
 * conoce— se puedan probar sin renderizar nada.
 */

/** 1 USD = 1.000.000 micros. */
export function formatMicros(micros: number): string {
  return `${(micros / 1_000_000).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} $`;
}

/**
 * Coste que puede ser incompleto.
 *
 * Con algún consumo sin tarifa conocida, el total es un **mínimo** y se dice
 * con un `≥`. Enseñarlo como una cifra exacta sería exactamente el problema que
 * `pricingUnknown` existe para evitar.
 */
export function formatCost(micros: number, pricingUnknown: boolean): string {
  return pricingUnknown ? `≥ ${formatMicros(micros)}` : formatMicros(micros);
}

export type Tono = 'neutro' | 'ok' | 'aviso' | 'alarma' | 'espera';

export function runStatusTone(status: string): Tono {
  switch (status) {
    case 'succeeded':
      return 'ok';
    case 'running':
    case 'queued':
    case 'retry_scheduled':
      return 'neutro';
    case 'waiting_approval':
      return 'espera';
    case 'budget_blocked':
      return 'aviso';
    case 'failed':
    case 'dead_letter':
    case 'cancelled':
      return 'alarma';
    default:
      return 'neutro';
  }
}

export function runStatusLabel(status: string): string {
  const etiquetas: Record<string, string> = {
    queued: 'en cola',
    running: 'ejecutando',
    waiting_approval: 'esperando firma',
    retry_scheduled: 'reintento programado',
    succeeded: 'completada',
    failed: 'fallida',
    cancelled: 'cancelada',
    budget_blocked: 'sin presupuesto',
    dead_letter: 'agotada',
  };
  return etiquetas[status] ?? status;
}

export function agentStatusLabel(status: string): string {
  const etiquetas: Record<string, string> = {
    active: 'activo',
    paused: 'pausado',
    disabled: 'apagado',
  };
  return etiquetas[status] ?? status;
}

export function agentModeLabel(mode: string): string {
  const etiquetas: Record<string, string> = {
    shadow: 'shadow — analiza, no actúa',
    recommend: 'recommend — propone y crea borradores',
    execute: 'execute — ejecuta lo permitido',
  };
  return etiquetas[mode] ?? mode;
}

/**
 * Un desenlace desconocido no es un fallo más.
 *
 * Un fallo dice "no pasó nada"; esto dice "no sabemos si pasó". Quien mira la
 * lista necesita distinguirlos de un vistazo, porque el segundo pide que
 * alguien vaya a comprobarlo.
 */
export function isUnknownOutcome(errorCode: string | null): boolean {
  return errorCode !== null && CODIGOS_INDETERMINADOS.includes(errorCode);
}

export function errorCodeLabel(code: string | null): string | null {
  if (!code) return null;
  const etiquetas: Record<string, string> = {
    tool_timeout_indeterminate: 'la herramienta escribía y expiró: no se sabe si llegó a ocurrir',
    tool_call_in_flight: 'ya había una llamada igual en vuelo: no se repitió',
    tool_outcome_unknown: 'resultado desconocido; alguien debe comprobarlo',
    approval_rejected: 'una persona rechazó la acción',
    lease_lost: 'el worker perdió la ejecución y volvió a la cola',
    max_turns_reached: 'alcanzó el máximo de turnos',
    max_tool_calls_reached: 'alcanzó el máximo de llamadas',
    max_duration_exceeded: 'agotó su tiempo',
    global_budget_exceeded: 'presupuesto global agotado',
    agent_budget_exceeded: 'presupuesto del agente agotado',
    provider_unavailable: 'no hay proveedor de modelo configurado',
    provider_quota: 'cuota del proveedor agotada',
    worker_exception: 'el worker lanzó una excepción',
  };
  return etiquetas[code] ?? code;
}

/** Fechas en hora de Madrid: en la base son UTC. */
export function formatDateTime(fecha: Date | null): string {
  if (!fecha) return '—';
  return fecha.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(fecha: Date | null, ahora: Date = new Date()): string {
  if (!fecha) return '—';
  const segundos = Math.floor((ahora.getTime() - fecha.getTime()) / 1000);
  if (segundos < 60) return 'hace un momento';
  if (segundos < 3_600) return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86_400) return `hace ${Math.floor(segundos / 3_600)} h`;
  return `hace ${Math.floor(segundos / 86_400)} d`;
}

/** Un worker sin latido reciente está muerto, diga lo que diga su estado. */
export const SEGUNDOS_WORKER_VIVO = 120;

export function isWorkerAlive(lastHeartbeatAt: Date, ahora: Date = new Date()): boolean {
  return ahora.getTime() - lastHeartbeatAt.getTime() < SEGUNDOS_WORKER_VIVO * 1_000;
}
