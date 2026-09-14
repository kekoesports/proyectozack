import { z } from 'zod';

export const sentryIssueListSchema = z.array(z.object({
  id: z.string().regex(/^\d{1,30}$/),
  shortId: z.string().regex(/^SOCIALPRO-WEB-[A-Z0-9]+$/),
  title: z.string().max(5000),
  status: z.literal('unresolved'),
  level: z.enum(['fatal', 'error', 'warning', 'info', 'debug']),
  count: z.string().regex(/^\d+$/),
  firstSeen: z.iso.datetime({ offset: true }),
  lastSeen: z.iso.datetime({ offset: true }),
  project: z.object({ id: z.literal('4512044852772944'), slug: z.literal('socialpro-web') }),
})).max(100);

export type SentryIssue = z.infer<typeof sentryIssueListSchema>[number];
