/**
 * Recuperación tras un crash, y la garantía que la sostiene.
 *
 * El escenario que importa: el worker muere **después** de que una tool haya
 * escrito pero **antes** de anotar el resultado. Al reanudar, la acción no debe
 * repetirse.
 *
 * Se prueba con una tabla `agent_tool_calls` en memoria que reproduce la
 * semántica de las dos operaciones que intervienen —`beginToolCall` escribe la
 * fila antes de ejecutar, `findPreviousCall` la lee después—. No es Postgres,
 * así que no prueba el UNIQUE ni la concurrencia real; prueba que el runtime
 * usa esas operaciones en el orden que hace la garantía posible, que es
 * exactamente donde estuvo el bug que este PR arregla.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { z } from 'zod';

import { eraseAgentTool } from '@/lib/agents/erase-tool';
import { AgentToolRegistry } from '@/lib/agents/tool-registry';
import { executeAgentToolCall, type ToolExecutorDeps } from '@/lib/agents/tool-executor';
import type { AgentToolContext, ErasedAgentTool } from '@/lib/agents/types';

const AHORA = new Date('2026-08-21T10:00:00.000Z');

/** Efectos externos realmente producidos. Es lo que no debe duplicarse. */
let enviados: string[] = [];

type FilaLlamada = {
  id: number;
  status: string;
  idempotencyKey: string | null;
  resultJson: Record<string, unknown> | null;
};

/** Tabla `agent_tool_calls` en memoria, con las dos operaciones que importan. */
function crearTabla() {
  const filas: FilaLlamada[] = [];
  let secuencia = 0;

  return {
    filas,
    begin(idempotencyKey: string | null): number {
      secuencia += 1;
      filas.push({ id: secuencia, status: 'executing', idempotencyKey, resultJson: null });
      return secuencia;
    },
    settle(id: number, status: string, resultJson: Record<string, unknown> | null): void {
      const fila = filas.find((f) => f.id === id);
      if (fila) {
        fila.status = status;
        fila.resultJson = resultJson;
      }
    },
    find(idempotencyKey: string): { status: string; resultJson: Record<string, unknown> | null } | null {
      const fila = filas.find((f) => f.idempotencyKey === idempotencyKey);
      return fila ? { status: fila.status, resultJson: fila.resultJson } : null;
    },
  };
}

const toolEnvio: ErasedAgentTool = eraseAgentTool<{ to: string }, { enviado: boolean }>({
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
  // La clave no depende del intento: es lo que hace que el reintento la
  // reconozca como la misma acción.
  buildIdempotencyKey: (ctx, i) => `email:${ctx.runId}:${i.to}`,
  execute: async (_ctx, i) => {
    enviados.push(i.to);
    return { enviado: true };
  },
});

const ctx: AgentToolContext = {
  runId: 42,
  agentId: 1,
  agentSlug: 'growth',
  agentMode: 'execute',
  actorRole: 'admin',
  actorUserId: 'u1',
  correlationId: 'c-1',
  signal: new AbortController().signal,
};

function deps(tabla: ReturnType<typeof crearTabla>, over: Partial<ToolExecutorDeps> = {}): ToolExecutorDeps {
  return {
    registry: new AgentToolRegistry([toolEnvio], { growth: ['enviarEmail'] }),
    agentsEnabled: true,
    agentStatus: 'active',
    isRunActive: async () => true,
    getBudgetSnapshot: async () => ({
      globalSpentMicros: 0,
      globalLimitMicros: 10_000_000,
      agentSpentMicros: 0,
      agentLimitMicros: 0,
      runSpentMicros: 0,
      runLimitMicros: 0,
      pricingUnknown: false,
    }),
    findApproval: async (hash) => ({
      id: 7,
      status: 'approved',
      actionHash: hash,
      actionClass: 'external_side_effect',
      expiresAt: new Date(AHORA.getTime() + 600_000),
      consumedAt: null,
    }),
    consumeApproval: async () => true,
    findPreviousCall: async (key) => tabla.find(key),
    beginToolCall: async (info) => tabla.begin(info.idempotencyKey),
    settleToolCall: async (id, resultado) => {
      tabla.settle(
        id,
        resultado.status === 'succeeded' ? 'succeeded' : resultado.status === 'failed' ? 'failed' : 'executing',
        resultado.status === 'succeeded' ? resultado.output : null,
      );
    },
    policyVersion: 'v0',
    now: () => AHORA,
    ...over,
  };
}

const peticion = { toolName: 'enviarEmail', rawInput: { to: 'contacto@ejemplo.test' } };

beforeEach(() => {
  enviados = [];
});

