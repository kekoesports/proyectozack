import { z } from 'zod';

export const PressDraftIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const PressDraftUpdateSchema = PressDraftIdSchema.extend({
  title: z.string().trim().min(5).max(300),
  excerpt: z.string().trim().min(10).max(500),
  bodyMd: z.string().trim().min(1).max(100_000),
  author: z.string().trim().min(2).max(100),
});
