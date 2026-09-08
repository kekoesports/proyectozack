import { z } from 'zod';

export const creatorOutreachSourceTypeSchema = z.enum([
  'target',
  'creator_application',
  'contact_submission',
]);

export const creatorOutreachStatusSchema = z.enum([
  'draft',
  'sent',
  'delivered',
  'replied',
  'interested',
  'needs_info',
  'not_interested',
  'no_response',
  'bounced',
  'complained',
  'unsubscribed',
]);

export const creatorReviewSourceTypeSchema = z.enum([
  'creator_application',
  'contact_submission',
]);

export const creatorReviewDecisionSchema = z.enum(['green', 'yellow', 'red']);

const creatorReviewSourceSchema = z.object({
  sourceType: creatorReviewSourceTypeSchema,
  sourceId: z.coerce.number().int().positive(),
});

export const refreshCreatorReviewSchema = creatorReviewSourceSchema;

export const addCreatorReviewNoteSchema = creatorReviewSourceSchema.extend({
  note: z.string().trim().min(1).max(2_000),
});

export const discardCreatorReviewSchema = creatorReviewSourceSchema;

export const sendCreatorReviewDecisionSchema = creatorReviewSourceSchema.extend({
  decision: z.enum(['green', 'red']),
  idempotencyKey: z.uuid(),
});

export const sendCreatorOutreachSchema = z.object({
  sourceType: creatorOutreachSourceTypeSchema,
  sourceId: z.coerce.number().int().positive(),
  subject: z.string().trim().min(1).max(200)
    .refine((value) => !/[\r\n]/.test(value), 'El asunto debe ocupar una sola línea'),
  body: z.string().trim().min(1).max(10_000),
  idempotencyKey: z.uuid(),
});

export const sendTargetOutreachSchema = sendCreatorOutreachSchema.omit({ sourceType: true });

export const resendReceivedWebhookEventSchema = z.object({
  type: z.literal('email.received'),
  created_at: z.iso.datetime({ offset: true }),
  data: z.object({
    email_id: z.string().trim().min(1).max(100),
    from: z.string().trim().min(3).max(500),
    to: z.array(z.string().trim().min(3).max(500)).min(1).max(50),
    subject: z.string().max(500).optional(),
    message_id: z.string().max(500).optional(),
  }).passthrough(),
}).passthrough();

export const resendReceivedContentSchema = z.object({
  id: z.string().trim().min(1).max(100),
  from: z.string().trim().min(3).max(500),
  to: z.array(z.string().trim().min(3).max(500)).min(1).max(50),
  subject: z.string().max(500).nullable().optional(),
  text: z.string().max(250_000).nullable().optional(),
  html: z.string().max(500_000).nullable().optional(),
  message_id: z.string().max(500).nullable().optional(),
}).passthrough();

export type CreatorOutreachSourceType = z.infer<typeof creatorOutreachSourceTypeSchema>;
export type CreatorOutreachStatus = z.infer<typeof creatorOutreachStatusSchema>;
export type CreatorReviewSourceType = z.infer<typeof creatorReviewSourceTypeSchema>;
export type CreatorReviewDecision = z.infer<typeof creatorReviewDecisionSchema>;
export type SendCreatorOutreachInput = z.infer<typeof sendCreatorOutreachSchema>;
export type ResendReceivedWebhookEvent = z.infer<typeof resendReceivedWebhookEventSchema>;
export type ResendReceivedContent = z.infer<typeof resendReceivedContentSchema>;
