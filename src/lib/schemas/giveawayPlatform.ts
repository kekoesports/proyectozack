import { z } from 'zod';

/** Validaciones de frontera para las server actions de la plataforma de sorteos (ADR-0001: safeParse en fronteras). */

export const participateSchema = z.object({
  giveawayId: z.coerce.number().int().positive(),
});

export const redeemSchema = z.object({
  shopItemId: z.coerce.number().int().positive(),
});

export const tradeUrlSchema = z.object({
  tradeUrl: z
    .string()
    .url()
    .max(500)
    .refine((v) => v.startsWith('https://steamcommunity.com/tradeoffer/new/'), {
      message: 'Debe ser una Steam Trade URL válida',
    }),
});

export const privacySchema = z.object({
  isPrivate: z.coerce.boolean(),
});

export const shippingAddressSchema = z.object({
  address: z.string().min(10).max(600),
});
