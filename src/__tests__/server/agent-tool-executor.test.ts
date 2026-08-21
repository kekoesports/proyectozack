/**
 * El executor de tools: el punto por el que pasa todo.
 *
 * Lo que se prueba aquí es que ninguna de las diez comprobaciones se puede
 * saltar, y en particular el caso que da sentido al PR entero: **aunque el
 * modelo pida una tool desconocida o prohibida, no se ejecuta**.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { z } from 'zod';

import { eraseAgentTool } from '@/lib/agents/erase-tool';
import { AgentToolRegistry } from '@/lib/agents/tool-registry';
import { executeAgentToolCall, type ToolExecutorDeps } from '@/lib/agents/tool-executor';
import type { AgentToolContext, AgentToolDefinition, ErasedAgentTool } from '@/lib/agents/types';

const AHORA = new Date('2026-08-21T10:00:00.000Z');
const HASH_LARGO = 'a'.repeat(64);

/** Cuenta cuántas veces se ejecutó de verdad cada tool. */
let ejecuciones: string[] = [];

function toolLectura(over: Partial<AgentToolDefinition<{ q?: string | undefined }, { dato: string }>> = {}): ErasedAgentTool {
  return eraseAgentTool<{ q?: string | undefined }, { dato: string }>({
    name: 'leerAlgo',
    version: '1',
    description: 'Lee algo inofensivo.',
    inputSchema: z.object({ q: z.string().max(20).optional() }).strict(),
    requiredPermission: null,
    actionClass: 'read',
    approvalPolicy: 'never',
    maxExecutionMs: 1_000,
    redactInput: (i) => ({ q: i.q ?? null }),
    redactOutput: (o) => ({ ...o }),
    buildIdempotencyKey: null,
    execute: async () => {
      ejecuciones.push('leerAlgo');
      return { dato: 'valor' };
    },
    ...over,
  });
}

