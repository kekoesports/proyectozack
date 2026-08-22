
import { logRedacted } from '@/lib/log';

import {
  normalizeProviderTurn,
  type AgentModelProvider,
  type AgentModelRequest,
  type AgentModelResult,
} from '../model-provider';
import type { ErasedAgentTool } from '../types';

/**
 * Adaptador de Gemini con function calling estructurado.
 *
 * Es un adaptador, no el contrato: todo lo que aquí se traduce entra y sale por
 * `AgentModelProvider`, así que sustituir el proveedor no toca el executor.
 *
 * Diferencia esencial con `src/lib/services/ai-assistant/provider.ts`, que
 * sigue funcionando sin cambios: aquí las llamadas a tools llegan como
 * `functionCall` del SDK, no como `[TOOL:x]` buscado con una expresión regular
 * dentro del texto generado. Ese patrón lo puede falsificar cualquier dato que
 * el modelo esté citando — un email, un log, el resultado de otra tool.
 */

/** Claves de JSON Schema que Gemini rechaza o ignora. */
const CLAVES_NO_SOPORTADAS = new Set([
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'definitions',
  'additionalProperties',
  'unevaluatedProperties',
  'const',
  'examples',
  'default',
  'exclusiveMinimum',
  'exclusiveMaximum',
]);

/**
 * Poda un JSON Schema hasta el subconjunto que Gemini acepta.
 *
 * Se hace por lista de exclusión y no por lista de inclusión porque un schema
 * con un campo de más falla entero: es preferible perder una restricción fina
 * —que de todos modos vuelve a comprobarse con Zod en el executor— que quedarse
 * sin declaración de función.
 */
function podarSchema(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(podarSchema);
  if (valor === null || typeof valor !== 'object') return valor;

  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    if (CLAVES_NO_SOPORTADAS.has(k)) continue;
    salida[k] = podarSchema(v);
  }
  return salida;
}

type DeclaracionFuncion = {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
};

export function toolToFunctionDeclaration(tool: ErasedAgentTool): DeclaracionFuncion {
  let parameters: Record<string, unknown> = { type: 'object', properties: {} };
  const podado = podarSchema(tool.toJsonSchema());
  if (podado !== null && typeof podado === 'object' && !Array.isArray(podado)) {
    // safe: `podarSchema` devuelve el mismo tipo que recibe y el guard acaba de
    // descartar null, array y primitivos.
    parameters = podado as Record<string, unknown>;
  }

  return {
    name: tool.name,
    // Se anota la clase de acción para que el modelo sepa qué va a requerir
    // firma humana. Es información, no permiso.
    description: `${tool.description} [clase: ${tool.actionClass}]`,
    parameters,
  };
}

export class GeminiAgentModelProvider implements AgentModelProvider {
  readonly name = 'gemini';

  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async generate(request: AgentModelRequest): Promise<AgentModelResult> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);

      const declaraciones = request.tools.map(toolToFunctionDeclaration);
      const model = genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: request.systemPrompt,
        ...(declaraciones.length > 0
          ? // safe: el SDK tipa `functionDeclarations` con su propio FunctionDeclaration;
            // el schema podado cumple el subconjunto que espera, pero no su tipo nominal.
            { tools: [{ functionDeclarations: declaraciones } as unknown as never] }
          : {}),
      });

      const contents = request.messages.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'function' as const,
            parts: [{ functionResponse: { name: m.toolName, response: m.content } }],
          };
        }
        return {
          role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
          parts: [{ text: m.content }],
        };
      });

      const resultado = await model.generateContent({
        contents,
        generationConfig: { maxOutputTokens: request.maxOutputTokens },
      });

      const respuesta = resultado.response;
      const llamadas = typeof respuesta.functionCalls === 'function' ? respuesta.functionCalls() : undefined;
      const uso = respuesta.usageMetadata;

      return {
        ok: true,
        turn: normalizeProviderTurn({
          text: typeof respuesta.text === 'function' ? respuesta.text() : '',
          toolCalls: (llamadas ?? []).map((c) => ({ name: c.name, args: c.args })),
          usage: uso
            ? {
                inputTokens: uso.promptTokenCount ?? 0,
                outputTokens: uso.candidatesTokenCount ?? 0,
                cachedInputTokens: uso.cachedContentTokenCount ?? null,
              }
            : null,
          model: this.modelName,
          provider: 'gemini',
        }),
      };
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      logRedacted('error', '[agents] error de Gemini:', mensaje);

      // La cuota y los 5xx son transitorios: el worker reintenta con backoff.
      // Un 400 no lo es, y reintentarlo solo gasta cuota.
      const esCuota = mensaje.includes('429') || mensaje.toLowerCase().includes('quota');
      const esServidor = /\b5\d\d\b/.test(mensaje);

      return {
        ok: false,
        error: {
          code: esCuota ? 'provider_quota' : 'provider_error',
          message: mensaje.slice(0, 300),
          retryable: esCuota || esServidor,
        },
      };
    }
  }
}
