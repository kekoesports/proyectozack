import { z } from 'zod';

export const TRACKER_STATUSES = ['active', 'review_pending', 'approved', 'paid', 'cancelled'] as const;
export const TRACKER_ITEM_STATUSES = ['detected', 'valid', 'duplicate', 'invalid', 'approved', 'rejected'] as const;
export const CONTENT_PLATFORMS = ['twitch', 'kick', 'youtube', 'instagram', 'tiktok', 'other'] as const;
export const DELIVERABLE_TYPES = [
  'stream_integration', 'video_youtube', 'short_reel_tiktok',
  'story_instagram', 'tweet_x', 'post_instagram', 'otro',
] as const;

export const createTrackerSchema = z.object({
  brandName:        z.string().min(1).max(200),
  dealName:         z.string().min(1).max(300),
  deliverableType:  z.enum(DELIVERABLE_TYPES),
  targetCount:      z.coerce.number().int().positive(),
  campaignId:       z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  talentId:         z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  notes:            z.string().max(2000).optional(),
});

export type CreateTrackerInput = z.infer<typeof createTrackerSchema>;

export const updateTrackerSchema = createTrackerSchema.partial().extend({
  id:     z.coerce.number().int().positive(),
  status: z.enum(TRACKER_STATUSES).optional(),
});

export const reviewTrackerItemSchema = z.object({
  itemId:  z.coerce.number().int().positive(),
  status:  z.enum(['valid', 'invalid', 'approved', 'rejected']),
});

export const importLinksSchema = z.object({
  trackerId:    z.coerce.number().int().positive(),
  sourceFile:   z.string().min(1).max(500),
  linkColumn:   z.string().min(1),
  dateColumn:   z.string().optional(),
  notesColumn:  z.string().optional(),
});

export type ImportLinksInput = z.infer<typeof importLinksSchema>;

export const parsedLinkRowSchema = z.object({
  originalUrl:  z.string().min(1),
  contentDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:        z.string().max(500).optional(),
  sourceRowIndex: z.number().int().nonnegative().optional(),
});

export type ParsedLinkRow = z.infer<typeof parsedLinkRowSchema>;
