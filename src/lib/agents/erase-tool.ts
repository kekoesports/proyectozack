import { z } from 'zod';

import { logRedacted } from '@/lib/log';

import type {
  AgentToolContext,
  AgentToolDefinition,
  ErasedAgentTool,
  PrepareAgentToolCallResult,
} from './types';

/**
 * Borra los genéricos de una tool conservando la seguridad de tipos donde
 * importa.
 *
 * El truco está en que el input tipado nunca sale de este closure: `prepare`
 * valida con Zod, y lo que devuelve son funciones que ya llevan dentro el
 * valor con su tipo real. El executor manipula metadatos y callbacks, jamás el
 * input, así que no necesita `any` ni `as` para nada.
 *
 * Efecto secundario buscado: no hay forma de ejecutar una tool saltándose la
 * validación, ni de devolver un resultado sin pasarlo por su redactor. No es
 * disciplina, es que la otra ruta no existe.
 */
export function eraseAgentTool<TInput, TOutput>(
  tool: AgentToolDefinition<TInput, TOutput>,
): ErasedAgentTool {
  return {
    name: tool.name,
    version: tool.version,
    description: tool.description,
    requiredPermission: tool.requiredPermission,
    actionClass: tool.actionClass,
    approvalPolicy: tool.approvalPolicy,
    maxExecutionMs: tool.maxExecutionMs,

    toJsonSchema: () => {
      try {
        return z.toJSONSchema(tool.inputSchema, { io: 'input' });
      } catch (err) {
        // Un schema que no se puede traducir no debe tumbar el turno: la tool
        // se declara sin parámetros y Zod rechazará después lo que no encaje.
        logRedacted('warn', `[agents] schema no traducible para ${tool.name}:`, err);
        return { type: 'object', properties: {} };
      }
    },

    prepare: (rawInput: unknown): PrepareAgentToolCallResult => {
      const parsed = tool.inputSchema.safeParse(rawInput);
      if (!parsed.success) {
        return {
          ok: false,
          issues: parsed.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`),
        };
      }

      const input = parsed.data;

      return {
        ok: true,
        call: {
          redactedInput: tool.redactInput(input),
          buildIdempotencyKey: tool.buildIdempotencyKey
            ? (ctx: AgentToolContext) => {
                const build = tool.buildIdempotencyKey;
                if (!build) throw new Error('agents: buildIdempotencyKey desapareció');
                return build(ctx, input);
              }
            : null,
          execute: async (ctx: AgentToolContext) => {
            const salida = await tool.execute(ctx, input);
            return tool.redactOutput(salida);
          },
        },
      };
    },
  };
}

