import { z } from 'zod';

export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const NumericIdParam = z.object({ id: z.coerce.number().int().positive() });
export const UuidIdParam = z.object({ id: z.string().uuid() });

export const LookupQuery = z.object({
  entityType: z.enum(['brand', 'campaign', 'talent', 'contact']),
  id: z.coerce.number().int().positive(),
});

export const SearchQuery = PaginationQuery.extend({
  q: z.string().trim().min(2).max(200),
});

export const ActivityListQuery = PaginationQuery.extend({
  entityType: z.string().trim().min(1).max(40).optional(),
  entityId: z.string().trim().min(1).max(100).optional(),
  brandId: z.coerce.number().int().positive().optional(),
  campaignId: z.coerce.number().int().positive().optional(),
});

export const ActivityCreate = z.object({
  entityType: z.string().trim().min(1).max(40),
  entityId: z.string().trim().min(1).max(100),
  activityType: z.string().trim().min(1).max(80),
  channel: z.enum(['email', 'telegram', 'discord', 'whatsapp', 'phone', 'meeting', 'system', 'other']),
  direction: z.enum(['inbound', 'outbound', 'internal']),
  summary: z.string().trim().min(1).max(500),
  detail: z.string().max(20_000).optional(),
  source: z.string().trim().min(1).max(50).default('n8n'),
  externalId: z.string().trim().min(1).max(200).optional(),
  brandId: z.number().int().positive().optional(),
  campaignId: z.number().int().positive().optional(),
  talentId: z.number().int().positive().optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const FollowupListQuery = PaginationQuery.extend({
  brandId: z.coerce.number().int().positive().optional(),
  status: z.enum(['pendiente', 'hecho', 'vencido']).optional(),
  dueBefore: z.string().datetime({ offset: true }).optional(),
});

export const FollowupPatch = z.object({
  status: z.enum(['pendiente', 'hecho', 'vencido']).optional(),
  summary: z.string().trim().max(2_000).nullable().optional(),
  nextAction: z.string().trim().max(2_000).nullable().optional(),
  nextActionAt: z.string().datetime({ offset: true }).nullable().optional(),
  completedAt: z.string().datetime({ offset: true }).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const TaskListQuery = PaginationQuery.extend({
  status: z.enum(['pendiente', 'en_progreso', 'completada']).optional(),
  relatedType: z.enum(['brand', 'talent', 'campaign', 'invoice', 'general']).optional(),
  relatedId: z.coerce.number().int().positive().optional(),
  dueBefore: z.string().date().optional(),
});

export const TaskPatch = z.object({
  status: z.enum(['pendiente', 'en_progreso', 'completada']).optional(),
  dueDate: z.string().date().nullable().optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
  priority: z.enum(['alta', 'media', 'baja']).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const TaskCreate = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).optional(),
  ownerId: z.string().trim().min(1).max(128),
  assignedToUserId: z.string().trim().min(1).max(128).nullable().optional(),
  dueDate: z.string().date().optional(),
  priority: z.enum(['alta', 'media', 'baja']).default('media'),
  category: z.string().trim().min(1).max(40).default('automation'),
  relatedType: z.enum(['brand', 'talent', 'campaign', 'invoice', 'general']).optional(),
  relatedId: z.number().int().positive().optional(),
  automationKey: z.string().trim().min(8).max(200).optional(),
}).refine(
  (value) => (value.relatedType === undefined) === (value.relatedId === undefined),
  { message: 'relatedType and relatedId must be supplied together' },
);

export const CampaignAutomationPatch = z.object({
  briefingUrl: z.string().url().max(2_000).nullable().optional(),
  contentUrl: z.string().url().max(2_000).nullable().optional(),
  trackingSheetUrl: z.string().url().max(2_000).nullable().optional(),
  trackingSheetSpreadsheetId: z.string().trim().min(10).max(100).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const DraftListQuery = PaginationQuery.extend({
  status: z.enum(['pending_approval', 'approved', 'rejected', 'sending', 'sent', 'failed']).optional(),
  channel: z.enum(['email', 'telegram', 'discord', 'whatsapp', 'phone', 'meeting', 'system', 'other']).optional(),
});

export const DraftCreate = z.object({
  channel: z.enum(['email', 'telegram', 'discord', 'whatsapp']),
  purpose: z.string().trim().min(1).max(80),
  recipient: z.string().trim().min(1).max(320),
  subject: z.string().trim().max(500).optional(),
  body: z.string().trim().min(1).max(30_000),
  model: z.string().trim().max(100).optional(),
  automationKey: z.string().trim().min(8).max(200).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  brandId: z.number().int().positive().optional(),
  campaignId: z.number().int().positive().optional(),
  talentId: z.number().int().positive().optional(),
  sourceActivityId: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const DraftProviderPatch = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('sent'),
    providerMessageId: z.string().trim().min(1).max(200),
    sentAt: z.string().datetime({ offset: true }).optional(),
  }),
  z.object({
    status: z.literal('failed'),
    failureCode: z.string().trim().min(1).max(80),
  }),
]);

export const DraftReview = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(2_000).optional(),
});

export const DeliverableListQuery = PaginationQuery.extend({
  campaignId: z.coerce.number().int().positive().optional(),
  status: z.enum([
    'pending_submission', 'submitted', 'internal_review', 'brand_review',
    'approved', 'revision_requested', 'rejected',
  ]).optional(),
  dueBefore: z.string().datetime({ offset: true }).optional(),
});

export const RiskListQuery = PaginationQuery.extend({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export type ActivityCreate = z.infer<typeof ActivityCreate>;
export type FollowupPatch = z.infer<typeof FollowupPatch>;
export type TaskPatch = z.infer<typeof TaskPatch>;
export type TaskCreate = z.infer<typeof TaskCreate>;
export type CampaignAutomationPatch = z.infer<typeof CampaignAutomationPatch>;
export type DraftCreate = z.infer<typeof DraftCreate>;
export type DraftProviderPatch = z.infer<typeof DraftProviderPatch>;
export type DraftReview = z.infer<typeof DraftReview>;
