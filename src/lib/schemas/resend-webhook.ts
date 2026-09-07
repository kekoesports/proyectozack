import { z } from 'zod';

export const resendWebhookHeadersSchema = z.object({
  id: z.string().trim().min(1).max(100),
  timestamp: z.string().trim().min(1).max(100),
  signature: z.string().trim().min(1).max(500),
});

export const resendWebhookEnvelopeSchema = z.object({
  type: z.string().trim().min(1).max(80),
}).passthrough();

export const resendEmailEventTypeSchema = z.enum([
  'email.sent',
  'email.scheduled',
  'email.delivered',
  'email.delivery_delayed',
  'email.complained',
  'email.bounced',
  'email.opened',
  'email.clicked',
  'email.failed',
  'email.suppressed',
]);

const emailEventDataSchema = z.object({
  email_id: z.string().trim().min(1).max(100),
  to: z.array(z.string().trim().email().max(254)).min(1).max(50),
  bounce: z.object({
    type: z.string().trim().min(1).max(80),
    subType: z.string().trim().min(1).max(120).optional(),
  }).passthrough().optional(),
}).passthrough();

export const resendEmailWebhookEventSchema = z.object({
  type: resendEmailEventTypeSchema,
  created_at: z.iso.datetime({ offset: true }),
  data: emailEventDataSchema,
}).passthrough();

export type ResendEmailWebhookEvent = z.infer<typeof resendEmailWebhookEventSchema>;
