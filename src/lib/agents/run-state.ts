import type { agentRunStatusEnum } from '@/db/schema/agentEnums';

export type AgentRunStatus = (typeof agentRunStatusEnum.enumValues)[number];

/**
 * Transiciones de estado de una ejecución.
 *
 * Duplica en TypeScript lo que los CHECK de `agent_runs` ya imponen, y lo hace
 * a propósito: la base impide el estado imposible, esto impide construirlo y
 * dice por qué. Cuando divergen, manda la base.
 *
 * El detalle que más cuesta recordar y que aquí queda escrito: los campos que
 * acompañan al estado —lease, `completed_at`— tienen que ir en el **mismo**
 * `UPDATE` que lo cambia. Escribirlos en una segunda pasada deja un instante
 * en el que la fila viola el CHECK, y Postgres la rechaza entera.
 */

export const ESTADOS_TERMINALES: readonly AgentRunStatus[] = [
  'succeeded',
  'failed',
  'cancelled',
  'budget_blocked',
  'dead_letter',
];

export function isTerminalRunStatus(status: AgentRunStatus): boolean {
  return ESTADOS_TERMINALES.includes(status);
}

/** Qué puede venir después de cada estado. */
const TRANSICIONES: Readonly<Record<AgentRunStatus, readonly AgentRunStatus[]>> = {
  queued: ['running', 'cancelled', 'budget_blocked'],
  // `queued` de vuelta cubre el lease perdido: la ejecución vuelve a la cola.
  running: [
    'waiting_approval',
    'retry_scheduled',
    'succeeded',
    'failed',
    'cancelled',
    'budget_blocked',
    'dead_letter',
    'queued',
  ],
  waiting_approval: ['queued', 'running', 'cancelled', 'failed'],
  retry_scheduled: ['running', 'queued', 'cancelled', 'dead_letter', 'budget_blocked'],
  succeeded: [],
  failed: [],
  cancelled: [],
  budget_blocked: [],
  dead_letter: [],
};

export type RunTransitionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: 'run_terminal' | 'run_invalid_transition' };

export function canTransitionRun(from: AgentRunStatus, to: AgentRunStatus): RunTransitionResult {
  if (isTerminalRunStatus(from)) return { ok: false, code: 'run_terminal' };
  if (!TRANSICIONES[from].includes(to)) return { ok: false, code: 'run_invalid_transition' };
  return { ok: true };
}

export type RunStateFields = {
  readonly status: AgentRunStatus;
  readonly leaseOwner: string | null;
  readonly leaseExpiresAt: Date | null;
  readonly completedAt: Date | null;
};

export type RunStateViolation =
  | 'running_requires_lease'
  | 'waiting_approval_holds_lease'
  | 'terminal_requires_completed_at';

/**
 * Comprueba lo mismo que los CHECK de la tabla, antes de intentar escribir.
 *
 * Sirve para que el fallo aparezca con un nombre —`running_requires_lease`— en
 * vez de como una violación de constraint que hay que ir a buscar al SQL.
 */
export function validateRunState(fields: RunStateFields): readonly RunStateViolation[] {
  const violaciones: RunStateViolation[] = [];

  if (fields.status === 'running' && (!fields.leaseOwner || !fields.leaseExpiresAt)) {
    violaciones.push('running_requires_lease');
  }
  if (fields.status === 'waiting_approval' && fields.leaseOwner !== null) {
    violaciones.push('waiting_approval_holds_lease');
  }
  if (isTerminalRunStatus(fields.status) && fields.completedAt === null) {
    violaciones.push('terminal_requires_completed_at');
  }

  return violaciones;
}

/**
 * Errores que merecen otro intento.
 *
 * La lista es corta a propósito. Reintentar un fallo determinista —un input
 * inválido, una tool desconocida, un permiso que falta— consume presupuesto y
 * llega al mismo sitio; lo único que cambia es que tarda más en verse.
 */
const CODIGOS_TRANSITORIOS: readonly string[] = [
  'provider_quota',
  'provider_timeout',
  // `provider_unavailable` NO está aquí, y es deliberado: significa que no hay
  // proveedor configurado, y eso no se arregla solo. `NullProvider` ya lo
  // devuelve como no reintentable; tenerlo en esta lista contradecía al propio
  // proveedor y gastaba tres intentos para llegar al mismo sitio. Se vio al
  // ejecutar el worker: la primera ejecución real acabó en `dead_letter` tras
  // reintentar un fallo permanente.
  // Solo el de LECTURA. `tool_timeout_indeterminate` —el de una tool que
  // escribe— queda deliberadamente fuera: ahí no se sabe si la acción ocurrió,
  // y reintentar lo que quizá ya pasó es exactamente el fallo que la
  // idempotencia existe para evitar.
  'tool_timeout',
  'lease_lost',
  'db_unavailable',
];

/**
 * Códigos que significan "no se sabe qué pasó".
 *
 * Ni se reintentan ni se dan por fallidos: alguien tiene que mirar si la
 * acción llegó a ocurrir.
 */
export const CODIGOS_INDETERMINADOS: readonly string[] = [
  'tool_timeout_indeterminate',
  'tool_call_in_flight',
  // Motivo con el que el bucle detiene la ejecución al toparse con cualquiera
  // de los dos anteriores. Acaba en `agent_runs.last_error_code`, así que tiene
  // que estar aquí para que la UI lo destaque igual que a los otros.
  'tool_outcome_unknown',
];

export function isIndeterminateErrorCode(code: string | null | undefined): boolean {
  return code !== null && code !== undefined && CODIGOS_INDETERMINADOS.includes(code);
}

export function isRetryableErrorCode(code: string | null | undefined): boolean {
  return code !== null && code !== undefined && CODIGOS_TRANSITORIOS.includes(code);
}

/**
 * Espera antes del siguiente intento, con jitter.
 *
 * El jitter no es un adorno: sin él, N ejecuciones que fallan a la vez por la
 * misma causa —el proveedor caído— reintentan a la vez y lo tumban otra vez en
 * cuanto vuelve.
 */
export function computeRetryDelayMs(attempt: number, aleatorio: number = Math.random()): number {
  const base = Math.min(60_000, 2 ** Math.max(0, attempt) * 1_000);
  const jitter = base * 0.25 * aleatorio;
  return Math.round(base + jitter);
}
