import { z } from 'zod';
import { IdSchema } from '@/lib/schemas/common';

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
  talentId: IdSchema,
  code: z.string().trim().min(1, 'Código obligatorio').max(100),
  brandName: z.string().trim().min(1, 'Marca obligatoria').max(150),
  brandLogo: emptyStringToUndef(z.url().max(500)),
  redirectUrl: z.url('redirectUrl inválido').max(2048),
  description: emptyStringToUndef(z.string().max(300)),
  badge: emptyStringToUndef(z.string().max(50)),
  isFeatured: checkboxOn,
  category: emptyStringToUndef(z.string().max(50)),
  ctaText: emptyStringToUndef(z.string().max(100)),
});
export type CreateCodeFormInput = z.infer<typeof CreateCodeFormSchema>;

export const UpdateCodeFormSchema = z.object({
  id:          IdSchema,
  talentId:    IdSchema,
  code:        z.string().trim().min(1, 'Código obligatorio').max(100),
  brandName:   z.string().trim().min(1, 'Marca obligatoria').max(150),
  brandLogo:   emptyStringToUndef(z.url().max(500)),
  redirectUrl: z.url('redirectUrl inválido').max(2048),
  description: emptyStringToUndef(z.string().max(300)),
  badge:       emptyStringToUndef(z.string().max(50)),
  isFeatured:  checkboxOn,
  category:    emptyStringToUndef(z.string().max(50)),
  ctaText:     emptyStringToUndef(z.string().max(100)),
});
export type UpdateCodeFormInput = z.infer<typeof UpdateCodeFormSchema>;

export const CreateWinnerFormSchema = z.object({
  giveawayId: IdSchema,
  winnerName: z.string().trim().min(1, 'Nombre obligatorio').max(100),
  winnerAvatar: emptyStringToUndef(z.url().max(500)),
});
export type CreateWinnerFormInput = z.infer<typeof CreateWinnerFormSchema>;

export const DeleteByIdSchema = z.object({ id: IdSchema });

export const DeleteGiveawaySchema = z.object({
  id: IdSchema,
  talentSlug: emptyStringToUndef(z.string().max(150)),
});

export const CreateGiveawayFormSchema = z
  .object({
    talentId: IdSchema,
    title: z.string().trim().min(1, 'Título obligatorio').max(200),
    description: emptyStringToUndef(z.string().max(500)),
    imageUrl: emptyStringToUndef(z.url().max(500)),
    brandName: z.string().trim().min(1, 'Marca obligatoria').max(150),
    brandLogo: emptyStringToUndef(z.url().max(500)),
    value: emptyStringToUndef(z.string().max(50)),
    redirectUrl: z.url('redirectUrl inválido').max(2048),
    talentSlug: emptyStringToUndef(z.string().max(150)),
    startsAt: z.coerce.date(),
    endsAt: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.coerce.date().optional(),
    ),
    sortOrder: z.coerce.number().int().default(0),
  })
  .refine((d) => !d.endsAt || d.startsAt < d.endsAt, {
    message: 'La fecha de fin debe ser posterior al inicio',
    path: ['endsAt'],
  });
export type CreateGiveawayFormInput = z.infer<typeof CreateGiveawayFormSchema>;
