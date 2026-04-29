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
  'contactado',
  'en_negociacion',
  'propuesta_enviada',
  'activa',
  'inactiva',
  'perdida',
  'pausada',
  'archivada',
] as const;
export type CrmBrandStatus = (typeof CRM_BRAND_STATUSES)[number];

export const CRM_BRAND_TIPOS    = ['agencia', 'marca'] as const;
export const CRM_BRAND_SECTORES = ['cs2_cases', 'cs2_marketplace', 'casino', 'apuestas', 'perifericos', 'otros'] as const;
export const CRM_BRAND_GEOS     = ['latam', 'spain', 'europa', 'global', 'otros'] as const;

export type CrmBrandTipo    = (typeof CRM_BRAND_TIPOS)[number];
export type CrmBrandSector  = (typeof CRM_BRAND_SECTORES)[number];
export type CrmBrandGeo     = (typeof CRM_BRAND_GEOS)[number];

export const SECTOR_LABELS: Record<CrmBrandSector, string> = {
  cs2_cases:       'CS2 Cases',
  cs2_marketplace: 'Marketplace CS2',
  casino:          'Casino',
  apuestas:        'Casas de apuesta',
  perifericos:     'Periféricos',
  otros:           'Otros',
};

export const GEO_LABELS: Record<CrmBrandGeo, string> = {
  latam:  'LATAM',
  spain:  'Spain',
  europa: 'Europa',
  global: 'Global',
  otros:  'Otros',
};

export const LOOKING_FOR_OPTIONS = [
  { value: 'trafico_latam',  label: 'Tráfico LATAM'  },
  { value: 'trafico_spain',  label: 'Tráfico España'  },
  { value: 'twitch',         label: 'Twitch'          },
  { value: 'youtube',        label: 'YouTube'         },
  { value: 'instagram',      label: 'Instagram'       },
  { value: 'kick',           label: 'Kick'            },
  { value: 'otros',          label: 'Otros'           },
] as const;

export const DEAL_TYPE_OPTIONS = [
  { value: 'cpa',       label: 'CPA'           },
  { value: 'revshare',  label: 'Revenue Share' },
  { value: 'pago_fijo', label: 'Pago fijo'     },
  { value: 'hibrido',   label: 'Híbrido'       },
] as const;

const optEnum = <T extends string>(values: readonly [T, ...T[]]) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.enum(values).optional(),
  );

const brandFields = z.object({
  name:         z.string().min(1).max(200),
  legalName:    optStr(250),
  website:      optUrl,
  tipo:         optEnum(CRM_BRAND_TIPOS),
  sector:       optEnum(CRM_BRAND_SECTORES),
  geo:          optEnum(CRM_BRAND_GEOS),
  country:      optStr(50),
  status:       z.enum(CRM_BRAND_STATUSES).default('lead'),
  ownerUserId:  optStr(100),
  portalUserId: optStr(100),

  // Nuevos campos
  geoTargets:  optStr(500),
  lookingFor:  optStr(500),
  dealTypes:   optStr(200),
  taxId:       optStr(30),
  address:     z.string().optional(),

  notes: z.string().optional(),
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
