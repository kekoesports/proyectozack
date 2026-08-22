import { z } from 'zod';

import { CAMPAIGN_STATUSES } from '@/lib/schemas/campaign';
import { DELIVERABLE_TYPES } from '@/lib/schemas/deliverable';
import { SOCIAL_PLATFORM_VALUES } from '@/lib/schemas/talentSocials';

export const AutomationIdempotencyKey = z
  .string()
  .trim()
  .min(8)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

const OptionalDate = z
  .string()
  .date()
  .optional();

const GoogleSheetUrl = z
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.hostname === 'docs.google.com' && url.pathname.startsWith('/spreadsheets/d/');
  }, 'Debe ser una URL de Google Sheets');

const TopGeo = z.object({
  country: z.string().trim().min(2).max(80),
  pct: z.number().min(0).max(100),
});

const TopGeos = z
  .array(TopGeo)
  .max(20)
  .refine(
    (rows) => rows.reduce((sum, row) => sum + row.pct, 0) <= 100.01,
    'La suma de porcentajes GEO no puede superar 100',
  );

const BrandReference = z.union([
  z.object({ id: z.number().int().positive() }),
  z.object({
    name: z.string().trim().min(1).max(200),
    createIfMissing: z.boolean().default(true),
  }),
]);

const TalentReference = z.union([
  z.object({ id: z.number().int().positive(), topGeos: TopGeos.optional() }),
  z.object({
    name: z.string().trim().min(1).max(100),
    handle: z.string().trim().min(1).max(120),
    platform: z.enum(SOCIAL_PLATFORM_VALUES),
    country: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
    game: z.string().trim().min(1).max(100).optional(),
    topGeos: TopGeos.optional(),
    createIfMissing: z.boolean().default(true),
  }),
]);

export const AutomationDealCreate = z
  .object({
    name: z.string().trim().min(1).max(200),
    brand: BrandReference,
    talent: TalentReference,
    status: z.enum(CAMPAIGN_STATUSES).default('propuesta'),
    startDate: OptionalDate,
    endDate: OptionalDate,
    durationMonths: z.number().int().min(1).max(36).optional(),
    deliveryDeadline: OptionalDate,
    notes: z.string().trim().max(5000).optional(),
    creatorNotes: z.string().trim().max(5000).optional(),
    currency: z.enum(['EUR', 'USD']).default('EUR'),
    amountBrand: z.number().nonnegative().default(0),
    amountTalent: z.number().nonnegative().default(0),
    amountInKindTalent: z.number().nonnegative().default(0),
    amountInKindCommunity: z.number().nonnegative().default(0),
    deliverables: z
      .array(z.object({
        type: z.enum(DELIVERABLE_TYPES),
        targetCount: z.number().int().min(1).max(999),
        notes: z.string().trim().max(500).optional(),
      }))
      .min(1)
      .max(50),
    trackingSheetUrl: GoogleSheetUrl.optional(),
  })
  .refine(
    (value) => value.amountBrand === 0 || value.amountTalent <= value.amountBrand,
    { message: 'El pago al talento no puede superar el pago de la marca', path: ['amountTalent'] },
  )
  .refine(
    (value) => new Set(value.deliverables.map((row) => row.type)).size === value.deliverables.length,
    { message: 'No se puede repetir el mismo tipo de entregable', path: ['deliverables'] },
  )
  .refine(
    (value) => !value.startDate || !value.endDate || value.startDate <= value.endDate,
    { message: 'La fecha de fin no puede ser anterior a la fecha de inicio', path: ['endDate'] },
  );

export const AutomationTrackingSheetUpdate = z.object({
  trackingSheetUrl: GoogleSheetUrl,
});

export const AutomationDealAlertAcknowledgement = z.object({
  level: z.union([z.literal(70), z.literal(80), z.literal(100)]),
});

export const AutomationDealRouteId = z.coerce.number().int().positive();

export const AutomationDealDraftCreate = z.object({
  source: z.enum(['discord', 'manual', 'api']).default('discord'),
  externalId: AutomationIdempotencyKey,
  sourceUserId: z.string().trim().min(1).max(80).optional(),
  sourceChannelId: z.string().trim().min(1).max(80).optional(),
  rawText: z.string().trim().min(1).max(10000),
  proposedDeal: z.unknown().optional(),
});

const AutomationDealDraftReviewer = z.string().trim().min(1).max(100);

export const AutomationDealDraftReview = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    reviewedBy: AutomationDealDraftReviewer,
  }),
  z.object({
    action: z.literal('reject'),
    reviewedBy: AutomationDealDraftReviewer,
  }),
  z.object({
    action: z.literal('update'),
    reviewedBy: AutomationDealDraftReviewer,
    proposedDeal: z.unknown(),
  }),
]);

export type AutomationDealCreateInput = z.infer<typeof AutomationDealCreate>;
export type AutomationDealDraftCreateInput = z.infer<typeof AutomationDealDraftCreate>;
export type AutomationDealDraftReviewInput = z.infer<typeof AutomationDealDraftReview>;
export type AutomationDealAlertAcknowledgementInput = z.infer<
  typeof AutomationDealAlertAcknowledgement
>;
export type AutomationTrackingSheetUpdateInput = z.infer<typeof AutomationTrackingSheetUpdate>;
