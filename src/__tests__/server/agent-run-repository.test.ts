/**
 * Encolado de ejecuciones.
 *
 * Tres cosas que no pueden fallar nunca y que aquí se prueban sin base de
 * datos: el kill switch global corta antes de tocar nada, un agente apagado no
 * acumula cola, y una clave de idempotencia repetida devuelve la ejecución
 * existente en vez de crear una segunda.
 *
 * `AGENTS_ENABLED` se mockea con el valor ya transformado (booleano) porque en
 * producción lo transforma Zod; el proxy de jest.setup.ts devolvería la cadena
 * cruda y ocultaría el contrato real.
 */

jest.mock('server-only', () => ({}));

const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/lib/db', () => ({ db: { insert: mockInsert, select: mockSelect, update: mockUpdate } }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

let MOCK_AGENTS_ENABLED = false;
jest.mock('@/lib/env', () => ({
  env: {
    get AGENTS_ENABLED() { return MOCK_AGENTS_ENABLED; },
    get AGENT_GLOBAL_MONTHLY_BUDGET_MICROS() { return 10_000_000; },
    get AGENT_WORKER_POLL_MS() { return 2_000; },
    get AGENT_LEASE_SECONDS() { return 60; },
    get AGENT_MAX_CONCURRENCY() { return 1; },
  },
}));

import { isAgentRuntimeError } from '@/lib/agents/errors';
import { areAgentsEnabled, getAgentRuntimeLimits } from '@/lib/agents/runtime-flags';
import { enqueueAgentRun } from '@/lib/queries/agents/runs';

type FilaAgente = { id: number; status: 'active' | 'paused' | 'disabled' };

/**
 * `enqueueAgentRun` hace hasta dos SELECT: el agente y, si hubo conflicto, la
 * ejecución existente. Se encolan las respuestas en orden.
 */
function stubSelects(respuestas: readonly unknown[][]): void {
  let i = 0;
  mockSelect.mockImplementation(() => ({
    from: () => ({
      where: () => ({ limit: async () => respuestas[i++] ?? [] }),
    }),
  }));
}

function stubInsert(devuelve: readonly unknown[]): void {
  mockInsert.mockReturnValue({
    values: () => ({ onConflictDoNothing: () => ({ returning: async () => devuelve }) }),
  });
}

const AGENTE_ACTIVO: FilaAgente = { id: 3, status: 'active' };

describe('kill switch global', () => {
  afterEach(() => {
    MOCK_AGENTS_ENABLED = false;
    mockSelect.mockReset();
    mockInsert.mockReset();
  });

  it('el runtime está apagado mientras la variable no valga true', () => {
    MOCK_AGENTS_ENABLED = false;
    expect(areAgentsEnabled()).toBe(false);
    MOCK_AGENTS_ENABLED = true;
    expect(areAgentsEnabled()).toBe(true);
  });

  it('con el switch apagado no se encola nada ni se consulta la base', async () => {
    MOCK_AGENTS_ENABLED = false;
    await expect(
      enqueueAgentRun({ agentSlug: 'guardian', triggerType: 'manual', correlationId: 'c-1' }),
    ).rejects.toMatchObject({ code: 'agents_disabled' });
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('los límites operativos tienen defaults seguros', () => {
    const limites = getAgentRuntimeLimits();
    expect(limites.maxConcurrency).toBe(1);
    expect(limites.leaseSeconds).toBe(60);
    expect(limites.globalMonthlyBudgetMicros).toBe(10_000_000);
  });
});

describe('enqueueAgentRun', () => {
  beforeEach(() => {
    MOCK_AGENTS_ENABLED = true;
    mockSelect.mockReset();
    mockInsert.mockReset();
  });
  afterEach(() => {
    MOCK_AGENTS_ENABLED = false;
  });

  it('rechaza un agente inexistente con código estable', async () => {
    stubSelects([[]]);
    const error = await enqueueAgentRun({
      agentSlug: 'fantasma',
      triggerType: 'manual',
      correlationId: 'c-1',
    }).catch((e: unknown) => e);
    expect(isAgentRuntimeError(error) && error.code).toBe('agent_not_found');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rechaza un agente desactivado: apagado no significa "acumula cola"', async () => {
    stubSelects([[{ id: 9, status: 'disabled' } satisfies FilaAgente]]);
    const error = await enqueueAgentRun({
      agentSlug: 'guardian',
      triggerType: 'schedule',
      correlationId: 'c-2',
    }).catch((e: unknown) => e);
    expect(isAgentRuntimeError(error) && error.code).toBe('agent_disabled');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('encola cuando el agente está activo', async () => {
    stubSelects([[AGENTE_ACTIVO]]);
    stubInsert([{ id: 101, status: 'queued' }]);
    const res = await enqueueAgentRun({
      agentSlug: 'guardian',
      triggerType: 'manual',
      correlationId: 'c-3',
    });
    expect(res.deduplicated).toBe(false);
    expect(res.run.id).toBe(101);
  });

  it('con clave repetida devuelve la ejecución existente, no una segunda', async () => {
    stubSelects([[AGENTE_ACTIVO], [{ id: 55, idempotencyKey: 'schedule:guardian-daily:2026-08-21' }]]);
    stubInsert([]); // ON CONFLICT DO NOTHING: sin fila devuelta.
    const res = await enqueueAgentRun({
      agentSlug: 'guardian',
      triggerType: 'schedule',
      correlationId: 'c-4',
      idempotencyKey: 'schedule:guardian-daily:2026-08-21',
    });
    expect(res.deduplicated).toBe(true);
    expect(res.run.id).toBe(55);
  });

  it('un conflicto sin clave de idempotencia es un fallo, no un duplicado', async () => {
    // Sin clave, el conflicto no puede venir del índice parcial: tragárselo
    // ocultaría un problema real de escritura.
    stubSelects([[AGENTE_ACTIVO]]);
    stubInsert([]);
    const error = await enqueueAgentRun({
      agentSlug: 'guardian',
      triggerType: 'manual',
      correlationId: 'c-5',
    }).catch((e: unknown) => e);
    expect(isAgentRuntimeError(error) && error.code).toBe('agent_invalid_input');
  });
});
