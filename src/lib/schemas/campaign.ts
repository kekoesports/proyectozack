import { z } from 'zod';

export const CAMPAIGN_STATUSES = ['propuesta','negociacion','aprobada','activa','completada','cancelada','pendiente_pago','pagada'] as const;
export const CAMPAIGN_ACTION_TYPES = ['stream','video_youtube','short_reel_tiktok','tweet','story_instagram','pack_mensual','afiliacion','otro'] as const;
export const CAMPAIGN_PAYMENT_METHODS = ['banco','crypto','banco_agencia','banco_stark','crypto_agencia','crypto_zack','otro'] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type CampaignActionType = (typeof CAMPAIGN_ACTION_TYPES)[number];
export type CampaignPaymentMethod = (typeof CAMPAIGN_PAYMENT_METHODS)[number];
export type CampaignPaymentDerivedStatus = 'si' | 'no' | 'parcial';

// Labels para UI
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  aprobada: 'Aprobada',
  activa: 'Activa',
  completada: 'Completada',
  cancelada: 'Cancelada',
  pendiente_pago: 'Pendiente de pago',
  pagada: 'Pagada',
};

export const CAMPAIGN_ACTION_LABELS: Record<CampaignActionType, string> = {
  stream: 'Stream',
  video_youtube: 'Vídeo YouTube',
  short_reel_tiktok: 'Short/Reel/TikTok',
  tweet: 'Tweet',
  story_instagram: 'Historia Instagram',
  pack_mensual: 'Pack mensual',
  afiliacion: 'Afiliación',
  otro: 'Otro',
};

// Helper computeCampaignDerived (B2 — NO GENERATED columns)
export type CampaignDerived = {
  readonly commissionAmount: number;
  readonly commissionPct: number;
};

export function computeCampaignDerived(row: {
  amountBrand: string | number;
  amountTalent: string | number;
}): CampaignDerived {
  const brand = Number(row.amountBrand);
  const talent = Number(row.amountTalent);
  const commissionAmount = brand - talent;
  const commissionPct = brand > 0 ? (commissionAmount / brand) * 100 : 0;
  return { commissionAmount, commissionPct };
}

// Zod schemas
const baseCampaign = z.object({
  name: z.string().min(1).max(200),
  brandId: z.coerce.number().int().positive(),
  talentId: z.coerce.number().int().positive(),
  brandContactId: z.coerce.number().int().positive().optional(),
  responsibleUserId: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().optional(),
  ),
  assignedToUserId: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().optional(),
  ),
  actionType: z.enum(CAMPAIGN_ACTION_TYPES),
  status: z.enum(CAMPAIGN_STATUSES).default('propuesta'),
  startDate: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  endDate: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  deliveryDeadline: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  briefingUrl: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().url().optional()),
  contentUrl: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().url().optional()),
  notes: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional()),
  currency: z.enum(['EUR', 'USD']).default('EUR'),
  amountBrand: z.coerce.number().nonnegative().default(0),
  amountTalent: z.coerce.number().nonnegative().default(0),
  amountInKindTalent: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.coerce.number().nonnegative().optional(),
  ),
  amountInKindCommunity: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.coerce.number().nonnegative().optional(),
  ),
  brandPaymentMethod: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.enum(CAMPAIGN_PAYMENT_METHODS).optional(),
  ),
  talentPaymentMethod: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.enum(CAMPAIGN_PAYMENT_METHODS).optional(),
  ),
  visibility: z.enum(['team', 'private']).default('team'),
  // Estimates vs actuals
  estimatedCostAgency: z.coerce.number().nonnegative().optional(),
  estimatedMarginPct: z.coerce.number().min(0).max(100).optional(),
  // CNMC compliance checklist
  cnmcChecklistOk: z.coerce.boolean().optional().default(false),
  // Estado de pagos (Opción B — flags directos en campaña)
  cobroConfirmado: z.coerce.boolean().optional().default(false),
  pagoTalentConfirmado: z.coerce.boolean().optional().default(false),
});

export const createCampaignSchema = baseCampaign
  .refine(
    (v) => v.amountBrand === 0 || v.amountTalent <= v.amountBrand,
    { message: 'El pago al talento no puede superar el pago de la marca', path: ['amountTalent'] },
  )
  .refine(
    (v) => !v.startDate || !v.endDate || v.startDate <= v.endDate,
    { message: 'La fecha de fin no puede ser anterior a la fecha de inicio', path: ['endDate'] },
  );

export const updateCampaignSchema = baseCampaign.partial().extend({
  id: z.coerce.number().int().positive(),
});
