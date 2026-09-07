import { z } from 'zod';

const XaiToolCallSchema = z.object({
  id: z.string().min(1),
  type: z.literal('function').optional(),
  function: z.object({
    name: z.string().min(1),
    arguments: z.string(),
  }),
});

const XaiAssistantMessageSchema = z.object({
  role: z.literal('assistant').optional(),
  content: z.string().nullable().optional(),
  tool_calls: z.array(XaiToolCallSchema).optional(),
});

/** Respuesta externa de `POST /v1/chat/completions`. */
export const XaiChatCompletionSchema = z.object({
  id: z.string().optional(),
  model: z.string().min(1).optional(),
  choices: z
    .array(
      z.object({
        message: XaiAssistantMessageSchema,
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative(),
      completion_tokens: z.number().int().nonnegative(),
      prompt_tokens_details: z
        .object({
          cached_tokens: z.number().int().nonnegative().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type XaiChatCompletion = z.infer<typeof XaiChatCompletionSchema>;
