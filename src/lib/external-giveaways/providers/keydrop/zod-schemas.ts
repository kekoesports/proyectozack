import { z } from 'zod';

/**
 * Zod schemas de la KeyDrop Giveaway API (afiliado ZACKETIZOR).
 *
 * Base: https://ws-2071.socket-cs.com/v1/giveaway-user
 * Endpoints:
 *   - GET /api/list (usado)
 *   - GET /api/giveaway/:idGiveaway (existe: 401 sin key; sin diagnóstico
 *     completo de shape porque la key vive solo en Vercel Production —
 *     ver docs/keydrop-single-giveaway-endpoint.md)
 *
 * Los shapes vienen del probe diagnóstico real (2026-07). Se preservan
 * los typos upstream (`duractionSeconds`, `fullfilled`) — se corrigen
 * solo al mapear a la shape común interna `ExternalGiveawayCard`.
 *
 * Sin `.strict()` — la API puede añadir campos y no queremos romper.
 * Los campos opcionales cubren variaciones entre `active` y `finished`.
 */

export const KeydropOrganizerSchema = z.object({
  idSteam: z.string(),
  username: z.string(),
  steamAvatar: z.string().url(),
  promocode: z.string(),
});

export const KeydropPrizeSchema = z.object({
  id: z.number().nonnegative(),
  color: z.string(),
  itemImg: z.string().url(),        // URL — cdnkd.com
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  price: z.number().nonnegative(),
  condition: z.string(),
  weaponType: z.string(),
  currency: z.string(),
});

export const KeydropWinnerSchema = z.object({
  idSteam: z.string(),
  username: z.string(),
  steamAvatar: z.string().url(),
  prizeId: z.number().nonnegative(),
});

/**
 * Requirement individual. `fullfilled` es typo upstream — se preserva
 * en el schema y se corrige en el mapper como `fulfilled`.
 */
export const KeydropRequirementSchema = z.object({
  type: z.string(),
  promoCode: z.string().optional(),
  refillAmount: z.number().nonnegative().optional(),
  missingRefillAmount: z.number().nonnegative().optional(),
  fullfilled: z.boolean().optional(),   // sic — typo upstream preservado
  currency: z.string().optional(),
});

export const KeydropStatusSchema = z.enum(['new', 'started', 'ended']);
export type KeydropStatus = z.infer<typeof KeydropStatusSchema>;

/** Item del array `data.active[]` o `data.finished[]`. */
export const KeydropListItemSchema = z.object({
  id: z.string(),
  hot: z.number().nonnegative().nullable().optional(),
  boost: z.unknown().nullable().optional(),
  // El proveedor ha introducido estados transitorios fuera del set público;
  // el mapper los trata como desconocidos sin convertirlos en activos.
  status: z.string().min(1),
  maxUsers: z.number().int().nonnegative(),
  minUsers: z.number().int().nonnegative(),
  duractionSeconds: z.number().int().nonnegative(),          // sic — typo upstream preservado
  totalPrizes: z.number().nonnegative().optional(),
  organizer: KeydropOrganizerSchema,
  depositAmountRequired: z.number().nonnegative(),
  depositAmountRequiredUSD: z.number().nonnegative().optional(),
  depositAmountRequiredCurrency: z.string(),
  createdAt: z.number().nonnegative(),
  deadlineTimestamp: z.number().nonnegative().nullable(),
  prize: z.number().nonnegative().optional(),
  prizes: z.array(KeydropPrizeSchema),
  participantCount: z.number().int().nonnegative(),
  haveIJoined: z.boolean().optional(),
  mySlot: z.unknown().nullable().optional(),
  chance: z.number().nonnegative().optional(),
  publicHash: z.string().optional(),
  winners: z.array(KeydropWinnerSchema).optional(),
  startDate: z.number().nonnegative().nullable().optional(),
  requirements: z.record(z.string(), KeydropRequirementSchema).optional(),
});
export type KeydropListItem = z.infer<typeof KeydropListItemSchema>;
export type KeydropRequirement = z.infer<typeof KeydropRequirementSchema>;

/** Response de GET /api/list. */
export const KeydropListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    active: z.array(KeydropListItemSchema),
    finished: z.array(KeydropListItemSchema),
  }),
});
export type KeydropListResponse = z.infer<typeof KeydropListResponseSchema>;
