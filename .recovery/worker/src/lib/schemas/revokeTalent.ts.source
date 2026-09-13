import { z } from 'zod';
import { IdSchema } from './common';

export const RevokeTalentInput = z.object({
  id: IdSchema,
  mode: z.enum(['archive', 'delete']),
  acknowledged: z.literal(true),
  confirmation: z.string().trim().min(1).max(100),
});

export const RevokeTalentResult = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), slug: z.string() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export type RevokeTalentInput = z.infer<typeof RevokeTalentInput>;
export type RevokeTalentResult = z.infer<typeof RevokeTalentResult>;
