jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { z } from 'zod';

import { eraseAgentTool } from '@/lib/agents/erase-tool';
import {
  appendXaiRequestMessages,
  toolToXaiFunction,
  XaiAgentModelProvider,
  type XaiFetch,
} from '@/lib/agents/providers/xai-provider';
import type { AgentModelRequest } from '@/lib/agents/model-provider';

function request(over: Partial<AgentModelRequest> = {}): AgentModelRequest {
  return {
    systemPrompt: 'Responde con datos verificados.',
    messages: [{ role: 'user', content: 'Estado del sistema' }],
    tools: [],
    maxOutputTokens: 500,
    signal: new AbortController().signal,
    ...over,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('XaiAgentModelProvider', () => {
  it('normaliza texto, modelo y consumo sin llamar a servicios reales', async () => {
    const fetchImpl: XaiFetch = async () => jsonResponse({
      id: 'resp-1',
      model: 'grok-4.3',
      choices: [{ message: { role: 'assistant', content: 'Todo correcto.' }, finish_reason: 'stop' }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 20,
        prompt_tokens_details: { cached_tokens: 40 },
      },
    });
    const provider = new XaiAgentModelProvider('test-key', 'grok-4.3', { fetchImpl });

    const result = await provider.generate(request());

    expect(result).toEqual({
      ok: true,
      turn: {
        text: 'Todo correcto.',
        toolCalls: [],
        usage: { inputTokens: 100, outputTokens: 20, cachedInputTokens: 40 },
        model: 'grok-4.3',
        provider: 'xai',
        finishReason: 'stop',
      },
    });
  });

  it('declara solo funciones locales y conserva el historial nativo de tool calls', async () => {
    const bodies: unknown[] = [];
    let call = 0;
    const fetchImpl: XaiFetch = async (_url, init) => {
      bodies.push(typeof init.body === 'string' ? JSON.parse(init.body) : null);
      call += 1;
      if (call === 1) {
        return jsonResponse({
          model: 'grok-4.3',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call-1',
                type: 'function',
                function: { name: 'health', arguments: '{"scope":"worker"}' },
              }],
            },
            finish_reason: 'tool_calls',
          }],
        });
      }
      return jsonResponse({
        model: 'grok-4.3',
        choices: [{ message: { role: 'assistant', content: 'Worker sano.' }, finish_reason: 'stop' }],
      });
    };
    const health = eraseAgentTool<{ scope: string }, { ok: boolean }>({
      name: 'health',
      version: '1',
      description: 'Lee la salud del worker.',
      inputSchema: z.object({ scope: z.string() }).strict(),
      requiredPermission: null,
      actionClass: 'read',
      approvalPolicy: 'never',
      maxExecutionMs: 1_000,
      redactInput: (input) => ({ scope: input.scope }),
      redactOutput: (output) => ({ ok: output.ok }),
      buildIdempotencyKey: null,
      execute: async () => ({ ok: true }),
    });
    const provider = new XaiAgentModelProvider('test-key', 'grok-4.3', { fetchImpl });

    const first = await provider.generate(request({ tools: [health] }));
    expect(first.ok && first.turn.toolCalls).toEqual([
      { id: 'call-1', toolName: 'health', input: { scope: 'worker' } },
    ]);

    const second = await provider.generate(request({
      tools: [health],
      messages: [
        { role: 'user', content: 'Estado del sistema' },
        { role: 'assistant', content: '' },
        { role: 'tool', toolName: 'health', toolCallId: 'call-1', content: { ok: true } },
      ],
    }));
    expect(second.ok && second.turn.text).toBe('Worker sano.');
    expect(bodies[0]).toMatchObject({
      tools: [{ type: 'function', function: { name: 'health' } }],
    });
    expect(JSON.stringify(bodies)).not.toContain('x_search');
    expect(bodies[1]).toMatchObject({
      messages: [
        { role: 'system' },
        { role: 'user' },
        { role: 'assistant', tool_calls: [{ id: 'call-1' }] },
        { role: 'tool', tool_call_id: 'call-1', content: '{"ok":true}' },
      ],
    });
  });

  it('clasifica 429 como cuota transitoria', async () => {
    const fetchImpl: XaiFetch = async () => jsonResponse({ error: 'rate limit' }, 429);
    const result = await new XaiAgentModelProvider('test-key', 'grok-4.3', { fetchImpl }).generate(request());
    expect(result).toMatchObject({ ok: false, error: { code: 'provider_quota', retryable: true } });
  });

  it('clasifica 5xx como error transitorio sin exponer el cuerpo remoto', async () => {
    const fetchImpl: XaiFetch = async () => jsonResponse({ secret: 'no-debe-aparecer' }, 503);
    const result = await new XaiAgentModelProvider('test-key', 'grok-4.3', { fetchImpl }).generate(request());
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'provider_error', message: 'xAI respondió con HTTP 503.', retryable: true },
    });
  });

  it('corta una petición que excede el timeout del adaptador', async () => {
    const fetchImpl: XaiFetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    });
    const result = await new XaiAgentModelProvider('test-key', 'grok-4.3', {
      fetchImpl,
      requestTimeoutMs: 1,
    }).generate(request());
    expect(result).toMatchObject({ ok: false, error: { code: 'provider_timeout', retryable: true } });
  });

  it('falla en cerrado ante una respuesta malformada', async () => {
    const fetchImpl: XaiFetch = async () => jsonResponse({ choices: [] });
    const result = await new XaiAgentModelProvider('test-key', 'grok-4.3', { fetchImpl }).generate(request());
    expect(result).toMatchObject({ ok: false, error: { code: 'provider_error', retryable: false } });
  });

  it('falla en cerrado ante argumentos de función que no sean JSON', async () => {
    const fetchImpl: XaiFetch = async () => jsonResponse({
      choices: [{
        message: {
          content: null,
          tool_calls: [{ id: 'call-1', function: { name: 'health', arguments: '{roto' } }],
        },
        finish_reason: 'tool_calls',
      }],
    });
    const result = await new XaiAgentModelProvider('test-key', 'grok-4.3', { fetchImpl }).generate(request());
    expect(result).toMatchObject({ ok: false, error: { code: 'provider_error', retryable: false } });
  });
});

describe('contrato xAI de herramientas', () => {
  it('rechaza resultados sin tool_call_id antes de salir a red', () => {
    expect(appendXaiRequestMessages([], [
      { role: 'tool', toolName: 'health', toolCallId: null, content: { ok: true } },
    ])).toEqual({ ok: false });
  });

  it('traduce el schema Zod sin la poda específica de Gemini', () => {
    const tool = eraseAgentTool<{ id: number }, { ok: boolean }>({
      name: 'leer',
      version: '1',
      description: 'Lee un registro.',
      inputSchema: z.object({ id: z.number().int().positive() }).strict(),
      requiredPermission: null,
      actionClass: 'read',
      approvalPolicy: 'never',
      maxExecutionMs: 1_000,
      redactInput: (input) => ({ id: input.id }),
      redactOutput: (output) => ({ ok: output.ok }),
      buildIdempotencyKey: null,
      execute: async () => ({ ok: true }),
    });
    const declaration = toolToXaiFunction(tool);
    expect(declaration.function.parameters).toMatchObject({ type: 'object' });
    expect(declaration.function.description).toContain('clase: read');
  });
});
