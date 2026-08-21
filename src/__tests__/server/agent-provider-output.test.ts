/**
 * Salida del proveedor y declaración de funciones.
 *
 * Lo que devuelve un modelo es dato hostil: puede traer un `toolName` que no es
 * una cadena, `input` nulo o cien llamadas en un turno. Nada de eso debe llegar
 * al executor con esa forma.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { z } from 'zod';

import { eraseAgentTool } from '@/lib/agents/erase-tool';
import { MAX_TOOL_CALLS_POR_TURNO, normalizeProviderTurn } from '@/lib/agents/model-provider';
import { NullAgentModelProvider } from '@/lib/agents/providers/null-provider';
import { toolToFunctionDeclaration } from '@/lib/agents/providers/gemini-provider';

describe('normalizeProviderTurn', () => {
  it('normaliza un turno correcto', () => {
    const turno = normalizeProviderTurn({
      text: 'hola',
      toolCalls: [{ name: 'leerAlgo', args: { q: 1 }, id: 'c1' }],
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });
    expect(turno.text).toBe('hola');
    expect(turno.toolCalls).toEqual([{ id: 'c1', toolName: 'leerAlgo', input: { q: 1 } }]);
    expect(turno.finishReason).toBe('tool_calls');
  });

  it('un texto que no es cadena se vuelve cadena vacía', () => {
    expect(normalizeProviderTurn({ text: 42, provider: 'x' }).text).toBe('');
    expect(normalizeProviderTurn({ text: null, provider: 'x' }).text).toBe('');
  });

  it('descarta llamadas sin nombre válido', () => {
    const turno = normalizeProviderTurn({
      toolCalls: [{ name: 123 }, { args: {} }, null, 'texto', { name: 'valida' }],
      provider: 'x',
    });
    expect(turno.toolCalls).toHaveLength(1);
    expect(turno.toolCalls[0]?.toolName).toBe('valida');
  });

  it('un toolCalls que no es array se ignora entero', () => {
    expect(normalizeProviderTurn({ toolCalls: 'borrarTodo', provider: 'x' }).toolCalls).toEqual([]);
  });

  it('acota el número de llamadas por turno', () => {
    const muchas = Array.from({ length: 100 }, (_, i) => ({ name: `t${i}` }));
    const turno = normalizeProviderTurn({ toolCalls: muchas, provider: 'x' });
    expect(turno.toolCalls).toHaveLength(MAX_TOOL_CALLS_POR_TURNO);
  });

  it('un id que no es cadena se vuelve null en vez de colarse', () => {
    const turno = normalizeProviderTurn({ toolCalls: [{ name: 'x', id: { raro: true } }], provider: 'p' });
    expect(turno.toolCalls[0]?.id).toBeNull();
  });

  it('sin llamadas, el turno termina', () => {
    expect(normalizeProviderTurn({ text: 'fin', provider: 'x' }).finishReason).toBe('stop');
  });

  it('sin usage no inventa consumo', () => {
    expect(normalizeProviderTurn({ text: 'x', provider: 'p' }).usage).toBeNull();
  });
});

describe('NullAgentModelProvider', () => {
  it('falla en cerrado y sin pedir ninguna tool', async () => {
    // Un fallback que improvisara llamadas sería peor que no tener modelo.
    const res = await new NullAgentModelProvider().generate({
      systemPrompt: 'x',
      messages: [],
      tools: [],
      maxOutputTokens: 100,
      signal: new AbortController().signal,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('provider_unavailable');
      expect(res.error.retryable).toBe(false);
    }
  });
});

describe('toolToFunctionDeclaration', () => {
  const tool = eraseAgentTool<{ topic?: string | undefined }, { texto: string }>({
    name: 'buscarTema',
    version: '1',
    description: 'Busca por tema.',
    inputSchema: z.object({ topic: z.string().max(60).optional() }).strict(),
    requiredPermission: null,
    actionClass: 'read',
    approvalPolicy: 'never',
    maxExecutionMs: 1_000,
    redactInput: (i) => ({ topic: i.topic ?? null }),
    redactOutput: (o) => ({ ...o }),
    buildIdempotencyKey: null,
    execute: async () => ({ texto: 'x' }),
  });

  it('traduce el schema Zod a parámetros de función', () => {
    const decl = toolToFunctionDeclaration(tool);
    expect(decl.name).toBe('buscarTema');
    const props = decl.parameters.properties as Record<string, unknown>;
    expect(props).toHaveProperty('topic');
  });

  it('poda las claves que el proveedor no acepta', () => {
    const decl = toolToFunctionDeclaration(tool);
    const serializado = JSON.stringify(decl.parameters);
    expect(serializado).not.toContain('$schema');
    expect(serializado).not.toContain('additionalProperties');
  });

  it('anota la clase de acción para que el modelo sepa qué pedirá firma', () => {
    expect(toolToFunctionDeclaration(tool).description).toContain('clase: read');
  });
});
