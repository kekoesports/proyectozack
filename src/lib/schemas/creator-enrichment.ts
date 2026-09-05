import { z } from 'zod';
import { creatorObservationSchema, creatorPlatformSchema } from './creator-search-profile';

/** Caller supplies only publicly returned provider fields, not private API/account data. */
const publicText = z.object({
  value: z.string().max(20_000),
  source: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/),
  observedAt: z.iso.datetime(),
}).strict();
export const creatorEnrichmentInputSchema = z.object({
  syncedAt: z.iso.datetime(),
  bio: publicText.optional(),
  website: publicText.optional(),
  professionalPublicFields: z.array(publicText.extend({
    kind: z.enum(['business_email', 'management', 'social_url']),
  })).max(20).default([]),
}).strict().superRefine((input, context) => {
  for (const field of [input.bio, input.website, ...input.professionalPublicFields]) {
    if (field && Date.parse(field.observedAt) > Date.parse(input.syncedAt)) {
      context.addIssue({ code: 'custom', message: 'Observation cannot be newer than synchronization' });
    }
  }
});
export type CreatorEnrichmentInput = z.input<typeof creatorEnrichmentInputSchema>;
export type CreatorPublicText = z.infer<typeof publicText>;

export const creatorPublicEmailSchema = z.email().max(254).refine(value => {
  const [local, domain] = value.split('@');
  return local !== undefined && local.length <= 64 && domain !== undefined
    && domain.split('.').every(label => label.length <= 63);
});
export const creatorPublicUrlSchema = z.string().trim().min(1).max(2048)
  .regex(/^https?:\/\//i).refine(value => !/[\u0000-\u0020\u007F\\]/.test(value));
export const creatorEnrichmentResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(false), error: z.literal('invalid_input') }),
  z.object({
    ok: z.literal(true), error: z.null(),
    fields: z.object({
      contactEmail: creatorObservationSchema, website: creatorObservationSchema, management: creatorObservationSchema,
    }),
    crosslinks: z.array(z.object({
      platform: creatorPlatformSchema,
      observation: creatorObservationSchema,
      requiresReview: z.literal(true), autoMerge: z.literal(false),
    })).max(20),
    warnings: z.array(z.enum(['ambiguous_professional_email', 'invalid_public_url', 'crosslink_limit'])),
  }),
]);
export type CreatorEnrichmentResult = z.infer<typeof creatorEnrichmentResultSchema>;
