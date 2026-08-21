import type { AgentRunCounters, AgentRunLimits } from './types';

/**
 * Presupuesto duro y límites anti-loop.
 *
 * Puro a propósito: el worker le pasa lo que ya sabe —contadores del run,
 * gasto acumulado del mes— y recibe una decisión. Así el límite se puede
 * probar sin base de datos y, sobre todo, se puede comprobar **entre pasos**
 * sin una consulta por vuelta.
 *
 * La regla que gobierna todo: si el precio de un modelo no se conoce, el coste
 * no se inventa. Se marca `pricingUnknown` y el total pasa a ser un mínimo, no
 * una cifra. Un presupuesto que suma cantidades imaginadas no protege de nada.
 */

export type BudgetSnapshot = {
  /** Gasto del mes en curso, en micros. 1 USD = 1.000.000. */
  readonly globalSpentMicros: number;
  readonly globalLimitMicros: number;
  readonly agentSpentMicros: number;
  readonly agentLimitMicros: number;
  readonly runSpentMicros: number;
  /** 0 = sin techo propio; manda el del agente. */
  readonly runLimitMicros: number;
  /** `true` si alguna entrada del periodo no tenía tarifa conocida. */
  readonly pricingUnknown: boolean;
};

export type BudgetBlockReason =
  | 'global_budget_exceeded'
  | 'agent_budget_exceeded'
  | 'run_budget_exceeded'
  | 'max_turns_reached'
  | 'max_tool_calls_reached'
  | 'max_duration_exceeded';

export type BudgetDecision =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: BudgetBlockReason; readonly detail: string };

/**
 * ¿Queda margen para gastar?
 *
 * Un límite a 0 significa "sin techo configurado", no "prohibido gastar": un
 * agente recién sembrado tiene presupuesto 0 y bloquearlo por eso confundiría
 * "sin configurar" con "sin saldo". El techo real lo pone el global.
 */
export function checkBudget(snapshot: BudgetSnapshot): BudgetDecision {
  if (snapshot.globalLimitMicros > 0 && snapshot.globalSpentMicros >= snapshot.globalLimitMicros) {
    return {
      ok: false,
      reason: 'global_budget_exceeded',
      detail: `Gasto global ${snapshot.globalSpentMicros} ≥ límite ${snapshot.globalLimitMicros} micros`,
    };
  }
  if (snapshot.agentLimitMicros > 0 && snapshot.agentSpentMicros >= snapshot.agentLimitMicros) {
    return {
      ok: false,
      reason: 'agent_budget_exceeded',
      detail: `Gasto del agente ${snapshot.agentSpentMicros} ≥ límite ${snapshot.agentLimitMicros} micros`,
    };
  }
  if (snapshot.runLimitMicros > 0 && snapshot.runSpentMicros >= snapshot.runLimitMicros) {
    return {
      ok: false,
      reason: 'run_budget_exceeded',
      detail: `Gasto de la ejecución ${snapshot.runSpentMicros} ≥ límite ${snapshot.runLimitMicros} micros`,
    };
  }
  return { ok: true };
}

/**
 * Límites de forma: turnos, tool calls y duración.
 *
 * Es la defensa contra el bucle. Un modelo que se atasca pidiendo la misma
 * tool no gasta necesariamente mucho dinero por vuelta, pero no para solo.
 */
export function checkRunLimits(
  counters: AgentRunCounters,
  limits: AgentRunLimits,
  now: Date,
): BudgetDecision {
  if (counters.modelTurns >= limits.maxTurns) {
    return {
      ok: false,
      reason: 'max_turns_reached',
      detail: `${counters.modelTurns}/${limits.maxTurns} turnos`,
    };
  }
  if (counters.toolCalls >= limits.maxToolCalls) {
    return {
      ok: false,
      reason: 'max_tool_calls_reached',
      detail: `${counters.toolCalls}/${limits.maxToolCalls} llamadas a tools`,
    };
  }
  const transcurridoS = Math.floor((now.getTime() - counters.startedAt.getTime()) / 1000);
  if (transcurridoS >= limits.maxDurationSeconds) {
    return {
      ok: false,
      reason: 'max_duration_exceeded',
      detail: `${transcurridoS}s/${limits.maxDurationSeconds}s`,
    };
  }
  return { ok: true };
}

/** Presupuesto y límites en una sola comprobación, en ese orden. */
export function checkBudgetAndLimits(
  snapshot: BudgetSnapshot,
  counters: AgentRunCounters,
  limits: AgentRunLimits,
  now: Date,
): BudgetDecision {
  const presupuesto = checkBudget(snapshot);
  if (!presupuesto.ok) return presupuesto;
  return checkRunLimits(counters, limits, now);
}

/**
 * Tarifas conocidas, en micros por millón de tokens.
 *
 * Deliberadamente corta y con fecha. Un modelo que no esté aquí devuelve
 * `pricingUnknown`, y eso es información útil —dice que hay que actualizar la
 * tabla— mientras que un precio inventado no lo es.
 */
export type ModelPricing = {
  readonly inputMicrosPerMillion: number;
  readonly outputMicrosPerMillion: number;
};

/** Revisado 2026-08. Verificar antes de fiarse de un informe de coste. */
export const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  'gemini-2.0-flash': { inputMicrosPerMillion: 100_000, outputMicrosPerMillion: 400_000 },
  'gemini-2.5-flash': { inputMicrosPerMillion: 300_000, outputMicrosPerMillion: 2_500_000 },
};

export type CostEstimate = {
  readonly estimatedCostMicros: number;
  readonly pricingUnknown: boolean;
};

export function estimateCostMicros(
  model: string | null,
  inputTokens: number,
  outputTokens: number,
): CostEstimate {
  const tarifa = model ? MODEL_PRICING[model] : undefined;
  if (!tarifa) return { estimatedCostMicros: 0, pricingUnknown: true };

  const coste =
    (inputTokens / 1_000_000) * tarifa.inputMicrosPerMillion +
    (outputTokens / 1_000_000) * tarifa.outputMicrosPerMillion;

  return { estimatedCostMicros: Math.round(coste), pricingUnknown: false };
}
