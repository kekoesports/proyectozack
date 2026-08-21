import 'server-only';

import { asc, eq, sql } from 'drizzle-orm';

import { agentRunSteps, agentRuns } from '@/db/schema';
import { db } from '@/lib/db';
import type { AgentRunStep } from '@/types';

/**
 * Timeline de una ejecución.
 *
 * `sequence` no lo elige quien escribe: se toma de `agent_runs.next_step_sequence`
 * y se incrementa en la misma sentencia. Con el UNIQUE `(run_id, sequence)`
 * detrás, dos escrituras concurrentes no pueden ocupar la misma posición —
 * una de las dos falla y se reintenta en vez de pisar el paso anterior.
 *
 * Ver docs/agent-os/data-model.md §5.
 */

export type AppendAgentRunStepInput = {
  readonly runId: number;
  readonly stepType: AgentRunStep['stepType'];
  readonly name: string;
  readonly status?: AgentRunStep['status'];
  /** Ya redactado por quien escribe. */
  readonly inputJson?: Record<string, unknown> | null;
  readonly provider?: string | null;
  readonly model?: string | null;
};

export async function appendAgentRunStep(input: AppendAgentRunStepInput): Promise<AgentRunStep> {
  const [reserved] = await db
    .update(agentRuns)
    .set({ nextStepSequence: sql`${agentRuns.nextStepSequence} + 1`, updatedAt: new Date() })
    .where(eq(agentRuns.id, input.runId))
    .returning({ nextSequence: agentRuns.nextStepSequence });

  if (!reserved) throw new Error(`agent-steps: no existe la ejecución ${input.runId}`);

  // `returning` devuelve el valor YA incrementado; la posición de este paso es
  // la anterior.
  const sequence = reserved.nextSequence - 1;

  const [row] = await db
    .insert(agentRunSteps)
    .values({
      runId: input.runId,
      sequence,
      stepType: input.stepType,
      name: input.name,
      status: input.status ?? 'pending',
      inputJson: input.inputJson ?? null,
      provider: input.provider ?? null,
      model: input.model ?? null,
      startedAt: new Date(),
    })
    .returning();

  if (!row) throw new Error('agent-steps: no se pudo escribir el paso');
  return row;
}

export type CompleteAgentRunStepInput = {
  readonly stepId: number;
  readonly status: AgentRunStep['status'];
  readonly outputJson?: Record<string, unknown> | null;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly estimatedCostMicros?: number;
  readonly errorCode?: string | null;
  readonly errorMessage?: string | null;
};

/**
 * Cierra el paso en curso. Es la única actualización admitida sobre la
 * timeline: un paso terminado no se reescribe para ocultar un fallo.
 */
export async function completeAgentRunStep(input: CompleteAgentRunStepInput): Promise<void> {
  await db
    .update(agentRunSteps)
    .set({
      status: input.status,
      outputJson: input.outputJson ?? null,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      estimatedCostMicros: input.estimatedCostMicros ?? 0,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      completedAt: new Date(),
    })
    .where(eq(agentRunSteps.id, input.stepId));
}

export async function listAgentRunSteps(runId: number): Promise<readonly AgentRunStep[]> {
  return db
    .select()
    .from(agentRunSteps)
    .where(eq(agentRunSteps.runId, runId))
    .orderBy(asc(agentRunSteps.sequence));
}
