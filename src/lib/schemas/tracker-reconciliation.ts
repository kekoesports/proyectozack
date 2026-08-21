import { z } from 'zod';

const optionalNote = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().max(2000).optional(),
);

export const trackerReconciliationQueueFilterSchema = z.enum([
  'unreconciled',
  'deferred',
  'legacy',
]);

export type TrackerReconciliationQueueFilter = z.infer<
  typeof trackerReconciliationQueueFilterSchema
>;

export const linkTrackerToCampaignSchema = z.object({
  trackerId: z.coerce.number().int().positive(),
  campaignId: z.coerce.number().int().positive(),
  note: optionalNote,
});

export type LinkTrackerToCampaignInput = z.infer<typeof linkTrackerToCampaignSchema>;

export const classifyUnlinkedTrackerSchema = z.object({
  trackerId: z.coerce.number().int().positive(),
  status: z.enum(['legacy', 'deferred']),
  note: optionalNote,
});

export type ClassifyUnlinkedTrackerInput = z.infer<typeof classifyUnlinkedTrackerSchema>;
