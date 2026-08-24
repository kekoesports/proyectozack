
import { logRedacted } from '@/lib/log';

import {
  normalizeProviderTurn,
  type AgentModelMessage,
  type AgentModelProvider,
  type AgentModelRequest,
  type AgentModelResult,
} from '../model-provider';
import type { ErasedAgentTool } from '../types';

/**
 * La cuota gratuita actual permite cinco `generateContent` por minuto y cada
 * ejecución puede necesitar varios turnos. Sin una puerta compartida, dos runs
 * distintos consumen la cuota a la vez, reciben 429 y agotan sus reintentos
 * antes de que se abra la siguiente ventana.
 *
 * Se deja un pequeño margen sobre 60s / 5. El límite es global al proceso, no a
 * la instancia del proveedor, porque cada run crea su propio adaptador.
 */
export const GEMINI_MIN_REQUEST_INTERVAL_MS = 12_500;

type GeminiRequestGateOptions = {
  readonly minIntervalMs: number;
  readonly now?: () => number;
  readonly sleep?: (delayMs: number) => Promise<void>;
};

export function createGeminiRequestGate(options: GeminiRequestGateOptions): () => Promise<void> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  let nextAllowedAt = 0;
  let queue: Promise<void> = Promise.resolve();

  return async () => {
    let release: (() => void) | undefined;
    const previous = queue;
    queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      const delayMs = Math.max(0, nextAllowedAt - now());
      if (delayMs > 0) await sleep(delayMs);
      nextAllowedAt = now() + options.minIntervalMs;
    } finally {
      release?.();
    }
  };
}

const waitForGeminiRequestSlot = createGeminiRequestGate({
  minIntervalMs: GEMINI_MIN_REQUEST_INTERVAL_MS,
});

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

/**
 * Forma mínima que necesita `generateContent` para conservar el historial.
 *
 * No usamos aquí el tipo de `@google/generative-ai` porque la versión actual
 * de ese SDK aún no declara `thoughtSignature` ni el `id` de las llamadas,
 * aunque la API sí los devuelve. Gemini 3 exige que el bloque del modelo se
 * reenvíe sin reconstruirlo: la firma es opaca y perderla provoca un 400.
 */
export type GeminiHistoryContent = {
  readonly role: string;
  readonly parts: readonly Record<string, unknown>[];
};

function respuestaDeTool(mensaje: Extract<AgentModelMessage, { readonly role: 'tool' }>): Record<string, unknown> {
  return {
    functionResponse: {
      name: mensaje.toolName,
      response: mensaje.content,
      ...(mensaje.toolCallId ? { id: mensaje.toolCallId } : {}),
    },
  };
}

/**
 * Añade solo mensajes nuevos del executor al historial nativo de Gemini.
 *
 * Los mensajes `assistant` se omiten deliberadamente: el proveedor ya guarda
 * el `candidate.content` original, con sus `functionCall`, ids y firmas de
 * pensamiento. Los resultados de varias tools paralelas se agrupan en un solo
 * turno `user`, exactamente en el orden en que fueron solicitadas.
 */
export function appendGeminiRequestMessages(
  history: readonly GeminiHistoryContent[],
  messages: readonly AgentModelMessage[],
): GeminiHistoryContent[] {
  const salida = [...history];

  for (let i = 0; i < messages.length; i += 1) {
    const mensaje = messages[i];
    if (!mensaje || mensaje.role === 'assistant') continue;

    if (mensaje.role === 'user') {
      salida.push({ role: 'user', parts: [{ text: mensaje.content }] });
      continue;
    }

    const parts: Record<string, unknown>[] = [respuestaDeTool(mensaje)];
    while (i + 1 < messages.length && messages[i + 1]?.role === 'tool') {
      i += 1;
      const siguiente = messages[i];
      if (siguiente?.role === 'tool') parts.push(respuestaDeTool(siguiente));
    }
    // Gemini 3.6 ya no acepta el rol histórico `function`: las respuestas de
    // herramientas son contenido `user` con partes `functionResponse`.
    salida.push({ role: 'user', parts });
  }

  return salida;
}

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
  private history: GeminiHistoryContent[] = [];
  private consumedMessageCount = 0;

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

      // Una instancia del proveedor pertenece a una ejecución. Si alguien la
      // reutiliza con un historial más corto, empezamos una conversación nueva
      // en vez de mezclar dos runs.
      if (request.messages.length < this.consumedMessageCount) {
        this.history = [];
        this.consumedMessageCount = 0;
      }
      this.history = appendGeminiRequestMessages(
        this.history,
        request.messages.slice(this.consumedMessageCount),
      );
      this.consumedMessageCount = request.messages.length;

      await waitForGeminiRequestSlot();
      const resultado = await model.generateContent({
        // El objeto original del candidato puede llevar `thoughtSignature`,
        // campo que el SDK antiguo no tipa pero que la API de Gemini 3 valida.
        contents: this.history as unknown as never,
        generationConfig: { maxOutputTokens: request.maxOutputTokens },
      });

      const respuesta = resultado.response;
      const candidateContent = respuesta.candidates?.[0]?.content as unknown as GeminiHistoryContent | undefined;
      if (candidateContent?.parts?.length) this.history.push(candidateContent);
      const llamadas = typeof respuesta.functionCalls === 'function' ? respuesta.functionCalls() : undefined;
      const uso = respuesta.usageMetadata;

      return {
        ok: true,
        turn: normalizeProviderTurn({
          text: typeof respuesta.text === 'function' ? respuesta.text() : '',
          toolCalls: (llamadas ?? []).map((c) => {
            const cruda = c as unknown as Record<string, unknown>;
            return {
              name: c.name,
              args: c.args,
              ...(typeof cruda.id === 'string' ? { id: cruda.id } : {}),
            };
          }),
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
