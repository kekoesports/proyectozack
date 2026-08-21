import 'server-only';

import { asc, eq } from 'drizzle-orm';

import { agentToolCalls } from '@/db/schema';
import { db } from '@/lib/db';
import type { AgentToolCall } from '@/types';

/**
 * Propuestas y ejecuciones de tools.
 *
 * Toda llamada se registra al proponerse, incluidas las que acaban en
 * `blocked`. Es lo que permite auditar qué intentó hacer un agente, no solo
 * qué consiguió hacer.
 *
 * Ver docs/agent-os/data-model.md §6.
 */

export type RecordProposedToolCallInput = {
  readonly runId: number;
  readonly stepId?: number | null;
  readonly providerCallId?: string | null;
  readonly toolName: string;
  readonly toolVersion: string;
  readonly actionClass: AgentToolCall['actionClass'];
  /** Input redactado por el redactor de la tool. */
  readonly inputJson: Record<string, unknown>;
  /** SHA-256 hex del JSON canónico del input. */
  readonly inputHash: string;
  readonly idempotencyKey?: string | null;
  readonly status?: AgentToolCall['status'];
};

export async function recordProposedToolCall(
  input: RecordProposedToolCallInput,
): Promise<AgentToolCall> {
  const [row] = await db
    .insert(agentToolCalls)
    .values({
      runId: input.runId,
      stepId: input.stepId ?? null,
      providerCallId: input.providerCallId ?? null,
      toolName: input.toolName,
      toolVersion: input.toolVersion,
      actionClass: input.actionClass,
      inputJson: input.inputJson,
      inputHash: input.inputHash,
      idempotencyKey: input.idempotencyKey ?? null,
      status: input.status ?? 'proposed',
    })
    .returning();

  if (!row) throw new Error('agent-tool-calls: no se pudo registrar la propuesta');
  return row;
}

export type SettleToolCallInput = {
  readonly toolCallId: number;
  readonly status: AgentToolCall['status'];
  /** Resultado redactado y acotado. */
  readonly resultJson?: Record<string, unknown> | null;
  readonly errorCode?: string | null;
  readonly errorMessage?: string | null;
};

/** Cierra la llamada, haya ido bien o mal. */
export async function settleToolCall(input: SettleToolCallInput): Promise<void> {
  await db
    .update(agentToolCalls)
    .set({
      status: input.status,
      resultJson: input.resultJson ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      completedAt: new Date(),
    })
    .where(eq(agentToolCalls.id, input.toolCallId));
}

/** Marca el arranque real de la ejecución, ya superados todos los controles. */
export async function markToolCallExecuting(toolCallId: number): Promise<void> {
  await db
    .update(agentToolCalls)
    .set({ status: 'executing', executedAt: new Date() })
    .where(eq(agentToolCalls.id, toolCallId));
}

export async function getToolCall(id: number): Promise<AgentToolCall | null> {
  const [row] = await db.select().from(agentToolCalls).where(eq(agentToolCalls.id, id)).limit(1);
  return row ?? null;
}

export async function listToolCallsForRun(runId: number): Promise<readonly AgentToolCall[]> {
  return db
    .select()
    .from(agentToolCalls)
    .where(eq(agentToolCalls.runId, runId))
    .orderBy(asc(agentToolCalls.createdAt));
}

/**
 * Busca una llamada previa con la misma clave de idempotencia.
 *
 * Es la defensa contra la doble escritura tras un crash: si el worker murió
 * después de ejecutar pero antes de anotar el resultado, al reanudar encuentra
 * la llamada anterior en vez de repetir el efecto.
 */
export async function findToolCallByIdempotencyKey(
  idempotencyKey: string,
): Promise<AgentToolCall | null> {
  const [row] = await db
    .select()
    .from(agentToolCalls)
    .where(eq(agentToolCalls.idempotencyKey, idempotencyKey))
    .limit(1);
  return row ?? null;
}
