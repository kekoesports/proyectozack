/**
 * Fuzz de los límites del bucle.
 *
 * Los tests de ejemplo prueban los casos que se me ocurrieron. Esto prueba los
 * que no: con cualquier combinación de límites y de comportamiento del modelo,
 * el bucle tiene que terminar, y nunca puede ejecutar más turnos ni más
 * llamadas de las permitidas.
 *
 * Es la propiedad que importa de verdad en un sistema con presupuesto: que no
 * exista una secuencia de respuestas del proveedor que lo haga girar sin fin.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import fc from 'fast-check';
import { z } from 'zod';

import { runAgentLoop, type AgentLoopDeps } from '@/lib/agents/agent-loop';
import { eraseAgentTool } from '@/lib/agents/erase-tool';
import { FakeAgentModelProvider } from '@/lib/agents/providers/fake-provider';
import { AgentToolRegistry } from '@/lib/agents/tool-registry';
import type { AgentToolContext, ErasedAgentTool } from '@/lib/agents/types';

const AHORA = new Date('2026-08-21T10:00:00.000Z');

function toolContador(contador: { n: number }): ErasedAgentTool {
  return eraseAgentTool<Record<string, never>, { ok: boolean }>({
    name: 'leerAlgo',
    version: '1',
    description: 'Lee algo.',
    inputSchema: z.object({}).strict(),
    requiredPermission: null,
    actionClass: 'read',
    approvalPolicy: 'never',
    maxExecutionMs: 1_000,
    redactInput: () => ({}),
    redactOutput: (o) => ({ ...o }),
    buildIdempotencyKey: null,
    execute: async () => {
      contador.n += 1;
      return { ok: true };
    },
  });
}

const ctx: AgentToolContext = {
  runId: 1,
  agentId: 1,
  agentSlug: 'a',
  agentMode: 'execute',
  actorRole: 'admin',
  actorUserId: 'u1',
  correlationId: 'c',
  signal: new AbortController().signal,
};

function sinGasto() {
  return {
    globalSpentMicros: 0,
    globalLimitMicros: 1_000_000_000,
    agentSpentMicros: 0,
    agentLimitMicros: 0,
    runSpentMicros: 0,
    runLimitMicros: 0,
    pricingUnknown: false,
  };
}

/** Turno arbitrario: texto, o entre 1 y 6 llamadas a tools (válidas o no). */
const turnoArb = fc.oneof(
  fc.record({ text: fc.string({ maxLength: 40 }), toolCalls: fc.constant([]) }),
  fc.record({
    text: fc.constant(''),
    toolCalls: fc.array(
      fc.record({
        id: fc.constant('c'),
        toolName: fc.constantFrom('leerAlgo', 'noExiste', 'borrarTodo'),
        input: fc.constantFrom({}, { extra: 1 }, null),
      }),
      { minLength: 1, maxLength: 6 },
    ),
  }),
);

describe('el bucle siempre termina dentro de sus límites', () => {
  it('nunca supera maxTurns ni maxToolCalls, sea cual sea la respuesta del modelo', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(turnoArb, { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 1, max: 12 }),
        async (turnos, maxTurns, maxToolCalls) => {
          const contador = { n: 0 };
          const tool = toolContador(contador);
          const provider = new FakeAgentModelProvider(turnos);

          const deps: AgentLoopDeps = {
            provider,
            tools: [tool],
            executor: {
              registry: new AgentToolRegistry([tool], { a: ['leerAlgo'] }),
              agentsEnabled: true,
              agentStatus: 'active',
              isRunActive: async () => true,
              getBudgetSnapshot: async () => sinGasto(),
              findApproval: async () => null,
              consumeApproval: async () => true,
              findPreviousCall: async () => null,
              policyVersion: 'v0',
              now: () => AHORA,
            },
            limits: { maxTurns, maxToolCalls, maxDurationSeconds: 3_600 },
            getBudgetSnapshot: async () => sinGasto(),
            onEvent: async () => {},
            now: () => AHORA,
          };

          const res = await runAgentLoop(deps, { systemPrompt: 's', userMessage: 'u', ctx });

          // Terminó, con un desenlace conocido.
          expect(['completed', 'stopped', 'failed', 'waiting_approval']).toContain(res.status);
          // Nunca pidió al modelo más de lo permitido.
          expect(provider.callCount).toBeLessThanOrEqual(maxTurns);
          // Ni ejecutó más tools de las permitidas.
          expect(contador.n).toBeLessThanOrEqual(maxToolCalls);
        },
      ),
      { numRuns: 120 },
    );
  });

  it('sin turnos que devolver, termina en fallo y no gira', async () => {
    const contador = { n: 0 };
    const tool = toolContador(contador);
    const provider = new FakeAgentModelProvider([]);

    const deps: AgentLoopDeps = {
      provider,
      tools: [tool],
      executor: {
        registry: new AgentToolRegistry([tool], { a: ['leerAlgo'] }),
        agentsEnabled: true,
        agentStatus: 'active',
        isRunActive: async () => true,
        getBudgetSnapshot: async () => sinGasto(),
        findApproval: async () => null,
        consumeApproval: async () => true,
        findPreviousCall: async () => null,
        policyVersion: 'v0',
        now: () => AHORA,
      },
      limits: { maxTurns: 50, maxToolCalls: 50, maxDurationSeconds: 3_600 },
      getBudgetSnapshot: async () => sinGasto(),
      onEvent: async () => {},
      now: () => AHORA,
    };

    const res = await runAgentLoop(deps, { systemPrompt: 's', userMessage: 'u', ctx });
    expect(res.status).toBe('failed');
    expect(provider.callCount).toBe(1);
  });
});
