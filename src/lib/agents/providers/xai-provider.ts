import { z } from 'zod';

import { logRedacted } from '@/lib/log';
import { XaiChatCompletionSchema, type XaiChatCompletion } from '@/lib/schemas/xai-chat';

import {
  normalizeProviderTurn,
  type AgentModelMessage,
  type AgentModelProvider,
  type AgentModelRequest,
  type AgentModelResult,
  type AgentModelTurn,
} from '../model-provider';
import type { ErasedAgentTool } from '../types';

const XAI_CHAT_COMPLETIONS_URL = 'https://api.x.ai/v1/chat/completions';
export const XAI_REQUEST_TIMEOUT_MS = 60_000;

type XaiFunctionTool = {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
};

type XaiToolCall = {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
};

type XaiChatMessage =
  | { readonly role: 'system' | 'user'; readonly content: string }
  | { readonly role: 'assistant'; readonly content: string | null; readonly tool_calls?: readonly XaiToolCall[] }
  | { readonly role: 'tool'; readonly tool_call_id: string; readonly content: string };

export type XaiFetch = (url: string, init: RequestInit) => Promise<Response>;

export type XaiProviderOptions = {
  readonly fetchImpl?: XaiFetch;
  readonly endpoint?: string;
  readonly requestTimeoutMs?: number;
};

const JsonObjectSchema = z.record(z.string(), z.unknown());

export function toolToXaiFunction(tool: ErasedAgentTool): XaiFunctionTool {
  const parsed = JsonObjectSchema.safeParse(tool.toJsonSchema());
  const parameters = parsed.success ? parsed.data : { type: 'object', properties: {} };

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: `${tool.description} [clase: ${tool.actionClass}]`,
      parameters,
    },
  };
}

/**
 * Añade solo los mensajes nuevos del executor al historial nativo de xAI.
 *
 * Los turnos `assistant` se omiten porque el adaptador conserva la respuesta
 * original con sus `tool_calls`. Un resultado sin id no puede asociarse de
 * forma segura a una llamada y se rechaza antes de enviar la petición.
 */
export function appendXaiRequestMessages(
  history: readonly XaiChatMessage[],
  messages: readonly AgentModelMessage[],
): { readonly ok: true; readonly messages: XaiChatMessage[] } | { readonly ok: false } {
  const output = [...history];

  for (const message of messages) {
    if (message.role === 'assistant') continue;
    if (message.role === 'user') {
      output.push({ role: 'user', content: message.content });
      continue;
    }
    if (!message.toolCallId) return { ok: false };
    output.push({
      role: 'tool',
      tool_call_id: message.toolCallId,
      content: JSON.stringify(message.content),
    });
  }

  return { ok: true, messages: output };
}

function finishReasonForXai(reason: string | null | undefined, hasToolCalls: boolean): AgentModelTurn['finishReason'] {
  if (hasToolCalls) return 'tool_calls';
  if (reason === 'stop') return 'stop';
  if (reason === 'length') return 'length';
  if (reason === 'content_filter') return 'error';
  return 'unknown';
}

function parseToolCalls(response: XaiChatCompletion):
  | { readonly ok: true; readonly native: XaiToolCall[]; readonly normalized: readonly unknown[] }
  | { readonly ok: false } {
  const calls = response.choices[0]?.message.tool_calls ?? [];
  const native: XaiToolCall[] = [];
  const normalized: unknown[] = [];

  for (const call of calls) {
    let input: unknown;
    try {
      input = JSON.parse(call.function.arguments);
    } catch {
      return { ok: false };
    }
    native.push({
      id: call.id,
      type: 'function',
      function: { name: call.function.name, arguments: call.function.arguments },
    });
    normalized.push({ id: call.id, name: call.function.name, args: input });
  }

  return { ok: true, native, normalized };
}

export class XaiAgentModelProvider implements AgentModelProvider {
  readonly name = 'xai';

  private readonly apiKey: string;
  private readonly modelName: string;
  private readonly fetchImpl: XaiFetch;
  private readonly endpoint: string;
  private readonly requestTimeoutMs: number;
  private history: XaiChatMessage[] = [];
  private consumedMessageCount = 0;

  constructor(apiKey: string, modelName: string, options: XaiProviderOptions = {}) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
    this.endpoint = options.endpoint ?? XAI_CHAT_COMPLETIONS_URL;
    this.requestTimeoutMs = options.requestTimeoutMs ?? XAI_REQUEST_TIMEOUT_MS;
  }

  async generate(request: AgentModelRequest): Promise<AgentModelResult> {
    if (request.messages.length < this.consumedMessageCount) {
      this.history = [];
      this.consumedMessageCount = 0;
    }

    const appended = appendXaiRequestMessages(
      this.history,
      request.messages.slice(this.consumedMessageCount),
    );
    if (!appended.ok) {
      return this.providerError('xAI devolvió una llamada de herramienta sin identificador.', false);
    }

    try {
      const tools = request.tools.map(toolToXaiFunction);
      const providerSignal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(this.requestTimeoutMs),
      ]);
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [{ role: 'system', content: request.systemPrompt }, ...appended.messages],
          max_tokens: request.maxOutputTokens,
          ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
        }),
        signal: providerSignal,
      });

      if (!response.ok) return this.httpError(response.status);

      const raw: unknown = await response.json();
      const parsed = XaiChatCompletionSchema.safeParse(raw);
      if (!parsed.success) {
        return this.providerError('Respuesta de xAI inválida o incompleta.', false);
      }

      const choice = parsed.data.choices[0];
      if (!choice) return this.providerError('Respuesta de xAI sin alternativas.', false);
      const calls = parseToolCalls(parsed.data);
      if (!calls.ok) return this.providerError('xAI devolvió argumentos de herramienta inválidos.', false);

      const content = choice.message.content ?? '';
      this.history = appended.messages;
      this.history.push({
        role: 'assistant',
        content: choice.message.content ?? null,
        ...(calls.native.length > 0 ? { tool_calls: calls.native } : {}),
      });
      this.consumedMessageCount = request.messages.length;

      const usage = parsed.data.usage;
      return {
        ok: true,
        turn: normalizeProviderTurn({
          text: content,
          toolCalls: calls.normalized,
          usage: usage
            ? {
                inputTokens: usage.prompt_tokens,
                outputTokens: usage.completion_tokens,
                cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? null,
              }
            : null,
          model: parsed.data.model ?? this.modelName,
          provider: 'xai',
          finishReason: finishReasonForXai(choice.finish_reason, calls.native.length > 0),
        }),
      };
    } catch (error) {
      const aborted = error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError');
      if (aborted) {
        return {
          ok: false,
          error: { code: 'provider_timeout', message: 'La petición a xAI fue cancelada o agotó su tiempo.', retryable: true },
        };
      }
      logRedacted('error', '[agents] error de xAI:', error);
      return this.providerError('No se pudo completar la petición a xAI.', true);
    }
  }

  private httpError(status: number): AgentModelResult {
    if (status === 429) {
      return {
        ok: false,
        error: { code: 'provider_quota', message: 'xAI rechazó temporalmente la petición por cuota.', retryable: true },
      };
    }
    if (status === 408) {
      return {
        ok: false,
        error: { code: 'provider_timeout', message: 'xAI agotó el tiempo de la petición.', retryable: true },
      };
    }
    return this.providerError(`xAI respondió con HTTP ${status}.`, status >= 500);
  }

  private providerError(message: string, retryable: boolean): AgentModelResult {
    return {
      ok: false,
      error: { code: 'provider_error', message, retryable },
    };
  }
}
