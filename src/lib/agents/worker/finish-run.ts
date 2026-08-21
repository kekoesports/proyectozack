import 'server-only';

import { and, eq } from 'drizzle-orm';

import { agentRuns } from '@/db/schema';
import { db } from '@/lib/db';

import type { AgentLoopOutcome } from '../agent-loop';
import { redactErrorMessage } from '../redaction';
import { decideRetry, statusForDecision, type RetryDecision } from './retry-policy';
import { summarizeOutcome } from './execute-run';
import type { AgentRun } from '@/types';

/**
 * Cierra una ejecución según cómo acabó.
 *
 * Todo lo que la fila necesita se escribe en **un solo `UPDATE`**. No es
 * estilo: los CHECK de `agent_runs` no admiten el estado intermedio. Un estado
 * terminal sin `completed_at`, o `running` sin lease, revientan la constraint
 * si se escriben en dos pasadas.
 *
 * El `WHERE` exige seguir siendo dueños del lease. Si lo perdimos mientras
 * trabajábamos, el cierre no se aplica: la ejecución ya es de otro worker y
 * pisarla escribiría un desenlace que no corresponde a lo que ese otro está
 * haciendo.
 */

export type FinishRunResult = {
  readonly applied: boolean;
  readonly decision: RetryDecision | null;
  readonly status: AgentRun['status'];
};

export async function finishAgentRun(opts: {
  readonly run: AgentRun;
  readonly workerId: string;
  readonly outcome: AgentLoopOutcome;
  readonly now?: Date;
  readonly aleatorio?: number;
}): Promise<FinishRunResult> {
  const ahora = opts.now ?? new Date();
  const resumen = summarizeOutcome(opts.outcome);

  const comun = {
    outputSummary: resumen,
    leaseOwner: null,
    leaseExpiresAt: null,
    updatedAt: ahora,
  };

  const aplicar = async (
    valores: Partial<typeof agentRuns.$inferInsert>,
  ): Promise<boolean> => {
    const filas = await db
      .update(agentRuns)
      .set(valores)
      .where(
        and(
          eq(agentRuns.id, opts.run.id),
          eq(agentRuns.leaseOwner, opts.workerId),
          eq(agentRuns.status, 'running'),
        ),
      )
      .returning({ id: agentRuns.id });
    return filas.length > 0;
  };

  switch (opts.outcome.status) {
    case 'completed': {
      const ok = await aplicar({ ...comun, status: 'succeeded', completedAt: ahora });
      return { applied: ok, decision: null, status: 'succeeded' };
    }

    case 'waiting_approval': {
      // Sin lease: `agent_runs_waiting_no_lease_ck` no admite que una ejecución
      // esperando firma retenga un lease que nadie va a renovar.
      const ok = await aplicar({ ...comun, status: 'waiting_approval', completedAt: null });
      return { applied: ok, decision: null, status: 'waiting_approval' };
    }

    case 'stopped': {
      // Un límite alcanzado no es un fallo del que recuperarse: reintentar
      // volvería a alcanzarlo. Es terminal salvo cancelación, que ya tiene su
      // propio estado.
      const status = opts.outcome.reason === 'run_cancelled' ? 'cancelled' : estadoPorParada(opts.outcome.reason);
      const ok = await aplicar({
        ...comun,
        status,
        completedAt: ahora,
        lastErrorCode: opts.outcome.reason,
        lastErrorMessage: redactErrorMessage(opts.outcome.detail),
      });
      return { applied: ok, decision: null, status };
    }

    case 'failed': {
      const decision = decideRetry({
        errorCode: opts.outcome.code,
        attempt: opts.run.attempt,
        maxAttempts: opts.run.maxAttempts,
        now: ahora,
        ...(opts.aleatorio !== undefined ? { aleatorio: opts.aleatorio } : {}),
      });
      const status = statusForDecision(decision);

      const ok = await aplicar({
        ...comun,
        status,
        // `retry_scheduled` no es terminal: no lleva `completed_at`, y el
        // CHECK solo lo exige para los que sí lo son.
        completedAt: decision.kind === 'retry' ? null : ahora,
        ...(decision.kind === 'retry' ? { availableAt: decision.availableAt } : {}),
        lastErrorCode: opts.outcome.code,
        lastErrorMessage: redactErrorMessage(opts.outcome.message),
      });

      return { applied: ok, decision, status };
    }
  }
}

/**
 * Estado terminal de cada motivo de parada.
 *
 * `budget_blocked` existe aparte de `failed` porque no es un fallo: el sistema
 * hizo justo lo que debía, y en el informe mensual conviene distinguir "se
 * rompió" de "se quedó sin saldo".
 */
function estadoPorParada(reason: string): AgentRun['status'] {
  if (reason.includes('budget')) return 'budget_blocked';
  return 'failed';
}
