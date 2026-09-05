import { z } from 'zod';

export const creatorDigestEventKeySchema = z.string().regex(/^creator-(run|status|test):[A-Za-z0-9:_-]{1,80}$/);
export const creatorDigestAckSchema = z.object({
  messageId: z.string().regex(/^\d{17,20}$/), channelId: z.string().regex(/^\d{17,20}$/),
}).strict();
export const creatorDigestRouteIdSchema = z.coerce.number().int().positive();
export const creatorDigestSinceSchema = z.iso.datetime().optional();
