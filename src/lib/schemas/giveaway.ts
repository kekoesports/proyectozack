import { z } from 'zod';
import { IdSchema } from '@/lib/schemas/common';

export const BADGE_VALUES = ['HOT', 'NUEVO', 'EXCLUSIVO', 'TOP', 'LIMITED'] as const;
export type BadgeValue = (typeof BADGE_VALUES)[number];
export const BadgeSchema = z.enum(BADGE_VALUES);
export const BadgeNullableSchema = BadgeSchema.nullable();

// Zod v4 acepta javascript: y data: como URLs válidas por spec.
// Este refinement garantiza que solo se acepten http/https para redirect URLs
// que se almacenan en DB y sirven a usuarios finales.
const safeRedirectUrl = (label = 'redirectUrl inválido') =>
  z.url(label).max(2048).refine(
    (u) => u.startsWith('https://') || u.startsWith('http://'),
    { message: 'Solo se permiten URLs http/https' },
  );

const giveawayFields = z.object({
  talentId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  imageUrl: z.url().max(500).optional(),
  brandName: z.string().min(1).max(150),
  brandLogo: z.url().max(500).optional(),
  value: z.string().max(50).optional(),
  redirectUrl: z.url(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  sortOrder: z.number().int().default(0),
});

export const createGiveawaySchema = giveawayFields.refine((d) => d.startsAt < d.endsAt, {
  message: 'starts_at must be before ends_at',
  path: ['endsAt'],
});

export const updateGiveawaySchema = giveawayFields.partial();

export type CreateGiveawayInput = z.infer<typeof createGiveawaySchema>;
export type UpdateGiveawayInput = z.infer<typeof updateGiveawaySchema>;

const emptyStringToUndef = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    inner.optional(),
  );

const checkboxOn = z.preprocess(
  (v) => v === 'on' || v === 'true' || v === true,
  z.boolean(),
);

export const CreateCodeFormSchema = z.object({
  talentId:    IdSchema,
  talentSlug:  emptyStringToUndef(z.string().max(150)),
  code:        z.string().trim().min(1, 'Código obligatorio').max(100),
  brandName:   z.string().trim().min(1, 'Marca obligatoria').max(150),
  brandLogo:   emptyStringToUndef(z.url().max(500)),
  redirectUrl: safeRedirectUrl(),
  description: emptyStringToUndef(z.string().max(300)),
  badge:       emptyStringToUndef(BadgeSchema),
  isFeatured:  checkboxOn,
  category:    emptyStringToUndef(z.string().max(50)),
  ctaText:     emptyStringToUndef(z.string().max(100)),
  crmBrandId:  emptyStringToUndef(z.coerce.number().int().positive()),
});
export type CreateCodeFormInput = z.infer<typeof CreateCodeFormSchema>;

export const UpdateCodeFormSchema = z.object({
  id:          IdSchema,
  talentId:    IdSchema,
  talentSlug:  emptyStringToUndef(z.string().max(150)),
  code:        z.string().trim().min(1, 'Código obligatorio').max(100),
  brandName:   z.string().trim().min(1, 'Marca obligatoria').max(150),
  brandLogo:   emptyStringToUndef(z.url().max(500)),
  redirectUrl: safeRedirectUrl(),
  description: emptyStringToUndef(z.string().max(300)),
  badge:       emptyStringToUndef(BadgeSchema),
  isFeatured:  checkboxOn,
  category:    emptyStringToUndef(z.string().max(50)),
  ctaText:     emptyStringToUndef(z.string().max(100)),
  crmBrandId:  emptyStringToUndef(z.coerce.number().int().positive()),
});
export type UpdateCodeFormInput = z.infer<typeof UpdateCodeFormSchema>;

export const CreateWinnerFormSchema = z.object({
  giveawayId: IdSchema,
  winnerName: z.string().trim().min(1, 'Nombre obligatorio').max(100),
  winnerAvatar: emptyStringToUndef(z.url().max(500)),
});
export type CreateWinnerFormInput = z.infer<typeof CreateWinnerFormSchema>;

export const DeleteByIdSchema = z.object({
  id:         IdSchema,
  talentSlug: emptyStringToUndef(z.string().max(150)),
});

export const DeleteGiveawaySchema = z.object({
  id: IdSchema,
  talentSlug: emptyStringToUndef(z.string().max(150)),
});

export const CreateGiveawayFormSchema = z
  .object({
    talentId:    IdSchema,
    title:       z.string().trim().min(1, 'Título obligatorio').max(200),
    description: emptyStringToUndef(z.string().max(500)),
    imageUrl:    emptyStringToUndef(z.url().max(500)),
    brandName:   z.string().trim().min(1, 'Marca obligatoria').max(150),
    brandLogo:   emptyStringToUndef(z.url().max(500)),
    value:       emptyStringToUndef(z.string().max(50)),
    redirectUrl: safeRedirectUrl(),
    talentSlug:  emptyStringToUndef(z.string().max(150)),
    startsAt:    z.coerce.date(),
    endsAt:      z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.coerce.date().optional(),
    ),
    sortOrder:   z.coerce.number().int().default(0),
    crmBrandId:  emptyStringToUndef(z.coerce.number().int().positive()),
  })
  .refine((d) => !d.endsAt || d.startsAt < d.endsAt, {
    message: 'La fecha de fin debe ser posterior al inicio',
    path: ['endsAt'],
  });
export type CreateGiveawayFormInput = z.infer<typeof CreateGiveawayFormSchema>;

export const UpdateGiveawayFormSchema = z
  .object({
    id:          IdSchema,
    talentId:    IdSchema,
    talentSlug:  emptyStringToUndef(z.string().max(150)),
    title:       z.string().trim().min(1, 'Título obligatorio').max(200),
    description: emptyStringToUndef(z.string().max(500)),
    imageUrl:    emptyStringToUndef(z.url().max(500)),
    brandName:   z.string().trim().min(1, 'Marca obligatoria').max(150),
    brandLogo:   emptyStringToUndef(z.url().max(500)),
    value:       emptyStringToUndef(z.string().max(50)),
    redirectUrl: safeRedirectUrl(),
    startsAt:    z.coerce.date(),
    endsAt:      z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.coerce.date().optional(),
    ),
    sortOrder:   z.coerce.number().int().default(0),
    crmBrandId:  emptyStringToUndef(z.coerce.number().int().positive()),
  })
  .refine((d) => !d.endsAt || d.startsAt < d.endsAt, {
    message: 'La fecha de fin debe ser posterior al inicio',
    path: ['endsAt'],
  });
export type UpdateGiveawayFormInput = z.infer<typeof UpdateGiveawayFormSchema>;
