import { z } from 'zod';

export const DELIVERABLE_STATUSES = [
  'pending_submission',
  'submitted',
  'internal_review',
  'brand_review',
  'approved',
  'revision_requested',
  'rejected',
] as const;

export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  pending_submission: 'Pendiente de entrega',
  submitted: 'Entregado',
  internal_review: 'Revisión interna',
  brand_review: 'Revisión de marca',
  approved: 'Aprobado',
  revision_requested: 'Revisión solicitada',
  rejected: 'Rechazado',
};

export const DELIVERABLE_STATUS_COLORS: Record<DeliverableStatus, string> = {
  pending_submission: 'bg-sp-admin-muted/20 text-sp-admin-muted',
  submitted: 'bg-blue-500/20 text-blue-400',
  internal_review: 'bg-purple-500/20 text-purple-400',
  brand_review: 'bg-amber-500/20 text-amber-400',
  approved: 'bg-emerald-500/20 text-emerald-400',
  revision_requested: 'bg-orange-500/20 text-orange-400',
  rejected: 'bg-red-500/20 text-red-400',
};

export const DELIVERABLE_TYPES = [
  'stream_integration',
  'video_youtube',
  'short_reel_tiktok',
  'story_instagram',
  'tweet_x',
  'post_instagram',
  'pack_mensual',
  'pack_trimestral',
  'otro',
] as const;

export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const DELIVERABLE_TYPE_LABELS: Record<DeliverableType, string> = {
  stream_integration: 'Integración stream',
  video_youtube: 'Vídeo YouTube',
  short_reel_tiktok: 'Short / Reel / TikTok',
  story_instagram: 'Historia Instagram',
  tweet_x: 'Tweet / Post X',
  post_instagram: 'Post Instagram',
  pack_mensual: 'Pack mensual',
  pack_trimestral: 'Pack trimestral',
  otro: 'Otro',
};

// Status transitions allowed per role
export const ALLOWED_TRANSITIONS: Record<DeliverableStatus, readonly DeliverableStatus[]> = {
  pending_submission: ['submitted'],
  submitted: ['internal_review', 'revision_requested'],
  internal_review: ['brand_review', 'revision_requested'],
  brand_review: ['approved', 'revision_requested', 'rejected'],
  approved: [],
  revision_requested: ['submitted'],
  rejected: [],
};

const optStr = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().max(max).optional(),
  );

export const createDeliverableSchema = z.object({
  campaignId: z.coerce.number().int().positive(),
  talentId: z.coerce.number().int().positive(),
  title: z.string().min(1).max(200),
  type: z.enum(DELIVERABLE_TYPES),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  contentUrl: z.string().url().optional().or(z.literal('')),
});

export const updateDeliverableStatusSchema = z.object({
  deliverableId: z.coerce.number().int().positive(),
  status: z.enum(DELIVERABLE_STATUSES),
  comment: z.string().optional(),
  contentUrl: z.string().url().optional().or(z.literal('')),
  revisionNotes: optStr(2000),
});

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableStatusInput = z.infer<typeof updateDeliverableStatusSchema>;
