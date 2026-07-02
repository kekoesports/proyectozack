import { z } from 'zod';

/**
 * Zod schemas de la KeyDrop Giveaway API (afiliado ZACKETIZOR).
 *
 * Base: https://ws-2071.socket-cs.com/v1/giveaway-user
 * Endpoints: GET /api/list, GET /api/giveaway/:idGiveaway
 *
 * Los shapes vienen del probe diagnóstico real (2026-07). Se preservan
 * los typos upstream (`duractionSeconds`, `fullfilled`) — se corrigen
 * solo al mapear a nuestra shape interna en `mappers.ts`.
 *
 * Sin `.strict()` — la API puede añadir campos y no queremos romper.
 * Los campos opcionales cubren variaciones entre `active` y `finished`.
 */

export const KeydropOrganizerSchema = z.object({
  idSteam: z.string(),
  username: z.string(),
  steamAvatar: z.string(),
  promocode: z.string(),
});

export const KeydropPrizeSchema = z.object({
  id: z.number(),
  color: z.string(),
  itemImg: z.string(),        // URL — cdnkd.com
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  price: z.number(),
  condition: z.string(),
  weaponType: z.string(),
  currency: z.string(),
});

export const KeydropWinnerSchema = z.object({
  idSteam: z.string(),
  username: z.string(),
  steamAvatar: z.string(),
  prizeId: z.number(),
});

/**
 * Requirement individual. `fullfilled` es typo upstream — se preserva
 * en el schema y se corrige en el mapper interno como `fulfilled`.
 */
export const KeydropRequirementSchema = z.object({
  type: z.string(),           // 'PROMO_CODE_USAGE' | ...
  promoCode: z.string().optional(),
  refillAmount: z.number().optional(),
  missingRefillAmount: z.number().optional(),
  fullfilled: z.boolean().optional(),   // sic — typo upstream preservado
  currency: z.string().optional(),
});

export const KeydropStatusSchema = z.enum(['new', 'started', 'ended']);
export type KeydropStatus = z.infer<typeof KeydropStatusSchema>;

/**
 * Item del array `data.active[]` o `data.finished[]`.
 * Los campos opcionales cubren variaciones entre buckets.
 */
export const KeydropListItemSchema = z.object({
  id: z.string(),
  hot: z.number().nullable().optional(),
  boost: z.unknown().nullable().optional(),
  status: z.string(),                    // se valida contra KeydropStatusSchema en el mapper
  maxUsers: z.number(),
  minUsers: z.number(),
  duractionSeconds: z.number(),          // sic — typo upstream preservado
  totalPrizes: z.number().optional(),    // solo en active
  organizer: KeydropOrganizerSchema,
  depositAmountRequired: z.number(),
  depositAmountRequiredUSD: z.number().optional(),
  depositAmountRequiredCurrency: z.string(),
  createdAt: z.number(),                 // unix ms
  deadlineTimestamp: z.number().nullable(),
  prize: z.number().optional(),          // índice interno, no usado en UI
  prizes: z.array(KeydropPrizeSchema),
  participantCount: z.number(),
  haveIJoined: z.boolean().optional(),
  mySlot: z.unknown().nullable().optional(),
  chance: z.number().optional(),
  publicHash: z.string().optional(),     // solo finished
  winners: z.array(KeydropWinnerSchema).optional(),  // solo finished
  startDate: z.number().nullable().optional(),
});
export type KeydropListItem = z.infer<typeof KeydropListItemSchema>;

/** Response de GET /api/list. */
export const KeydropListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    active: z.array(KeydropListItemSchema),
    finished: z.array(KeydropListItemSchema),
  }),
});
export type KeydropListResponse = z.infer<typeof KeydropListResponseSchema>;

/** Response de GET /api/giveaway/:id — item + campos extra. */
export const KeydropDetailResponseSchema = z.object({
  success: z.boolean(),
  data: KeydropListItemSchema.extend({
    entryPercentile: z.number().optional(),
    entryLevel: z.number().optional(),
    mySteamId: z.string().nullable().optional(),
    myJoinCount: z.number().optional(),
    missingRefillAmount: z.number().optional(),
    canIJoin: z.boolean().optional(),
    participants: z.array(z.unknown()).optional(),
    // requirements viene como objeto con claves numéricas '0', '1', ...
    requirements: z.record(z.string(), KeydropRequirementSchema).optional(),
  }),
});
export type KeydropDetailResponse = z.infer<typeof KeydropDetailResponseSchema>;

/**
 * Shape interna limpia — lo que el mapper produce y la UI consume.
 * Currency y typos corregidos, promoCode / externalUrl derivados.
 */
export interface KeydropCard {
  id: string;
  source: 'keydrop';
  title: string;
  subtitle: string | null;
  imageUrl: string;
  imageAlt: string;
  totalValue: number;
  currency: string;
  depositRequired: number;
  depositCurrency: string;
  participantCount: number;
  maxUsers: number;
  minUsers: number;
  status: KeydropStatus | 'unknown';
  createdAt: Date;
  deadlineTimestamp: Date | null;
  promoCode: string;
  externalUrl: string;
  prizeCount: number;
  /** Ganadores solo aparecen en finalizados. */
  winners: Array<{ steamId: string; username: string; avatarUrl: string; prizeId: number }>;
  /** Debug/audit; nunca renderizar directamente. */
  requirements: Array<{
    type: string;
    promoCode: string | undefined;
    refillAmount: number | undefined;
    fulfilled: boolean | undefined;
    currency: string | undefined;
  }>;
}

/**
 * Shape agregada usada por la UI: dos buckets ya mapeados +
 * status del fetch para distinguir entre "no configurado" / "error" / "ok".
 */
export interface KeydropSections {
  active: KeydropCard[];
  finished: KeydropCard[];
  status: 'ok' | 'not_configured' | 'error';
}
