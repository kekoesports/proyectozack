import 'server-only';

import { and, eq, sql } from 'drizzle-orm';

import { agentApprovals, agentRuns, agentToolCalls } from '@/db/schema';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

import type { AgentLoopEvent } from '../agent-loop';
import type { BudgetSnapshot } from '../budget';
import { appendAgentRunStep, completeAgentRunStep } from '@/lib/queries/agents/steps';
import { recordAgentUsage } from '@/lib/queries/agents/usage';
import { redactErrorMessage } from '../redaction';
import type { AgentToolExecutionResult } from '../types';
import type { ToolCallRecordInput, ToolExecutorDeps } from '../tool-executor';
import type { AgentDefinition, AgentRun } from '@/types';

/**
 * Todo lo que el bucle necesita de la base de datos, en un solo sitio.
 *
 * El bucle y el executor de PR 2 no importan Postgres: reciben callbacks. Este
 * módulo los construye para una ejecución concreta, y es también donde se
 * cumple el contrato de idempotencia —la fila de `agent_tool_calls` se escribe
 * antes de ejecutar la tool, no después—.
 */

export type RunPersistence = {
  readonly handleEvent: (evento: AgentLoopEvent) => Promise<void>;
  readonly getBudgetSnapshot: () => Promise<BudgetSnapshot>;
  readonly findApproval: ToolExecutorDeps['findApproval'];
  readonly consumeApproval: ToolExecutorDeps['consumeApproval'];
  readonly findPreviousCall: ToolExecutorDeps['findPreviousCall'];
  readonly beginToolCall: (info: ToolCallRecordInput) => Promise<number>;
  readonly settleToolCall: (toolCallId: number, result: AgentToolExecutionResult) => Promise<void>;
};

