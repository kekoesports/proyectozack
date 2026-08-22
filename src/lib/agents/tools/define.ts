import { z } from 'zod';

import type { Action, Module } from '@/lib/permissions';

import { eraseAgentTool } from '../erase-tool';
import type { AgentToolContext, ErasedAgentTool } from '../types';

/**
 * Azúcar para declarar tools de solo lectura.
 *
 * Las de lectura comparten forma: no reciben argumentos o reciben uno trivial,
 * no escriben nada, no necesitan aprobación ni clave de idempotencia. Que se
 * declaren por aquí y no a mano evita que una tool nazca con `actionClass`
 * equivocada — que es justo el campo del que cuelga toda la política.
 *
 * `NO_ARGS` es `.strict()` a propósito: si el modelo manda argumentos a una
 * tool que no los tiene, es señal de que entendió otra cosa, y prefiero un
 * error de validación a ejecutar ignorando lo que pidió.
 */

export const NO_ARGS = z.object({}).strict();
export type NoArgs = z.infer<typeof NO_ARGS>;

export type DefineReadToolOptions<TOutput> = {
  readonly name: string;
  readonly version?: string;
  readonly description: string;
  /** Permiso del CRM. `null` solo para lo que puede ver cualquier autenticado. */
  readonly permission: { readonly module: Module; readonly action: Action } | null;
  readonly maxExecutionMs?: number;
  readonly run: (ctx: AgentToolContext) => Promise<TOutput>;
  /** Por defecto se guarda el resultado tal cual y el redactor genérico lo poda. */
  readonly redactOutput?: (output: TOutput) => Record<string, unknown>;
};

const TIMEOUT_LECTURA_MS = 15_000;

export function defineReadTool<TOutput>(opts: DefineReadToolOptions<TOutput>): ErasedAgentTool {
  return eraseAgentTool<NoArgs, TOutput>({
    name: opts.name,
    version: opts.version ?? '1',
    description: opts.description,
    inputSchema: NO_ARGS,
    requiredPermission: opts.permission,
    actionClass: 'read',
    approvalPolicy: 'never',
    maxExecutionMs: opts.maxExecutionMs ?? TIMEOUT_LECTURA_MS,
    redactInput: () => ({}),
    redactOutput: opts.redactOutput ?? ((output) => envolver(output)),
    // Repetir una lectura no tiene consecuencias: no necesita clave.
    buildIdempotencyKey: null,
    execute: (ctx) => opts.run(ctx),
  });
}

/**
 * Un resultado que no es objeto se envuelve en `{ value }`.
 *
 * Las columnas `jsonb` del runtime guardan objetos, y una lista suelta o un
 * número a pelo obligaría a cada lector posterior a adivinar la forma.
 */
export function envolver(output: unknown): Record<string, unknown> {
  if (Array.isArray(output)) return { items: output, count: output.length };
  if (output !== null && typeof output === 'object') return output as Record<string, unknown>;
  return { value: output };
}
