import { z } from 'zod';

const optStr = (max: number) =>
  z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().max(max).optional());

const optUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.url().optional(),
);

const optEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.email().max(180).optional(),
);

export const CRM_BRAND_STATUSES = [
  'lead',
  'contactada',
  'en_negociacion',
  'activa',
  'pausada',
  'cerrada',
  'no_interesa',
  'archivada',
] as const;
export type CrmBrandStatus = (typeof CRM_BRAND_STATUSES)[number];

export const CRM_BRAND_TIPOS = ['agencia', 'marca'] as const;

export const CRM_BRAND_SECTORES = [
  'cs2_cases',
  'cs2_marketplace',
  'casino',
  'apuestas',
  'perifericos',
  'crypto',
  'fmcg',
  'tech',
  'gaming_brands',
  'otros',
] as const;

export const SECTOR_LABELS: Record<(typeof CRM_BRAND_SECTORES)[number], string> = {
  cs2_cases: 'CS2 Cases',
  cs2_marketplace: 'Marketplace CS2',
  casino: 'Casino',
  apuestas: 'Casas de apuesta',
  perifericos: 'Periféricos',
  crypto: 'Crypto',
  fmcg: 'FMCG',
  tech: 'Tech',
  gaming_brands: 'Gaming brands',
  otros: 'Otros',
};

export const CRM_BRAND_GEOS = [
  'spain',
  'latam',
  'europa',
  'turquia',
  'india',
  'japon',
  'global',
  'otros',
] as const;

export const GEO_LABELS: Record<(typeof CRM_BRAND_GEOS)[number], string> = {
  spain: 'Spain',
  latam: 'LATAM',
  europa: 'Europa',
  turquia: 'Turquía',
  india: 'India',
  japon: 'Japón',
  global: 'Global',
  otros: 'Otros',
};

export const CRM_FOLLOWUP_CHANNELS = [
  'email',
  'telegram',
  'discord',
  'whatsapp',
  'reunion',
  'llamada',
  'otro',
] as const;

export const CRM_FOLLOWUP_STATUSES = ['pendiente', 'hecho', 'vencido'] as const;

export type CrmBrandTipo = (typeof CRM_BRAND_TIPOS)[number];
export type CrmBrandSector = (typeof CRM_BRAND_SECTORES)[number];
export type CrmBrandGeo = (typeof CRM_BRAND_GEOS)[number];
export type CrmFollowupChannel = (typeof CRM_FOLLOWUP_CHANNELS)[number];
export type CrmFollowupStatus = (typeof CRM_FOLLOWUP_STATUSES)[number];

// Tipo derivado al cargar marca, NO columna en DB
export type BrandFollowupDerivedStatus = 'sin_followup' | 'pendiente' | 'hoy' | 'vencido';

const optEnum = <T extends string>(values: readonly [T, ...T[]]) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.enum(values).optional(),
  );

// Rate card tier keys
export const BRAND_TALENT_TIERS = ['nano', 'micro', 'macro', 'mega'] as const;
export type BrandTalentTier = (typeof BRAND_TALENT_TIERS)[number];

const brandFields = z.object({
  name: z.string().min(1).max(200),
  legalName: optStr(250),
  website: optUrl,
  tipo: optEnum(CRM_BRAND_TIPOS),
  sector: optEnum(CRM_BRAND_SECTORES),
  geo: optEnum(CRM_BRAND_GEOS),
  country: optStr(2),
  status: z.enum(CRM_BRAND_STATUSES).default('lead'),
  ownerUserId: optStr(100),
  portalUserId: optStr(100),
  createdByUserId: optStr(100),
  assignedToUserId: optStr(100),
  lastContactAt: z.string().optional(),
  nextFollowupAt: z.string().optional(),
  notes: z.string().optional(),
  // Rate cards & workspace defaults
  defaultRateCard: z.object({
    nano: z.coerce.number().nonnegative().optional(),
    micro: z.coerce.number().nonnegative().optional(),
    macro: z.coerce.number().nonnegative().optional(),
    mega: z.coerce.number().nonnegative().optional(),
  }).optional(),
  agencyFeePct: z.coerce.number().min(0).max(100).optional(),
  paymentTermsDays: z.coerce.number().int().nonnegative().optional(),
  billingEmail: optEmail,
  nif: optStr(30),
  fiscalName: optStr(250),
});

export const createCrmBrandSchema = brandFields;
export const updateCrmBrandSchema = brandFields.partial().extend({
  id: z.coerce.number().int().positive(),
});

export type CreateCrmBrandInput = z.infer<typeof createCrmBrandSchema>;
export type UpdateCrmBrandInput = z.infer<typeof updateCrmBrandSchema>;

const contactFields = z.object({
  brandId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(150),
  role: optStr(100),
  email: optEmail,
  phone: optStr(40),
  telegram: optStr(80),
  discord: optStr(80),
  whatsapp: optStr(40),
  linkedin: optStr(200),
  country: optStr(2),
  notes: z.string().optional(),
  isPrimary: z.coerce.boolean().optional().default(false),
});

export const createBrandContactSchema = contactFields;
export const updateBrandContactSchema = contactFields.partial().extend({
  id: z.coerce.number().int().positive(),
});

export type CreateBrandContactInput = z.infer<typeof createBrandContactSchema>;
export type UpdateBrandContactInput = z.infer<typeof updateBrandContactSchema>;

export const createFollowupSchema = z.object({
  brandId: z.coerce.number().int().positive(),
  scheduledAt: z.string().min(1),
  note: z.string().min(1).max(1000),
  channel: z.enum(CRM_FOLLOWUP_CHANNELS).optional(),
  summary: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionAt: z.string().optional(),
  status: z.enum(CRM_FOLLOWUP_STATUSES).default('pendiente'),
  assignedToUserId: optStr(100),
  responsibleUserId: optStr(100),
});

export const updateFollowupSchema = createFollowupSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

export const completeFollowupSchema = z.object({
  id: z.coerce.number().int().positive(),
  brandId: z.coerce.number().int().positive(),
});

export const deleteFollowupSchema = z.object({
  id: z.coerce.number().int().positive(),
  brandId: z.coerce.number().int().positive(),
});

export type CreateFollowupInput = z.infer<typeof createFollowupSchema>;
export type UpdateFollowupInput = z.infer<typeof updateFollowupSchema>;
