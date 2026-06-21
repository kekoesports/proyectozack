import { z } from 'zod';

export const AI_CONTEXT_TYPES = ['general', 'facturacion', 'campanas', 'talentos', 'marcas', 'finanzas'] as const;
export type AiContextTypeKey = typeof AI_CONTEXT_TYPES[number];

export const sendMessageSchema = z.object({
  threadId: z.number().int().positive().optional(),
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'Máximo 2000 caracteres'),
  contextType: z.enum(AI_CONTEXT_TYPES).default('general'),
});

export const createThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contextType: z.enum(AI_CONTEXT_TYPES).default('general'),
});

export const deleteThreadSchema = z.object({
  threadId: z.number().int().positive(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
