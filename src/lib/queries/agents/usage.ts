import 'server-only';

import { and, eq, gte, sql } from 'drizzle-orm';

import { agentRuns, agentUsageLedger } from '@/db/schema';
import { db } from '@/lib/db';
import type { AgentUsageEntry } from '@/types';

/**
 * Ledger de consumo y agregados de presupuesto.
 *
 * Append-only: una entrada registrada no se corrige. Si una estimación de
 * coste resulta equivocada, se anota otra entrada; reescribir el ledger
 * convertiría el presupuesto en una cifra opinable.
 *
 * Ver docs/agent-os/data-model.md §11.
 */

export type RecordAgentUsageInput = {
  readonly runId: number;
  readonly stepId?: number | null;
  readonly agentId: number;
  readonly kind: AgentUsageEntry['kind'];
  readonly provider?: string | null;
  readonly model?: string | null;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cachedInputTokens?: number | null;
  readonly estimatedCostMicros?: number;
  /** `true` cuando no hay tarifa conocida. Entonces el coste queda a 0. */
  readonly pricingUnknown?: boolean;
  readonly durationMs?: number | null;
  readonly usageJson?: Record<string, unknown> | null;
  readonly occurredAt?: Date;
};

/**
 * Anota consumo y acumula en el run.
 *
 * Los contadores de `agent_runs` se actualizan con `+=` en SQL, no leyendo y
 * escribiendo desde el proceso: dos pasos concurrentes del mismo run no pueden
 * perder uno de los dos incrementos.
 *
 * Sin tarifa conocida el coste es 0 y `pricing_unknown` queda a `true`. Un
 * coste inventado se sumaría al presupuesto como si fuera real.
 */
export async function recordAgentUsage(input: RecordAgentUsageInput): Promise<AgentUsageEntry> {
  const pricingUnknown = input.pricingUnknown ?? false;
  const cost = pricingUnknown ? 0 : input.estimatedCostMicros ?? 0;
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;

  const [row] = await db
    .insert(agentUsageLedger)
    .values({
      runId: input.runId,
      stepId: input.stepId ?? null,
      agentId: input.agentId,
      kind: input.kind,
      provider: input.provider ?? null,
      model: input.model ?? null,
      inputTokens,
      outputTokens,
      cachedInputTokens: input.cachedInputTokens ?? null,
      estimatedCostMicros: cost,
      pricingUnknown,
      durationMs: input.durationMs ?? null,
      usageJson: input.usageJson ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    })
    .returning();

  if (!row) throw new Error('agent-usage: no se pudo registrar el consumo');

  await db
    .update(agentRuns)
    .set({
      inputTokens: sql`${agentRuns.inputTokens} + ${inputTokens}`,
      outputTokens: sql`${agentRuns.outputTokens} + ${outputTokens}`,
      estimatedCostMicros: sql`${agentRuns.estimatedCostMicros} + ${cost}`,
      updatedAt: new Date(),
    })
    .where(eq(agentRuns.id, input.runId));

  return row;
}

export type AgentUsageTotals = {
  readonly costMicros: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** `true` si alguna entrada del periodo no tenía tarifa: el total es un mínimo. */
  readonly hasUnknownPricing: boolean;
};

function toTotals(row: {
  cost: string | number | null;
  input: string | number | null;
  output: string | number | null;
  unknown: boolean | null;
}): AgentUsageTotals {
  return {
    costMicros: Number(row.cost ?? 0),
    inputTokens: Number(row.input ?? 0),
    outputTokens: Number(row.output ?? 0),
    hasUnknownPricing: row.unknown === true,
  };
}

/** Gasto de un agente desde una fecha. Base del presupuesto por agente. */
export async function getAgentUsageSince(agentId: number, since: Date): Promise<AgentUsageTotals> {
  const [row] = await db
    .select({
      cost: sql<string>`coalesce(sum(${agentUsageLedger.estimatedCostMicros}), 0)`,
      input: sql<string>`coalesce(sum(${agentUsageLedger.inputTokens}), 0)`,
      output: sql<string>`coalesce(sum(${agentUsageLedger.outputTokens}), 0)`,
      unknown: sql<boolean>`bool_or(${agentUsageLedger.pricingUnknown})`,
    })
    .from(agentUsageLedger)
    .where(and(eq(agentUsageLedger.agentId, agentId), gte(agentUsageLedger.occurredAt, since)));

  return toTotals(row ?? { cost: 0, input: 0, output: 0, unknown: false });
}

/** Gasto global desde una fecha. Base del presupuesto global. */
export async function getGlobalUsageSince(since: Date): Promise<AgentUsageTotals> {
  const [row] = await db
    .select({
      cost: sql<string>`coalesce(sum(${agentUsageLedger.estimatedCostMicros}), 0)`,
      input: sql<string>`coalesce(sum(${agentUsageLedger.inputTokens}), 0)`,
      output: sql<string>`coalesce(sum(${agentUsageLedger.outputTokens}), 0)`,
      unknown: sql<boolean>`bool_or(${agentUsageLedger.pricingUnknown})`,
    })
    .from(agentUsageLedger)
    .where(gte(agentUsageLedger.occurredAt, since));

  return toTotals(row ?? { cost: 0, input: 0, output: 0, unknown: false });
}
