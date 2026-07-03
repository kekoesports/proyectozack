/**
 * Tipos comunes de la integración multi-provider de sorteos externos.
 *
 * Un "external giveaway" es cualquier sorteo cuyo estado, participantes y
 * ganadores viven fuera de nuestra DB (KeyDrop, CSGORoll, Hellcase, etc.).
 * SocialPro Giveaways los agrega visualmente para cada creador según su
 * binding en `creator-bindings.ts`.
 *
 * Este PR-2a establece la shape común; los providers concretos viven en
 * `src/lib/external-giveaways/providers/<key>/`.
 */

/** Enum de providers soportados (extender aquí + en `providers.ts`). */
export type ProviderKey =
  | 'keydrop';
  // | 'csgoroll'
  // | 'hellcase'
  // etc — se añaden al ir integrando (PR-2b/2c/2d…)

/** Estado normalizado a 3 valores universales, independiente del provider. */
export type ExternalGiveawayStatus = 'active' | 'ended' | 'unknown';

/** Preview de un premio individual dentro del sorteo. */
export interface ExternalGiveawayPrizePreview {
  id: string | number;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  price: number;
  currency: string;
  condition: string | null;
  weaponType: string | null;
}

/** Ganador (solo poblado en sorteos con status = 'ended'). */
export interface ExternalGiveawayWinner {
  externalUserId: string | null;
  username: string;
  avatarUrl: string;
  prizeId: string | number | null;
}

/**
 * Shape unificada que consume la UI. Cada provider produce este shape a
 * partir de su API específica. `provider` identifica el origen; el resto
 * de metadata visual (logo, color, listing URL) se resuelve desde el
 * registry `PROVIDERS` en `providers.ts`.
 */
export interface ExternalGiveawayCard {
  /** id upstream del sorteo — único dentro del provider. */
  id: string;
  provider: ProviderKey;
  /** slug del talent en `PLATFORM_CREATOR_SLUGS`. */
  creatorSlug: string;

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

  status: ExternalGiveawayStatus;
  startsAt: Date | null;
  endsAt: Date | null;

  promoCode: string;
  externalUrl: string;

  /** Todos los premios; UI puede renderizar solo primeros N. */
  prizesPreview: ExternalGiveawayPrizePreview[];
  prizeCount: number;
  /** = max(0, prizeCount - 1). Útil para "+N premios extra". */
  extraPrizeCount: number;

  winners: ExternalGiveawayWinner[];
  /** Requisitos normalizados (promocode usage, etc.). */
  requirements: Array<{
    type: string;
    promoCode: string | undefined;
    refillAmount: number | undefined;
    fulfilled: boolean | undefined;
    currency: string | undefined;
  }>;
}

/**
 * Shape agregada consumida por la UI. Contiene activos + finalizados +
 * status de la fetch para distinguir "no configurado" / "error" / "ok".
 * También expone la `providerKey` para que la Section pinte el badge
 * correcto vía lookup en `PROVIDERS`.
 */
export interface ExternalGiveawaySections {
  active: ExternalGiveawayCard[];
  finished: ExternalGiveawayCard[];
  /** Provider resuelto por el binding del creador (null si no hay binding). */
  providerKey: ProviderKey | null;
  status: 'ok' | 'not_configured' | 'error' | 'no_binding';
}

/**
 * Resultado normalizado de una petición a un provider externo.
 * `error` clasifica el motivo — la UI degrada silenciosamente en todos.
 */
export type ExternalFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'not_configured' | 'timeout' | 'network' | 'http' | 'parse'; status?: number };
