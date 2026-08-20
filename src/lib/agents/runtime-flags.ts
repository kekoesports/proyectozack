import { env } from '@/lib/env';

import { AgentRuntimeError } from './errors';

/**
 * Kill switch global y límites operativos del runtime.
 *
 * `AGENTS_ENABLED` es fail-closed: mientras no valga exactamente `'true'`, no
 * se encola ninguna ejecución. Apagarlo detiene el sistema sin desplegar,
 * porque el gate se evalúa en cada encolado, no al arrancar el proceso.
 */

export function areAgentsEnabled(): boolean {
  return env.AGENTS_ENABLED === true;
}

/** Lanza `agents_disabled` si el kill switch está echado. */
export function assertAgentsEnabled(): void {
  if (!areAgentsEnabled()) {
    throw new AgentRuntimeError(
      'agents_disabled',
      'El runtime de agentes está desactivado (AGENTS_ENABLED).',
    );
  }
}

export type AgentRuntimeLimits = {
  readonly globalMonthlyBudgetMicros: number;
  readonly workerPollMs: number;
  readonly leaseSeconds: number;
  readonly maxConcurrency: number;
};

/** Se lee en cada llamada para que un cambio de env no exija reiniciar. */
export function getAgentRuntimeLimits(): AgentRuntimeLimits {
  return {
    globalMonthlyBudgetMicros: env.AGENT_GLOBAL_MONTHLY_BUDGET_MICROS,
    workerPollMs: env.AGENT_WORKER_POLL_MS,
    leaseSeconds: env.AGENT_LEASE_SECONDS,
    maxConcurrency: env.AGENT_MAX_CONCURRENCY,
  };
}
