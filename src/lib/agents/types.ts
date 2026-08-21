import type { ZodType } from 'zod';

import type { Action, Module } from '@/lib/permissions';
import type { Role } from '@/lib/auth-guard';
import type {
  agentActionClassEnum,
  agentModeEnum,
  agentStatusEnum,
} from '@/db/schema/agentEnums';

/**
 * Tipos centrales del runtime de agentes.
 *
 * Sin `server-only`: aquí no hay acceso a datos, solo contratos. Que se puedan
 * importar desde un test —o desde un componente, si algún día hiciera falta el
 * tipo— es la razón de mantenerlos separados de la ejecución.
 */

export type AgentActionClass = (typeof agentActionClassEnum.enumValues)[number];
export type AgentMode = (typeof agentModeEnum.enumValues)[number];
export type AgentStatus = (typeof agentStatusEnum.enumValues)[number];

/**
 * Cuándo hace falta una firma humana.
 *
 * - `never`: la clase de acción ya la exime (lecturas, borradores).
 * - `always`: siempre, sin importar el modo.
 * - `dynamic`: lo decide la política a partir de modo y clase. Es el caso de
 *   las escrituras internas, que hoy piden aprobación y algún día podrán no
 *   pedirla en `execute` sin tocar la tool.
 */
export type AgentApprovalPolicy = 'never' | 'always' | 'dynamic';

/** Permiso del CRM que exige una tool. `null` = ninguno más allá de estar autenticado. */
export type AgentToolPermission = {
  readonly module: Module;
  readonly action: Action;
};

/**
 * Contexto con el que se ejecuta una tool.
 *
 * Lleva el rol **real** del actor, no uno que el modelo pueda proponer. El
 * modelo no aparece por ninguna parte de esta estructura, y ese es el punto:
 * la autoridad viene del agente configurado y del humano, nunca del texto que
 * genera el modelo.
 */
export type AgentToolContext = {
  readonly runId: number;
  readonly agentId: number;
  readonly agentSlug: string;
  readonly agentMode: AgentMode;
  /** Rol efectivo del actor. Nunca lo elige el modelo. */
  readonly actorRole: Role;
  readonly actorUserId: string | null;
  readonly correlationId: string;
  /** Aborta la ejecución cuando vence el timeout o se cancela el run. */
  readonly signal: AbortSignal;
};

/**
 * Definición de una tool.
 *
 * `TInput` sale del schema Zod; nada llega al `execute` sin haber pasado por
 * `inputSchema.safeParse`.
 */
export type AgentToolDefinition<TInput = unknown, TOutput = unknown> = {
  readonly name: string;
  /** Congela la semántica. Una v2 no hereda aprobaciones de la v1. */
  readonly version: string;
  /** La lee el modelo. No es un mecanismo de seguridad. */
  readonly description: string;
  readonly inputSchema: ZodType<TInput>;
  readonly requiredPermission: AgentToolPermission | null;
  readonly actionClass: AgentActionClass;
  readonly approvalPolicy: AgentApprovalPolicy;
  readonly maxExecutionMs: number;
  /** Qué se guarda del input. Por defecto no se guarda nada sin pasar por aquí. */
  readonly redactInput: (input: TInput) => Record<string, unknown>;
  /** Qué se guarda y qué ve el modelo del resultado. */
  readonly redactOutput: (output: TOutput) => Record<string, unknown>;
  /**
   * Clave de idempotencia para tools que escriben. `null` en las de lectura:
   * repetir una lectura no tiene consecuencias.
   */
  readonly buildIdempotencyKey: ((ctx: AgentToolContext, input: TInput) => string) | null;
  readonly execute: (ctx: AgentToolContext, input: TInput) => Promise<TOutput>;
};

/**
 * Una llamada ya validada y lista para ejecutar.
 *
 * El input tipado no aparece por aquí: vive dentro del closure que devuelve
 * `prepare`. Es lo que permite guardar tools de tipos distintos en el mismo
 * registro sin `any` y sin `as`, y de paso hace imposible ejecutar una tool
 * sin haber pasado por Zod o quedarse sin aplicar el redactor de salida.
 */
export type PreparedAgentToolCall = {
  readonly redactedInput: Record<string, unknown>;
  /** `null` en las tools que no escriben. */
  readonly buildIdempotencyKey: ((ctx: AgentToolContext) => string) | null;
  /** Ejecuta y devuelve el resultado ya redactado por la propia tool. */
  readonly execute: (ctx: AgentToolContext) => Promise<Record<string, unknown>>;
};

export type PrepareAgentToolCallResult =
  | { readonly ok: true; readonly call: PreparedAgentToolCall }
  | { readonly ok: false; readonly issues: readonly string[] };

/**
 * Tool con los genéricos borrados: lo que guarda el registro y consume el
 * executor.
 *
 * Conserva los metadatos que necesitan la política y el prompt, y expone el
 * input solo a través de `prepare`.
 */
export type ErasedAgentTool = {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly requiredPermission: AgentToolPermission | null;
  readonly actionClass: AgentActionClass;
  readonly approvalPolicy: AgentApprovalPolicy;
  readonly maxExecutionMs: number;
  /** JSON Schema del input, para declarar la función al proveedor. */
  readonly toJsonSchema: () => unknown;
  readonly prepare: (rawInput: unknown) => PrepareAgentToolCallResult;
};

/** Alias histórico. `ErasedAgentTool` describe mejor lo que es. */
export type AnyAgentToolDefinition = ErasedAgentTool;

/** Lo que el modelo pide. Todavía no es una ejecución. */
export type AgentToolCallRequest = {
  readonly toolName: string;
  /** Sin validar: viene del modelo y se trata como dato hostil. */
  readonly rawInput: unknown;
  /** Identificador que devuelve el proveedor, si lo hay. */
  readonly providerCallId?: string | null;
};

/** Resultado de intentar ejecutar una tool. */
export type AgentToolExecutionResult =
  | {
      readonly status: 'succeeded';
      readonly output: Record<string, unknown>;
      readonly durationMs: number;
    }
  | {
      readonly status: 'blocked';
      readonly code: string;
      readonly message: string;
    }
  | {
      readonly status: 'waiting_approval';
      readonly actionHash: string;
      readonly title: string;
      readonly summary: string;
      readonly parametersPreview: Record<string, unknown>;
    }
  | {
      readonly status: 'simulated';
      /** Qué habría hecho, sin hacerlo. Es la salida de `shadow`. */
      readonly wouldHave: Record<string, unknown>;
    }
  | {
      readonly status: 'failed';
      readonly code: string;
      readonly message: string;
      readonly durationMs: number;
    }
  /**
   * No se sabe si la acción llegó a ocurrir.
   *
   * Pasa cuando una tool que escribe supera su timeout: el `Promise.race`
   * devuelve el control, pero la escritura sigue viva y puede completarse.
   * Registrarlo como `failed` sería mentir, y la mentira tiene consecuencias —
   * un fallo se reintenta, y reintentar un envío que sí ocurrió lo duplica.
   *
   * Un resultado indeterminado **no se reintenta**: lo mira una persona.
   */
  | {
      readonly status: 'indeterminate';
      readonly code: string;
      readonly message: string;
      readonly durationMs: number;
    };

/** Límites de una ejecución. Se comprueban en cada vuelta, no al empezar. */
export type AgentRunLimits = {
  readonly maxTurns: number;
  readonly maxToolCalls: number;
  readonly maxDurationSeconds: number;
};

/** Contadores vivos de la ejecución. */
export type AgentRunCounters = {
  readonly modelTurns: number;
  readonly toolCalls: number;
  readonly startedAt: Date;
};
