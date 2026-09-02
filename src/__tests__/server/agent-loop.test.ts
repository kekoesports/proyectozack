/**
 * El bucle de ejecución, con un proveedor guionizado.
 *
 * Ninguna prueba llama a Gemini: `FakeAgentModelProvider` devuelve turnos
 * fijos, así que los límites, la parada por aprobación y el corte por
 * presupuesto se comprueban de forma determinista y sin clave de API.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { z } from 'zod';

import { runAgentLoop, type AgentLoopDeps, type AgentLoopEvent } from '@/lib/agents/agent-loop';
import { eraseAgentTool } from '@/lib/agents/erase-tool';
import { FakeAgentModelProvider } from '@/lib/agents/providers/fake-provider';
import { AgentToolRegistry } from '@/lib/agents/tool-registry';
import type { ToolExecutorDeps } from '@/lib/agents/tool-executor';
import type { AgentToolContext, ErasedAgentTool } from '@/lib/agents/types';

const AHORA = new Date('2026-08-21T10:00:00.000Z');

let ejecuciones: string[] = [];

const toolLectura: ErasedAgentTool = eraseAgentTool<Record<string, never>, { dato: string }>({
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
    ejecuciones.push('leerAlgo');
    return { dato: 'valor' };
  },
});

const toolEnvio: ErasedAgentTool = eraseAgentTool<{ to: string }, { enviado: boolean }>({
  name: 'enviarEmail',
  version: '1',
  description: 'Envía un email.',
  inputSchema: z.object({ to: z.string().email() }).strict(),
  requiredPermission: null,
  actionClass: 'external_side_effect',
  approvalPolicy: 'always',
  maxExecutionMs: 1_000,
  redactInput: (i) => ({ to: i.to }),
  redactOutput: (o) => ({ ...o }),
  buildIdempotencyKey: (ctx, i) => `email:${ctx.runId}:${i.to}`,
  execute: async () => {
    ejecuciones.push('enviarEmail');
    return { enviado: true };
  },
});

const TOOLS = [toolLectura, toolEnvio];

function ctx(over: Partial<AgentToolContext> = {}): AgentToolContext {
  return {
    runId: 1,
    agentId: 1,
    agentSlug: 'crm-steward',
    agentMode: 'execute',
    actorRole: 'admin',
    actorUserId: 'u1',
    correlationId: 'c-1',
    signal: new AbortController().signal,
    ...over,
  };
}

function executorDeps(over: Partial<ToolExecutorDeps> = {}): ToolExecutorDeps {
  return {
    registry: new AgentToolRegistry(TOOLS, { 'crm-steward': TOOLS.map((t) => t.name) }),
    agentsEnabled: true,
    agentStatus: 'active',
    isRunActive: async () => true,
    getBudgetSnapshot: async () => sinGasto(),
    findApproval: async () => null,
    consumeApproval: async () => true,
    findPreviousCall: async () => null,
    policyVersion: 'v0',
    now: () => AHORA,
    ...over,
  };
}

function sinGasto() {
  return {
    globalSpentMicros: 0,
    globalLimitMicros: 10_000_000,
    agentSpentMicros: 0,
    agentLimitMicros: 2_000_000,
    runSpentMicros: 0,
    runLimitMicros: 0,
    pricingUnknown: false,
  };
}

function deps(provider: FakeAgentModelProvider, over: Partial<AgentLoopDeps> = {}): {
  readonly deps: AgentLoopDeps;
  readonly eventos: AgentLoopEvent[];
} {
  const eventos: AgentLoopEvent[] = [];
  return {
    eventos,
    deps: {
      provider,
      tools: TOOLS,
      executor: executorDeps(),
      limits: { maxTurns: 5, maxToolCalls: 10, maxDurationSeconds: 300 },
      getBudgetSnapshot: async () => sinGasto(),
      onEvent: async (e) => {
        eventos.push(e);
      },
      now: () => AHORA,
      ...over,
    },
  };
}

beforeEach(() => {
  ejecuciones = [];
});

describe('ciclo básico', () => {
  it('un turno sin tools es la respuesta final', async () => {
    const provider = new FakeAgentModelProvider([{ text: 'Todo en orden.' }]);
    const { deps: d } = deps(provider);
    const res = await runAgentLoop(d, { systemPrompt: 'Eres Zack.', userMessage: '¿Estado?', ctx: ctx() });

    expect(res).toEqual({ status: 'completed', finalText: 'Todo en orden.', turns: 1 });
    expect(provider.callCount).toBe(1);
  });

  it('ejecuta la tool pedida y vuelve al modelo con el resultado', async () => {
    const provider = new FakeAgentModelProvider([
      { text: '', toolCalls: [{ id: 'c1', toolName: 'leerAlgo', input: {} }] },
      { text: 'El dato es valor.' },
    ]);
    const { deps: d, eventos } = deps(provider);
    const res = await runAgentLoop(d, { systemPrompt: 'Eres Zack.', userMessage: 'Lee', ctx: ctx() });

    expect(res.status).toBe('completed');
    expect(ejecuciones).toEqual(['leerAlgo']);

    // El resultado vuelve al modelo como mensaje de tool, no como texto.
    const segunda = provider.requests[1];
    const ultimo = segunda?.messages[segunda.messages.length - 1];
    expect(ultimo?.role).toBe('tool');

    expect(eventos.filter((e) => e.kind === 'tool_result')).toHaveLength(1);
  });

  it('las tools del agente se le describen en el prompt', async () => {
    const provider = new FakeAgentModelProvider([{ text: 'ok' }]);
    const { deps: d } = deps(provider);
    await runAgentLoop(d, { systemPrompt: 'Eres Zack.', userMessage: 'Hola', ctx: ctx() });

    expect(provider.requests[0]?.systemPrompt).toContain('leerAlgo');
    expect(provider.requests[0]?.systemPrompt).toContain('HERRAMIENTAS DISPONIBLES');
  });
});

describe('límites anti-loop', () => {
  it('para al agotar los turnos aunque el modelo siga pidiendo tools', async () => {
    // Un modelo atascado pidiendo lo mismo no para solo.
    const provider = new FakeAgentModelProvider(
      Array.from({ length: 10 }, () => ({ toolCalls: [{ id: 'c', toolName: 'leerAlgo', input: {} }] })),
    );
    const { deps: d } = deps(provider, { limits: { maxTurns: 3, maxToolCalls: 100, maxDurationSeconds: 300 } });
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    expect(res).toMatchObject({ status: 'stopped', reason: 'max_turns_reached' });
    expect(provider.callCount).toBe(3);
  });

  it('para al agotar las llamadas a tools', async () => {
    const provider = new FakeAgentModelProvider(
      Array.from({ length: 10 }, () => ({ toolCalls: [{ id: 'c', toolName: 'leerAlgo', input: {} }] })),
    );
    const { deps: d } = deps(provider, { limits: { maxTurns: 50, maxToolCalls: 2, maxDurationSeconds: 300 } });
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    expect(res).toMatchObject({ status: 'stopped', reason: 'max_tool_calls_reached' });
    expect(ejecuciones.length).toBeLessThanOrEqual(2);
  });

  it('para al agotar la duración', async () => {
    const provider = new FakeAgentModelProvider(
      Array.from({ length: 10 }, () => ({ toolCalls: [{ id: 'c', toolName: 'leerAlgo', input: {} }] })),
    );
    let t = AHORA.getTime();
    const { deps: d } = deps(provider, {
      limits: { maxTurns: 50, maxToolCalls: 50, maxDurationSeconds: 10 },
      now: () => new Date((t += 6_000)),
    });
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });
    expect(res).toMatchObject({ status: 'stopped', reason: 'max_duration_exceeded' });
  });
});

describe('presupuesto y cancelación', () => {
  it('con el presupuesto agotado no llega a llamar al modelo', async () => {
    const provider = new FakeAgentModelProvider([{ text: 'no debería verse' }]);
    const { deps: d } = deps(provider, {
      getBudgetSnapshot: async () => ({ ...sinGasto(), globalSpentMicros: 10_000_000 }),
    });
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    expect(res).toMatchObject({ status: 'stopped', reason: 'global_budget_exceeded' });
    expect(provider.callCount).toBe(0);
  });

  it('una ejecución cancelada para en el siguiente punto seguro', async () => {
    const provider = new FakeAgentModelProvider([{ text: 'no debería verse' }]);
    const { deps: d } = deps(provider, {
      executor: executorDeps({ isRunActive: async () => false }),
    });
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    expect(res).toMatchObject({ status: 'stopped', reason: 'run_cancelled' });
    expect(provider.callCount).toBe(0);
  });
});

describe('aprobación y modos', () => {
  it('una acción externa congela la ejecución entera', async () => {
    const provider = new FakeAgentModelProvider([
      {
        toolCalls: [
          { id: 'c1', toolName: 'enviarEmail', input: { to: 'a@ejemplo.test' } },
          { id: 'c2', toolName: 'leerAlgo', input: {} },
        ],
      },
      { text: 'no debería llegar aquí' },
    ]);
    const { deps: d } = deps(provider);
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    expect(res.status).toBe('waiting_approval');
    // No sigue con las demás llamadas del turno: el modelo debe volver a
    // razonar cuando sepa si le dijeron que sí.
    expect(ejecuciones).toEqual([]);
    expect(provider.callCount).toBe(1);
  });

  it('un resultado indeterminado detiene la ejecución', async () => {
    // Seguir significaría que el modelo razona sobre un estado del mundo que
    // nadie conoce, y el siguiente paso podría duplicar lo que sí ocurrió.
    const provider = new FakeAgentModelProvider([
      { toolCalls: [{ id: 'c1', toolName: 'enviarEmail', input: { to: 'a@ejemplo.test' } }] },
      { text: 'no debería llegar aquí' },
    ]);
    const { deps: d } = deps(provider, {
      executor: executorDeps({
        findApproval: async (hash) => ({
          id: 7,
          status: 'approved',
          actionHash: hash,
          actionClass: 'external_side_effect',
          expiresAt: new Date(AHORA.getTime() + 60_000),
          consumedAt: null,
        }),
        findPreviousCall: async () => ({ status: 'executing', resultJson: null }),
      }),
    });
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    expect(res).toMatchObject({ status: 'stopped', reason: 'tool_outcome_unknown' });
    expect(ejecuciones).toEqual([]);
    expect(provider.callCount).toBe(1);
  });

  it('en shadow, la acción se simula y el bucle continúa', async () => {
    const provider = new FakeAgentModelProvider([
      { toolCalls: [{ id: 'c1', toolName: 'enviarEmail', input: { to: 'a@ejemplo.test' } }] },
      { text: 'Habría enviado el email.' },
    ]);
    const { deps: d } = deps(provider);
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx({ agentMode: 'shadow' }) });

    expect(res.status).toBe('completed');
    expect(ejecuciones).toEqual([]);
  });
});

describe('robustez frente al proveedor', () => {
  it('una tool inventada por el modelo no rompe el bucle', async () => {
    const provider = new FakeAgentModelProvider([
      { toolCalls: [{ id: 'c1', toolName: 'borrarTodo', input: {} }] },
      { text: 'No pude hacerlo.' },
    ]);
    const { deps: d, eventos } = deps(provider);
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    expect(res.status).toBe('completed');
    expect(ejecuciones).toEqual([]);

    const bloqueada = eventos.find((e) => e.kind === 'tool_result');
    expect(bloqueada?.kind === 'tool_result' && bloqueada.result.status).toBe('blocked');
  });

  it('al modelo se le dice que no puede, sin explicarle qué control lo paró', async () => {
    const provider = new FakeAgentModelProvider([
      { toolCalls: [{ id: 'c1', toolName: 'borrarTodo', input: {} }] },
      { text: 'ok' },
    ]);
    const { deps: d } = deps(provider);
    await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    const segunda = provider.requests[1];
    const mensajeTool = segunda?.messages.find((m) => m.role === 'tool');
    const contenido = JSON.stringify(mensajeTool);
    expect(contenido).toContain('No tienes permiso');
    expect(contenido).not.toContain('unknown_tool');
    expect(contenido).not.toContain('allowlist');
  });

  it('un error del proveedor termina la ejecución con código estable', async () => {
    const provider = new FakeAgentModelProvider([]);
    const { deps: d } = deps(provider);
    const res = await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    expect(res).toMatchObject({ status: 'failed', code: 'provider_error', retryable: false });
  });

  it('registra el consumo de cada turno', async () => {
    const provider = new FakeAgentModelProvider([
      { text: 'ok', usage: { inputTokens: 1_000, outputTokens: 500, cachedInputTokens: null }, model: 'gemini-2.0-flash' },
    ]);
    const { deps: d, eventos } = deps(provider);
    await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    const uso = eventos.find((e) => e.kind === 'usage');
    expect(uso?.kind === 'usage' && uso.inputTokens).toBe(1_000);
    expect(uso?.kind === 'usage' && uso.pricingUnknown).toBe(false);
  });

  it('con un modelo sin tarifa conocida marca el coste como desconocido', async () => {
    const provider = new FakeAgentModelProvider([
      { text: 'ok', usage: { inputTokens: 100, outputTokens: 50, cachedInputTokens: null }, model: 'modelo-raro' },
    ]);
    const { deps: d, eventos } = deps(provider);
    await runAgentLoop(d, { systemPrompt: 'x', userMessage: 'y', ctx: ctx() });

    const uso = eventos.find((e) => e.kind === 'usage');
    expect(uso?.kind === 'usage' && uso.pricingUnknown).toBe(true);
    expect(uso?.kind === 'usage' && uso.estimatedCostMicros).toBe(0);
  });
});
