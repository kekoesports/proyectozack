import { z } from 'zod';

export const NewsSocialChannel = z.enum(['x', 'instagram']);
export type NewsSocialChannel = z.infer<typeof NewsSocialChannel>;
export const NewsSocialControl = z.object({
  channel: NewsSocialChannel,
  action: z.enum(['activate', 'pause']),
});
export const NewsSocialPostId = z.coerce.number().int().positive();
export const XIdentity = z.object({ data: z.object({ id: z.string().regex(/^\d+$/), username: z.string() }) });
export const XPublished = z.object({ data: z.object({ id: z.string().regex(/^\d+$/) }) });
export const InstagramIdentity = z.object({ id: z.string().regex(/^\d+$/), username: z.string() });
export const InstagramCreated = z.object({ id: z.string().regex(/^\d+$/) });
export const InstagramContainer = z.object({ status_code: z.enum(['IN_PROGRESS', 'FINISHED', 'PUBLISHED', 'ERROR', 'EXPIRED']) });
export const InstagramError = z.object({ error: z.object({ code: z.number().int(), is_transient: z.boolean().optional() }) });