describe('la fila se escribe antes de ejecutar', () => {
  it('existe con status executing en el momento de ejecutar la tool', async () => {
    const tabla = crearTabla();
    let estadoDurante: string | undefined;

    const toolQueMira = eraseAgentTool<{ to: string }, { enviado: boolean }>({
      ...({
        name: 'enviarEmail',
        version: '1',
        description: 'Envía un email de verdad.',
        inputSchema: z.object({ to: z.string().email() }).strict(),
        requiredPermission: null,
        actionClass: 'external_side_effect',
        approvalPolicy: 'always',
        maxExecutionMs: 1_000,
        redactInput: (i: { to: string }) => ({ to: i.to }),
        redactOutput: (o: { enviado: boolean }) => ({ ...o }),
        buildIdempotencyKey: (c: AgentToolContext, i: { to: string }) => `email:${c.runId}:${i.to}`,
      } as const),
      execute: async (_c, i) => {
        // Justo aquí, en mitad de la ejecución, la fila ya tiene que existir:
        // es lo único que impide que un crash ahora acabe en un envío doble.
        estadoDurante = tabla.filas[0]?.status;
        enviados.push(i.to);
        return { enviado: true };
      },
    });

    const registro = new AgentToolRegistry([toolQueMira], { growth: ['enviarEmail'] });
    await executeAgentToolCall(deps(tabla, { registry: registro }), ctx, peticion);

    expect(estadoDurante).toBe('executing');
    expect(enviados).toEqual(['contacto@ejemplo.test']);
  });
});

describe('crash antes de ejecutar la tool', () => {
  it('el reintento sí ejecuta: no llegó a pasar nada', async () => {
    const tabla = crearTabla();
    // Sin fila previa, porque el worker murió antes de escribirla.
    const res = await executeAgentToolCall(deps(tabla), ctx, peticion);
    expect(res.status).toBe('succeeded');
    expect(enviados).toEqual(['contacto@ejemplo.test']);
  });
});

describe('crash DESPUÉS de escribir y antes de anotar el resultado', () => {
  it('el reintento NO repite el envío', async () => {
    const tabla = crearTabla();

    // Primera pasada: la tool se ejecuta y el worker muere antes de cerrar la
    // fila, que se queda en `executing`.
    await executeAgentToolCall(
      deps(tabla, {
        settleToolCall: async () => {
          throw new Error('el worker murió aquí');
        },
      }),
      ctx,
      peticion,
    ).catch(() => undefined);

    expect(enviados).toEqual(['contacto@ejemplo.test']);
    expect(tabla.filas[0]?.status).toBe('executing');

    // Segunda pasada: otro worker recoge la ejecución y reintenta.
    const reintento = await executeAgentToolCall(deps(tabla), ctx, peticion);

    expect(reintento.status).toBe('indeterminate');
    if (reintento.status === 'indeterminate') expect(reintento.code).toBe('tool_call_in_flight');
    // El punto entero: un solo envío.
    expect(enviados).toEqual(['contacto@ejemplo.test']);
  });
});

describe('reintento tras un éxito ya anotado', () => {
  it('devuelve el resultado guardado sin volver a enviar', async () => {
    const tabla = crearTabla();

    const primera = await executeAgentToolCall(deps(tabla), ctx, peticion);
    expect(primera.status).toBe('succeeded');

    const segunda = await executeAgentToolCall(deps(tabla), ctx, peticion);
    expect(segunda).toMatchObject({ status: 'succeeded', output: { enviado: true } });
    expect(enviados).toEqual(['contacto@ejemplo.test']);
  });
});

describe('reintento tras un fallo anotado', () => {
  it('sí vuelve a ejecutar: un fallo explícito es lo único que lo autoriza', async () => {
    const tabla = crearTabla();
    tabla.begin('email:42:contacto@ejemplo.test');
    tabla.settle(1, 'failed', null);

    const res = await executeAgentToolCall(deps(tabla), ctx, peticion);
    expect(res.status).toBe('succeeded');
    expect(enviados).toEqual(['contacto@ejemplo.test']);
  });
});

describe('la clave de idempotencia distingue destinatarios', () => {
  it('dos envíos distintos no se confunden entre sí', async () => {
    const tabla = crearTabla();
    await executeAgentToolCall(deps(tabla), ctx, peticion);
    await executeAgentToolCall(deps(tabla), ctx, {
      toolName: 'enviarEmail',
      rawInput: { to: 'otro@ejemplo.test' },
    });
    expect(enviados).toEqual(['contacto@ejemplo.test', 'otro@ejemplo.test']);
  });
});