function toolEnvio(): ErasedAgentTool {
  return eraseAgentTool<{ to: string }, { enviado: boolean }>({
    name: 'enviarEmail',
    version: '1',
    description: 'Envía un email de verdad.',
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
}

function contexto(over: Partial<AgentToolContext> = {}): AgentToolContext {
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

function deps(tools: readonly ErasedAgentTool[], over: Partial<ToolExecutorDeps> = {}): ToolExecutorDeps {
  return {
    registry: new AgentToolRegistry(tools, { 'crm-steward': tools.map((t) => t.name) }),
    agentsEnabled: true,
    agentStatus: 'active',
    isRunActive: async () => true,
    getBudgetSnapshot: async () => ({
      globalSpentMicros: 0,
      globalLimitMicros: 10_000_000,
      agentSpentMicros: 0,
      agentLimitMicros: 2_000_000,
      runSpentMicros: 0,
      runLimitMicros: 0,
      pricingUnknown: false,
    }),
    findApproval: async () => null,
    consumeApproval: async () => true,
    findPreviousCall: async () => null,
    policyVersion: 'v0',
    now: () => AHORA,
    ...over,
  };
}

beforeEach(() => {
  ejecuciones = [];
});

describe('tools desconocidas y no permitidas', () => {
  it('una tool que no existe no se ejecuta', async () => {
    const res = await executeAgentToolCall(deps([toolLectura()]), contexto(), {
      toolName: 'borrarTodo',
      rawInput: {},
    });
    expect(res).toMatchObject({ status: 'blocked', code: 'unknown_tool' });
    expect(ejecuciones).toEqual([]);
  });

  it('una tool registrada pero fuera de la allowlist del agente tampoco', async () => {
    const tools = [toolLectura()];
    const d = deps(tools, {
      registry: new AgentToolRegistry(tools, { 'crm-steward': [], guardian: ['leerAlgo'] }),
    });
    const res = await executeAgentToolCall(d, contexto(), { toolName: 'leerAlgo', rawInput: {} });
    expect(res).toMatchObject({ status: 'blocked', code: 'tool_not_allowed_for_agent' });
    expect(ejecuciones).toEqual([]);
  });

  it('un agente sin allowlist no alcanza nada: fail-closed', async () => {
    const tools = [toolLectura()];
    const d = deps(tools, { registry: new AgentToolRegistry(tools, {}) });
    const res = await executeAgentToolCall(d, contexto({ agentSlug: 'inventado' }), {
      toolName: 'leerAlgo',
      rawInput: {},
    });
    expect(res).toMatchObject({ status: 'blocked', code: 'tool_not_allowed_for_agent' });
  });
});

describe('estado de la ejecución', () => {
  it('una ejecución cancelada o sin lease no ejecuta nada', async () => {
    const res = await executeAgentToolCall(
      deps([toolLectura()], { isRunActive: async () => false }),
      contexto(),
      { toolName: 'leerAlgo', rawInput: {} },
    );
    expect(res).toMatchObject({ status: 'blocked', code: 'run_not_active' });
    expect(ejecuciones).toEqual([]);
  });

  it('se comprueba antes que el input: no se valida lo que no se va a ejecutar', async () => {
    const res = await executeAgentToolCall(
      deps([toolLectura()], { isRunActive: async () => false }),
      contexto(),
      { toolName: 'leerAlgo', rawInput: { q: 'x'.repeat(500) } },
    );
    expect(res).toMatchObject({ code: 'run_not_active' });
  });
});

describe('validación del input', () => {
  it('rechaza argumentos que no encajan en el schema', async () => {
    const res = await executeAgentToolCall(deps([toolLectura()]), contexto(), {
      toolName: 'leerAlgo',
      rawInput: { q: 123 },
    });
    expect(res).toMatchObject({ status: 'blocked', code: 'invalid_tool_input' });
    expect(ejecuciones).toEqual([]);
  });

  it('rechaza argumentos de más: el modelo entendió otra cosa', async () => {
    const res = await executeAgentToolCall(deps([toolLectura()]), contexto(), {
      toolName: 'leerAlgo',
      rawInput: { q: 'ok', extra: 'sobra' },
    });
    expect(res).toMatchObject({ status: 'blocked', code: 'invalid_tool_input' });
  });

  it('acepta un input válido y ejecuta', async () => {
    const res = await executeAgentToolCall(deps([toolLectura()]), contexto(), {
      toolName: 'leerAlgo',
      rawInput: { q: 'hola' },
    });
    expect(res).toMatchObject({ status: 'succeeded' });
    expect(ejecuciones).toEqual(['leerAlgo']);
  });
});

describe('política', () => {
  it('el kill switch global impide ejecutar aunque todo lo demás esté bien', async () => {
    const res = await executeAgentToolCall(
      deps([toolLectura()], { agentsEnabled: false }),
      contexto(),
      { toolName: 'leerAlgo', rawInput: {} },
    );
    expect(res).toMatchObject({ status: 'blocked', code: 'policy_denied' });
    expect(ejecuciones).toEqual([]);
  });

  it('en shadow, una acción con efecto se simula y NO se ejecuta', async () => {
    const res = await executeAgentToolCall(
      deps([toolEnvio()]),
      contexto({ agentMode: 'shadow' }),
      { toolName: 'enviarEmail', rawInput: { to: 'a@ejemplo.test' } },
    );
    expect(res.status).toBe('simulated');
    expect(ejecuciones).toEqual([]);
  });

  it('un rol sin permiso no ejecuta la tool', async () => {
    const tool = toolLectura({ requiredPermission: { module: 'facturacion', action: 'read' } });
    const res = await executeAgentToolCall(deps([tool]), contexto({ actorRole: 'staff' }), {
      toolName: 'leerAlgo',
      rawInput: {},
    });
    expect(res).toMatchObject({ status: 'blocked', code: 'policy_denied' });
    expect(ejecuciones).toEqual([]);
  });
});

describe('presupuesto', () => {
  it('con el presupuesto agotado no se ejecuta', async () => {
    const res = await executeAgentToolCall(
      deps([toolLectura()], {
        getBudgetSnapshot: async () => ({
          globalSpentMicros: 10_000_000,
          globalLimitMicros: 10_000_000,
          agentSpentMicros: 0,
          agentLimitMicros: 0,
          runSpentMicros: 0,
          runLimitMicros: 0,
          pricingUnknown: false,
        }),
      }),
      contexto(),
      { toolName: 'leerAlgo', rawInput: {} },
    );
    expect(res).toMatchObject({ status: 'blocked', code: 'budget_blocked' });
    expect(ejecuciones).toEqual([]);
  });

  it('simular no consume presupuesto: shadow funciona con el saldo a cero', async () => {
    const res = await executeAgentToolCall(
      deps([toolEnvio()], {
        getBudgetSnapshot: async () => {
          throw new Error('no debería consultarse');
        },
      }),
      contexto({ agentMode: 'shadow' }),
      { toolName: 'enviarEmail', rawInput: { to: 'a@ejemplo.test' } },
    );
    expect(res.status).toBe('simulated');
  });
});

describe('aprobaciones', () => {
  it('sin aprobación, la acción externa se congela y no se ejecuta', async () => {
    const res = await executeAgentToolCall(deps([toolEnvio()]), contexto(), {
      toolName: 'enviarEmail',
      rawInput: { to: 'a@ejemplo.test' },
    });
    expect(res.status).toBe('waiting_approval');
    expect(ejecuciones).toEqual([]);
  });

  it('con una aprobación válida para ESE hash, se ejecuta y se consume', async () => {
    const consumidas: number[] = [];
    let hashPedido = '';

    // Primera pasada para conocer el hash exacto que hay que aprobar.
    const primera = await executeAgentToolCall(deps([toolEnvio()]), contexto(), {
      toolName: 'enviarEmail',
      rawInput: { to: 'a@ejemplo.test' },
    });
    if (primera.status === 'waiting_approval') hashPedido = primera.actionHash;
    expect(hashPedido).toHaveLength(64);

    const res = await executeAgentToolCall(
      deps([toolEnvio()], {
        findApproval: async (hash) => ({
          id: 7,
          status: 'approved',
          actionHash: hash,
          actionClass: 'external_side_effect',
          expiresAt: new Date(AHORA.getTime() + 60_000),
          consumedAt: null,
        }),
        consumeApproval: async (id) => {
          consumidas.push(id);
          return true;
        },
      }),
      contexto(),
      { toolName: 'enviarEmail', rawInput: { to: 'a@ejemplo.test' } },
    );

    expect(res.status).toBe('succeeded');
    expect(ejecuciones).toEqual(['enviarEmail']);
    expect(consumidas).toEqual([7]);
  });

  it('una aprobación de OTRA acción no sirve', async () => {
    const res = await executeAgentToolCall(
      deps([toolEnvio()], {
        findApproval: async () => ({
          id: 7,
          status: 'approved',
          actionHash: HASH_LARGO,
          actionClass: 'external_side_effect',
          expiresAt: new Date(AHORA.getTime() + 60_000),
          consumedAt: null,
        }),
      }),
      contexto(),
      { toolName: 'enviarEmail', rawInput: { to: 'a@ejemplo.test' } },
    );
    expect(res.status).toBe('waiting_approval');
    expect(ejecuciones).toEqual([]);
  });

  it('una aprobación caducada no revive', async () => {
    const res = await executeAgentToolCall(
      deps([toolEnvio()], {
        findApproval: async (hash) => ({
          id: 7,
          status: 'approved',
          actionHash: hash,
          actionClass: 'external_side_effect',
          expiresAt: new Date(AHORA.getTime() - 1_000),
          consumedAt: null,
        }),
      }),
      contexto(),
      { toolName: 'enviarEmail', rawInput: { to: 'a@ejemplo.test' } },
    );
    expect(res.status).toBe('waiting_approval');
    expect(ejecuciones).toEqual([]);
  });

  it('si otro proceso consumió la aprobación primero, no se ejecuta', async () => {
    const res = await executeAgentToolCall(
      deps([toolEnvio()], {
        findApproval: async (hash) => ({
          id: 7,
          status: 'approved',
          actionHash: hash,
          actionClass: 'external_side_effect',
          expiresAt: new Date(AHORA.getTime() + 60_000),
          consumedAt: null,
        }),
        consumeApproval: async () => false,
      }),
      contexto(),
      { toolName: 'enviarEmail', rawInput: { to: 'a@ejemplo.test' } },
    );
    expect(res).toMatchObject({ status: 'blocked', code: 'approval_consumed_elsewhere' });
    expect(ejecuciones).toEqual([]);
  });
});

describe('idempotencia', () => {
  it('una llamada previa con la misma clave devuelve su resultado sin repetir el efecto', async () => {
    const res = await executeAgentToolCall(
      deps([toolEnvio()], {
        findApproval: async (hash) => ({
          id: 7,
          status: 'approved',
          actionHash: hash,
          actionClass: 'external_side_effect',
          expiresAt: new Date(AHORA.getTime() + 60_000),
          consumedAt: null,
        }),
        findPreviousCall: async () => ({ status: 'succeeded', resultJson: { enviado: true } }),
      }),
      contexto(),
      { toolName: 'enviarEmail', rawInput: { to: 'a@ejemplo.test' } },
    );

    expect(res).toMatchObject({ status: 'succeeded', output: { enviado: true } });
    // El punto entero: el email NO se envía dos veces.
    expect(ejecuciones).toEqual([]);
  });

  it('una llamada previa en vuelo NO se repite: podría haber ocurrido', async () => {
    // Es lo que deja un worker que murió a mitad de la escritura. Repetirla es
    // peor que no hacerla: no hay forma de des-enviar un email.
    const res = await executeAgentToolCall(
      deps([toolEnvio()], {
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
      contexto(),
      { toolName: 'enviarEmail', rawInput: { to: 'a@ejemplo.test' } },
    );

    expect(res).toMatchObject({ status: 'indeterminate', code: 'tool_call_in_flight' });
    expect(ejecuciones).toEqual([]);
  });

  it('una llamada previa fallida no bloquea el reintento', async () => {
    const res = await executeAgentToolCall(
      deps([toolEnvio()], {
        findApproval: async (hash) => ({
          id: 7,
          status: 'approved',
          actionHash: hash,
          actionClass: 'external_side_effect',
          expiresAt: new Date(AHORA.getTime() + 60_000),
          consumedAt: null,
        }),
        findPreviousCall: async () => ({ status: 'failed', resultJson: null }),
      }),
      contexto(),
      { toolName: 'enviarEmail', rawInput: { to: 'a@ejemplo.test' } },
    );
    expect(res.status).toBe('succeeded');
    expect(ejecuciones).toEqual(['enviarEmail']);
  });
});

describe('timeout y fallos', () => {
  it('una tool que se cuelga se corta y se reporta como timeout', async () => {
    const lenta = eraseAgentTool<Record<string, never>, { ok: boolean }>({
      name: 'lenta',
      version: '1',
      description: 'Tarda demasiado.',
      inputSchema: z.object({}).strict(),
      requiredPermission: null,
      actionClass: 'read',
      approvalPolicy: 'never',
      maxExecutionMs: 20,
      redactInput: () => ({}),
      redactOutput: (o) => ({ ...o }),
      buildIdempotencyKey: null,
      execute: async () => {
        await new Promise((r) => setTimeout(r, 200));
        ejecuciones.push('lenta');
        return { ok: true };
      },
    });

    let ahora = AHORA.getTime();
    const res = await executeAgentToolCall(
      deps([lenta], { now: () => new Date((ahora += 10)) }),
      contexto(),
      { toolName: 'lenta', rawInput: {} },
    );
    expect(res).toMatchObject({ status: 'failed', code: 'tool_timeout' });
  });

  it('una tool que ESCRIBE y expira queda indeterminada, no fallida', async () => {
    // El `race` devuelve el control, pero la escritura sigue viva y puede
    // completarse. Marcarla `failed` la haría reintentable, y el reintento
    // duplicaría un envío que quizá ya salió.
    const lenta = eraseAgentTool<{ to: string }, { enviado: boolean }>({
      name: 'enviarLento',
      version: '1',
      description: 'Envía, despacio.',
      inputSchema: z.object({ to: z.string().email() }).strict(),
      requiredPermission: null,
      actionClass: 'external_side_effect',
      approvalPolicy: 'always',
      maxExecutionMs: 20,
      redactInput: (i) => ({ to: i.to }),
      redactOutput: (o) => ({ ...o }),
      buildIdempotencyKey: (ctx, i) => `envio:${ctx.runId}:${i.to}`,
      execute: async () => {
        await new Promise((r) => setTimeout(r, 200));
        ejecuciones.push('enviarLento');
        return { enviado: true };
      },
    });

    let ahora = AHORA.getTime();
    const res = await executeAgentToolCall(
      deps([lenta], {
        now: () => new Date((ahora += 10)),
        findApproval: async (hash) => ({
          id: 7,
          status: 'approved',
          actionHash: hash,
          actionClass: 'external_side_effect',
          expiresAt: new Date(AHORA.getTime() + 600_000),
          consumedAt: null,
        }),
      }),
      contexto(),
      { toolName: 'enviarLento', rawInput: { to: 'a@ejemplo.test' } },
    );

    expect(res).toMatchObject({ status: 'indeterminate', code: 'tool_timeout_indeterminate' });
  });

  it('una tool de LECTURA que expira sí es un fallo reintentable', async () => {
    const lenta = eraseAgentTool<Record<string, never>, { ok: boolean }>({
      name: 'leerLento',
      version: '1',
      description: 'Lee, despacio.',
      inputSchema: z.object({}).strict(),
      requiredPermission: null,
      actionClass: 'read',
      approvalPolicy: 'never',
      maxExecutionMs: 20,
      redactInput: () => ({}),
      redactOutput: (o) => ({ ...o }),
      // Sin clave: repetir una lectura no tiene consecuencias.
      buildIdempotencyKey: null,
      execute: async () => {
        await new Promise((r) => setTimeout(r, 200));
        return { ok: true };
      },
    });

    let ahora = AHORA.getTime();
    const res = await executeAgentToolCall(
      deps([lenta], { now: () => new Date((ahora += 10)) }),
      contexto(),
      { toolName: 'leerLento', rawInput: {} },
    );
    expect(res).toMatchObject({ status: 'failed', code: 'tool_timeout' });
  });

  it('un error de la tool se devuelve redactado, no se propaga', async () => {
    const rota = eraseAgentTool<Record<string, never>, never>({
      name: 'rota',
      version: '1',
      description: 'Siempre falla.',
      inputSchema: z.object({}).strict(),
      requiredPermission: null,
      actionClass: 'read',
      approvalPolicy: 'never',
      maxExecutionMs: 1_000,
      redactInput: () => ({}),
      redactOutput: () => ({}),
      buildIdempotencyKey: null,
      execute: async () => {
        throw new Error('fallo con IBAN ES9121000418450200051332 dentro');
      },
    });

    const res = await executeAgentToolCall(deps([rota]), contexto(), { toolName: 'rota', rawInput: {} });
    expect(res.status).toBe('failed');
    if (res.status === 'failed') {
      expect(res.code).toBe('tool_failed');
      // El IBAN del mensaje de error no puede acabar en la timeline.
      expect(res.message).not.toContain('ES9121000418450200051332');
    }
  });
});
