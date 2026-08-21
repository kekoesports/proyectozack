/**
 * Presupuesto duro y límites anti-loop.
 *
 * El sistema tiene que poder decir "hasta aquí" por dinero y por forma. Y
 * cuando no conoce el precio de un modelo, tiene que decirlo en vez de
 * inventar una cifra que luego se sumaría como si fuera real.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  MODEL_PRICING,
  checkBudget,
  checkBudgetAndLimits,
  checkRunLimits,
  estimateCostMicros,
  type BudgetSnapshot,
} from '@/lib/agents/budget';

const AHORA = new Date('2026-08-21T10:00:00.000Z');

function snapshot(over: Partial<BudgetSnapshot> = {}): BudgetSnapshot {
  return {
    globalSpentMicros: 0,
    globalLimitMicros: 10_000_000,
    agentSpentMicros: 0,
    agentLimitMicros: 2_000_000,
    runSpentMicros: 0,
    runLimitMicros: 0,
    pricingUnknown: false,
    ...over,
  };
}

describe('checkBudget', () => {
  it('deja pasar con saldo', () => {
    expect(checkBudget(snapshot())).toEqual({ ok: true });
  });

  it('bloquea al alcanzar el límite global, no al superarlo', () => {
    // Igualar el techo ya es haberlo gastado: seguir sería pasarse.
    const res = checkBudget(snapshot({ globalSpentMicros: 10_000_000 }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('global_budget_exceeded');
  });

  it('bloquea por presupuesto del agente aunque quede global', () => {
    const res = checkBudget(snapshot({ agentSpentMicros: 2_000_000 }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('agent_budget_exceeded');
  });

  it('bloquea por presupuesto de la ejecución', () => {
    const res = checkBudget(snapshot({ runSpentMicros: 500, runLimitMicros: 500 }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('run_budget_exceeded');
  });

  it('el global se comprueba antes que el del agente', () => {
    const res = checkBudget(snapshot({ globalSpentMicros: 10_000_000, agentSpentMicros: 2_000_000 }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('global_budget_exceeded');
  });

  it('límite 0 significa "sin techo configurado", no "sin saldo"', () => {
    // Un agente recién sembrado tiene presupuesto 0; bloquearlo por eso
    // confundiría "sin configurar" con "agotado". El techo lo pone el global.
    expect(checkBudget(snapshot({ agentLimitMicros: 0, agentSpentMicros: 999_999 }))).toEqual({ ok: true });
  });
});

describe('checkRunLimits', () => {
  const limites = { maxTurns: 5, maxToolCalls: 10, maxDurationSeconds: 300 };

  it('deja pasar dentro de los límites', () => {
    expect(
      checkRunLimits({ modelTurns: 1, toolCalls: 2, startedAt: AHORA }, limites, AHORA),
    ).toEqual({ ok: true });
  });

  it('para al alcanzar el máximo de turnos', () => {
    const res = checkRunLimits({ modelTurns: 5, toolCalls: 0, startedAt: AHORA }, limites, AHORA);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('max_turns_reached');
  });

  it('para al alcanzar el máximo de llamadas a tools', () => {
    const res = checkRunLimits({ modelTurns: 0, toolCalls: 10, startedAt: AHORA }, limites, AHORA);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('max_tool_calls_reached');
  });

  it('para al agotar la duración', () => {
    const tarde = new Date(AHORA.getTime() + 301_000);
    const res = checkRunLimits({ modelTurns: 0, toolCalls: 0, startedAt: AHORA }, limites, tarde);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('max_duration_exceeded');
  });
});

describe('checkBudgetAndLimits', () => {
  it('el dinero se comprueba antes que la forma', () => {
    const res = checkBudgetAndLimits(
      snapshot({ globalSpentMicros: 10_000_000 }),
      { modelTurns: 99, toolCalls: 99, startedAt: AHORA },
      { maxTurns: 1, maxToolCalls: 1, maxDurationSeconds: 1 },
      AHORA,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('global_budget_exceeded');
  });
});

describe('estimateCostMicros', () => {
  it('calcula con una tarifa conocida', () => {
    const tarifa = MODEL_PRICING['gemini-2.0-flash'];
    expect(tarifa).toBeDefined();
    const res = estimateCostMicros('gemini-2.0-flash', 1_000_000, 1_000_000);
    expect(res.pricingUnknown).toBe(false);
    expect(res.estimatedCostMicros).toBe(
      (tarifa?.inputMicrosPerMillion ?? 0) + (tarifa?.outputMicrosPerMillion ?? 0),
    );
  });

  it('con un modelo desconocido NO inventa coste', () => {
    // Un coste inventado se sumaría al presupuesto como si fuera real. Un hueco
    // declarado se ve en el informe.
    const res = estimateCostMicros('modelo-que-no-existe', 1_000_000, 1_000_000);
    expect(res).toEqual({ estimatedCostMicros: 0, pricingUnknown: true });
  });

  it('sin modelo tampoco', () => {
    expect(estimateCostMicros(null, 500, 500)).toEqual({ estimatedCostMicros: 0, pricingUnknown: true });
  });

  it('cero tokens cuesta cero, pero con tarifa conocida', () => {
    expect(estimateCostMicros('gemini-2.0-flash', 0, 0)).toEqual({
      estimatedCostMicros: 0,
      pricingUnknown: false,
    });
  });
});