export function buildRunPersistence(opts: {
  readonly run: AgentRun;
  readonly agent: AgentDefinition;
  readonly workerId: string;
}): RunPersistence {
  const { run, agent } = opts;

  /** Paso del modelo en curso, para poder cerrarlo cuando llegue el consumo. */
  let stepActualId: number | null = null;

  return {
    async handleEvent(evento) {
      switch (evento.kind) {
        case 'model_turn': {
          const step = await appendAgentRunStep({
            runId: run.id,
            stepType: 'model',
            name: `turno ${evento.index}`,
            status: 'running',
            provider: agent.modelProvider,
            model: agent.modelName,
          });
          stepActualId = step.id;
          await completeAgentRunStep({
            stepId: step.id,
            status: 'succeeded',
            outputJson: { textLength: evento.text.length, toolCalls: evento.toolCallCount },
          });
          return;
        }

        case 'tool_result': {
          const step = await appendAgentRunStep({
            runId: run.id,
            stepType: 'tool',
            name: evento.toolName,
            status: 'running',
          });
          await completeAgentRunStep({
            stepId: step.id,
            status: estadoDePaso(evento.result),
            outputJson: resumenDeResultado(evento.result),
            ...(evento.result.status === 'failed' || evento.result.status === 'indeterminate'
              ? { errorCode: evento.result.code, errorMessage: evento.result.message }
              : {}),
          });
          // Los contadores duros viven en la fila del run: son los que miran el
          // presupuesto y los límites, y tienen que subir aunque el paso falle.
          await db
            .update(agentRuns)
            .set({ toolCalls: sql`${agentRuns.toolCalls} + 1`, updatedAt: new Date() })
            .where(eq(agentRuns.id, run.id));
          return;
        }

        case 'usage': {
          await recordAgentUsage({
            runId: run.id,
            stepId: stepActualId,
            agentId: agent.id,
            kind: 'model_turn',
            provider: agent.modelProvider,
            model: agent.modelName,
            inputTokens: evento.inputTokens,
            outputTokens: evento.outputTokens,
            estimatedCostMicros: evento.estimatedCostMicros,
            pricingUnknown: evento.pricingUnknown,
          });
          await db
            .update(agentRuns)
            .set({ modelTurns: sql`${agentRuns.modelTurns} + 1`, updatedAt: new Date() })
            .where(eq(agentRuns.id, run.id));
          return;
        }
      }
    },

    async getBudgetSnapshot(): Promise<BudgetSnapshot> {
      const desde = inicioDelMes(new Date());

      const [global] = await db
        .select({
          coste: sql<string>`coalesce(sum(${agentRuns.estimatedCostMicros}), 0)`,
        })
        .from(agentRuns)
        .where(sql`${agentRuns.createdAt} >= ${desde}`);

      const [porAgente] = await db
        .select({
          coste: sql<string>`coalesce(sum(${agentRuns.estimatedCostMicros}), 0)`,
        })
        .from(agentRuns)
        .where(and(eq(agentRuns.agentId, agent.id), sql`${agentRuns.createdAt} >= ${desde}`));

      const [actual] = await db
        .select({ coste: agentRuns.estimatedCostMicros })
        .from(agentRuns)
        .where(eq(agentRuns.id, run.id))
        .limit(1);

      return {
        globalSpentMicros: Number(global?.coste ?? 0),
        globalLimitMicros: env.AGENT_GLOBAL_MONTHLY_BUDGET_MICROS,
        agentSpentMicros: Number(porAgente?.coste ?? 0),
        agentLimitMicros: agent.monthlyBudgetMicros,
        runSpentMicros: Number(actual?.coste ?? 0),
        // Sin techo propio por ejecución: manda el del agente.
        runLimitMicros: 0,
        pricingUnknown: false,
      };
    },

    async findApproval(actionHash) {
      const [fila] = await db
        .select({
          id: agentApprovals.id,
          status: agentApprovals.status,
          actionHash: agentApprovals.actionHash,
          actionClass: agentApprovals.actionClass,
          expiresAt: agentApprovals.expiresAt,
          consumedAt: agentApprovals.consumedAt,
        })
        .from(agentApprovals)
        .where(
          and(
            eq(agentApprovals.runId, run.id),
            eq(agentApprovals.actionHash, actionHash),
            eq(agentApprovals.status, 'approved'),
          ),
        )
        .limit(1);

      return fila ?? null;
    },

    async consumeApproval(approvalId, actionHash) {
      // `UPDATE ... WHERE status='approved'` es lo que impide gastarla dos
      // veces: si otro proceso llegó antes, no devuelve fila.
      const filas = await db
        .update(agentApprovals)
        .set({ status: 'consumed', consumedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(agentApprovals.id, approvalId),
            eq(agentApprovals.actionHash, actionHash),
            eq(agentApprovals.status, 'approved'),
            sql`${agentApprovals.expiresAt} > now()`,
          ),
        )
        .returning({ id: agentApprovals.id });

      return filas.length > 0;
    },

    async findPreviousCall(idempotencyKey) {
      const [fila] = await db
        .select({ status: agentToolCalls.status, resultJson: agentToolCalls.resultJson })
        .from(agentToolCalls)
        .where(eq(agentToolCalls.idempotencyKey, idempotencyKey))
        .limit(1);

      if (!fila) return null;
      return { status: fila.status, resultJson: fila.resultJson ?? null };
    },

    /**
     * Escribe la fila ANTES de ejecutar, en `executing`.
     *
     * Es el contrato de idempotencia entre procesos: si el worker muere a mitad
     * de la tool, esta fila es lo único que impide que el reintento repita el
     * efecto a ciegas.
     */
    async beginToolCall(info) {
      const [fila] = await db
        .insert(agentToolCalls)
        .values({
          runId: run.id,
          toolName: info.toolName,
          toolVersion: info.toolVersion,
          actionClass: info.actionClass,
          status: 'executing',
          inputJson: info.inputJson,
          inputHash: info.inputHash,
          idempotencyKey: info.idempotencyKey,
          providerCallId: info.providerCallId,
          executedAt: new Date(),
        })
        .returning({ id: agentToolCalls.id });

      if (!fila) throw new Error('agents: no se pudo registrar la llamada antes de ejecutarla');
      return fila.id;
    },

    async settleToolCall(toolCallId, result) {
      await db
        .update(agentToolCalls)
        .set({
          status: estadoDeLlamada(result),
          resultJson: resumenDeResultado(result),
          completedAt: new Date(),
          ...(result.status === 'failed' || result.status === 'indeterminate'
            ? { errorCode: result.code, errorMessage: redactErrorMessage(result.message) }
            : {}),
        })
        .where(eq(agentToolCalls.id, toolCallId));
    },
  };
}

/**
 * Un resultado indeterminado deja la fila en `executing`.
 *
 * Es deliberado: `executing` con la ejecución ya terminada es una anomalía
 * visible —y detectable con una consulta— que además hace que cualquier
 * reintento futuro choque con `tool_call_in_flight` en vez de repetir la
 * acción. Marcarla `failed` la volvería reintentable.
 */
function estadoDeLlamada(result: AgentToolExecutionResult): 'succeeded' | 'failed' | 'blocked' | 'executing' {
  switch (result.status) {
    case 'succeeded':
    case 'simulated':
      return 'succeeded';
    case 'blocked':
      return 'blocked';
    case 'failed':
      return 'failed';
    case 'indeterminate':
      return 'executing';
    case 'waiting_approval':
      return 'blocked';
  }
}

function estadoDePaso(result: AgentToolExecutionResult): 'succeeded' | 'failed' | 'skipped' {
  switch (result.status) {
    case 'succeeded':
    case 'simulated':
      return 'succeeded';
    case 'blocked':
    case 'waiting_approval':
      return 'skipped';
    case 'failed':
    case 'indeterminate':
      return 'failed';
  }
}

function resumenDeResultado(result: AgentToolExecutionResult): Record<string, unknown> {
  switch (result.status) {
    case 'succeeded':
      return result.output;
    case 'simulated':
      return { simulated: true, wouldHave: result.wouldHave };
    case 'waiting_approval':
      return { waitingApproval: true, actionHash: result.actionHash };
    case 'blocked':
      return { blocked: true, code: result.code };
    case 'failed':
    case 'indeterminate':
      return { status: result.status, code: result.code };
  }
}

function inicioDelMes(ahora: Date): Date {
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
}
