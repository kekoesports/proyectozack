import type { AnyAgentToolDefinition } from './types';

/**
 * Interfaz del proveedor de modelo.
 *
 * Existe para que el runtime no dependa del SDK de nadie. Gemini es el primer
 * adaptador, no el contrato: cambiar de proveedor debe ser escribir otro
 * fichero en `providers/`, no tocar el executor.
 *
 * La diferencia con el asistente actual es el punto entero del PR: aquí las
 * llamadas a tools son **estructuradas**. El runtime nuevo no busca `[TOOL:x]`
 * con una expresión regular en el texto generado — un patrón que cualquier
 * dato de entrada puede falsificar sin más que contener esa cadena.
 */

export type AgentModelRole = 'user' | 'assistant' | 'tool';

export type AgentModelMessage =
  | { readonly role: 'user'; readonly content: string }
  | { readonly role: 'assistant'; readonly content: string }
  | {
      readonly role: 'tool';
      readonly toolName: string;
      readonly toolCallId: string | null;
      /** Resultado ya redactado. */
      readonly content: Record<string, unknown>;
    };

/** Lo que el modelo pide. `input` viene sin validar: es dato, no orden. */
export type AgentModelToolCall = {
  readonly id: string | null;
  readonly toolName: string;
  readonly input: unknown;
};

export type AgentModelUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedInputTokens: number | null;
};

export type AgentModelTurn = {
  /** Texto del turno. Puede ir vacío si solo pidió tools. */
  readonly text: string;
  readonly toolCalls: readonly AgentModelToolCall[];
  /** `null` cuando el proveedor no informa de consumo. No se estima a ojo. */
  readonly usage: AgentModelUsage | null;
  readonly model: string | null;
  readonly provider: string;
  readonly finishReason: 'stop' | 'tool_calls' | 'length' | 'error' | 'unknown';
};

export type AgentModelRequest = {
  readonly systemPrompt: string;
  readonly messages: readonly AgentModelMessage[];
  /** Tools que el modelo puede pedir. Que estén aquí no autoriza a ejecutarlas. */
  readonly tools: readonly AnyAgentToolDefinition[];
  readonly maxOutputTokens: number;
  readonly signal: AbortSignal;
};

export type AgentModelError = {
  readonly code: 'provider_unavailable' | 'provider_quota' | 'provider_error' | 'provider_timeout';
  readonly message: string;
  /** Si es transitorio, el worker puede reintentar con backoff (PR 3). */
  readonly retryable: boolean;
};

export type AgentModelResult =
  | { readonly ok: true; readonly turn: AgentModelTurn }
  | { readonly ok: false; readonly error: AgentModelError };

export interface AgentModelProvider {
  readonly name: string;
  generate(request: AgentModelRequest): Promise<AgentModelResult>;
}

/**
 * Normaliza lo que devuelve un proveedor.
 *
 * Cualquier adaptador pasa por aquí antes de entregar el turno. Un proveedor
 * puede devolver un `toolName` que no es una cadena, `input` nulo, o un array
 * de mil llamadas: nada de eso debe llegar al executor con esa forma.
 */
export function normalizeProviderTurn(bruto: {
  readonly text?: unknown;
  readonly toolCalls?: unknown;
  readonly usage?: AgentModelUsage | null;
  readonly model?: string | null;
  readonly provider: string;
  readonly finishReason?: AgentModelTurn['finishReason'];
}): AgentModelTurn {
  const text = typeof bruto.text === 'string' ? bruto.text : '';

  const llamadas: AgentModelToolCall[] = [];
  if (Array.isArray(bruto.toolCalls)) {
    // Tope duro: un proveedor que pide 500 tools en un turno es un fallo, y
    // recortarlo aquí evita que el executor tenga que defenderse solo con
    // contadores.
    for (const candidato of bruto.toolCalls.slice(0, MAX_TOOL_CALLS_POR_TURNO)) {
      if (candidato === null || typeof candidato !== 'object') continue;
      const c = candidato as Record<string, unknown>;
      const toolName = typeof c.toolName === 'string' ? c.toolName : typeof c.name === 'string' ? c.name : null;
      if (!toolName) continue;
      llamadas.push({
        id: typeof c.id === 'string' ? c.id : null,
        toolName,
        input: 'input' in c ? c.input : 'args' in c ? c.args : {},
      });
    }
  }

  return {
    text,
    toolCalls: llamadas,
    usage: bruto.usage ?? null,
    model: bruto.model ?? null,
    provider: bruto.provider,
    finishReason: bruto.finishReason ?? (llamadas.length > 0 ? 'tool_calls' : 'stop'),
  };
}

/** Llamadas a tools que se aceptan de un solo turno. */
export const MAX_TOOL_CALLS_POR_TURNO = 8;
