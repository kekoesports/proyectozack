import type {
  ExternalGiveawayCard,
  ExternalGiveawayPrizePreview,
  ExternalGiveawayStatus,
  ExternalGiveawayWinner,
} from '../../types';
import type { KeydropListItem, KeydropRequirement } from './zod-schemas';

/**
 * KeyDrop API → `ExternalGiveawayCard` (shape común interna).
 *
 * Reglas:
 *   - Corrige typo upstream `fullfilled → fulfilled` en `requirements`.
 *   - `duractionSeconds` NO se expone en la card; solo `endsAt` sirve a UI.
 *   - `totalValue = sum(prizes[].price)` SIEMPRE. `item.totalPrizes` NO
 *     representa el valor de este sorteo — es un agregado del creador
 *     (todos sus sorteos activos sumados). Verificado con probe real
 *     2026-07-10: los 6 sorteos activos de ZACKETIZOR devolvían el mismo
 *     `totalPrizes = 6165.03` mientras que sus `sum(prizes[].price)` iban
 *     de 311.56 a 2040.30. Ese campo se descarta aquí y queda para una
 *     futura vista agregada del creador (fuera de la card individual).
 *   - `promoCode`: primer requirement con `promoCode`, o
 *     `organizer.promocode` como fallback.
 *   - `externalUrl` se construye con `buildKeydropDeepLink(id, promoCode)`:
 *     usamos el shortener oficial `kd.link` que aplica el promocode del
 *     creador y deep-linkea al giveaway concreto. Diagnóstico HEAD/curl
 *     (2026-07): `key-drop.com` con guión devuelve 403 (Cloudflare) para
 *     todo path; `keydrop.com/es/giveaways/{id}` responde 200 con
 *     `<link rel="alternate">` para los 12 locales del mismo path
 *     (canónico); `kd.link/?code=X&giveaway=Y` redirige 301 →
 *     `keydrop.com/?code=X&giveaway=Y` (200) — preferido porque preserva
 *     el promocode del creador para affiliate tracking.
 *   - `imageUrl` = `prizes[0].itemImg` (primer premio como portada; el
 *     conteo total va en `prizeCount`; el resto en `prizesPreview`).
 *   - `status` mapeado a los 3 valores universales:
 *       'new' | 'started' → 'active'
 *       'ended'           → 'ended'
 *       resto              → 'unknown'
 */

interface MapInput {
  item: KeydropListItem;
  creatorSlug: string;
}

/** Fallback si por algún motivo llegamos sin promocode ni id — página de listado. */
const KEYDROP_LISTING_FALLBACK = 'https://keydrop.com/es/giveaways';

/**
 * Construye la URL destino del CTA de la card para un giveaway KeyDrop
 * concreto.
 *
 * Path oficial verificado con los 5 sorteos activos de ZACKETIZOR
 * (2026-07): `https://keydrop.com/es/giveaways/user/{id}` — abre la
 * página del sorteo concreto en el SPA de KeyDrop.
 *
 * El shortener `kd.link/?code=X&giveaway=Y` NO se usa aquí porque en
 * la práctica redirige a la home con el código aplicado en vez de
 * abrir el sorteo — falla el objetivo del CTA. Queda reservado para
 * el banner de marca (`buildKeydropClaimUrl` — sin sorteo concreto).
 *
 * El promocode se propaga como query param `?code=X` para preservar
 * affiliate tracking cuando aterriza el usuario. Params desconocidos
 * son ignorados por KeyDrop sin romper el routing.
 *
 * Fallback si falta id: página de listado (nunca URL rota).
 */
export function buildKeydropDeepLink(id: string, promoCode: string | undefined): string {
  const safeId = id ? encodeURIComponent(id) : '';
  const safeCode = promoCode ? encodeURIComponent(promoCode) : '';
  if (!safeId) return KEYDROP_LISTING_FALLBACK;

  const base = `https://keydrop.com/es/giveaways/user/${safeId}`;
  return safeCode ? `${base}?code=${safeCode}` : base;
}

/**
 * URL de "claim" a nivel banner/marca — sin sorteo concreto.
 *
 * Usado por `BrandCardKeyDrop` para todos los CTAs del banner principal
 * (Reclamar, 200% Bonus, Cómo participar, Club VIP): abren KeyDrop con
 * el promocode del creador aplicado, para que la sesión del usuario
 * quede vinculada al afiliado. Igual que `buildKeydropDeepLink` pero
 * sin `giveaway=` — no apunta a un sorteo concreto.
 *
 * Fallback si falta code: página de listado sin código (mejor que un
 * botón muerto).
 */
export function buildKeydropClaimUrl(promoCode: string | undefined): string {
  const safeCode = promoCode ? encodeURIComponent(promoCode) : '';
  if (safeCode) {
    return `https://kd.link/?code=${safeCode}`;
  }
  return KEYDROP_LISTING_FALLBACK;
}

export function keydropItemToCard({ item, creatorSlug }: MapInput): ExternalGiveawayCard {
  const firstPrize = item.prizes[0];

  // totalValue = suma real de los premios de ESTE sorteo. `item.totalPrizes`
  // no se usa (ver comentario en la cabecera del archivo — es un agregado
  // del creador, no del sorteo).
  const totalValue = item.prizes.reduce(
    (acc, p) => acc + (typeof p.price === 'number' ? p.price : 0),
    0,
  );

  const currency = firstPrize?.currency ?? item.depositAmountRequiredCurrency;

  const requirements = requirementsToArray(item.requirements);
  const promoCode = requirements.find((r) => typeof r.promoCode === 'string' && r.promoCode.length > 0)?.promoCode
    ?? item.organizer.promocode;

  const status: ExternalGiveawayStatus =
    item.status === 'new' || item.status === 'started' ? 'active'
    : item.status === 'ended' ? 'ended'
    : 'unknown';

  const title = firstPrize?.title ?? 'Sorteo KeyDrop';
  const imageUrl = firstPrize?.itemImg ?? '';
  const imageAlt = firstPrize
    ? `${firstPrize.title}${firstPrize.subtitle ? ' · ' + firstPrize.subtitle : ''}`
    : 'Premio KeyDrop';

  const winners: ExternalGiveawayWinner[] = Array.isArray(item.winners)
    ? item.winners.map((w) => ({
        externalUserId: w.idSteam,
        username: w.username,
        avatarUrl: w.steamAvatar,
        prizeId: w.prizeId,
      }))
    : [];

  const prizesPreview: ExternalGiveawayPrizePreview[] = item.prizes.map((p) => ({
    id: p.id,
    title: p.title,
    subtitle: p.subtitle ?? null,
    imageUrl: p.itemImg,
    price: p.price,
    currency: p.currency,
    condition: p.condition,
    weaponType: p.weaponType,
  }));

  const prizeCount = item.prizes.length;
  const extraPrizeCount = Math.max(0, prizeCount - 1);

  return {
    id: item.id,
    provider: 'keydrop',
    creatorSlug,
    title,
    subtitle: firstPrize?.subtitle ?? null,
    imageUrl,
    imageAlt,
    totalValue: roundTo2(totalValue),
    currency,
    depositRequired: item.depositAmountRequired,
    depositCurrency: item.depositAmountRequiredCurrency,
    participantCount: item.participantCount,
    maxUsers: item.maxUsers,
    minUsers: item.minUsers,
    status,
    startsAt: item.startDate ? new Date(item.startDate) : new Date(item.createdAt),
    endsAt: item.deadlineTimestamp !== null ? new Date(item.deadlineTimestamp) : null,
    promoCode,
    externalUrl: buildKeydropDeepLink(item.id, promoCode),
    prizesPreview,
    prizeCount,
    extraPrizeCount,
    winners,
    requirements,
  };
}

function requirementsToArray(
  reqs: Record<string, KeydropRequirement> | undefined,
): ExternalGiveawayCard['requirements'] {
  if (!reqs || typeof reqs !== 'object') return [];
  return Object.values(reqs).map((r) => ({
    type: r.type,
    promoCode: r.promoCode,
    refillAmount: r.refillAmount,
    fulfilled: r.fullfilled,   // typo upstream corregido aquí
    currency: r.currency,
  }));
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Formatea el label de moneda + valor.
 * Ejemplos:
 *   $1,073.78 · 10 € · 500 BTC
 */
export function formatCurrency(value: number, currency: string): string {
  const c = currency.toUpperCase();
  const num = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (c === 'USD') return `$${num}`;
  if (c === 'EUR') return `${num} €`;
  return `${num} ${c}`;
}
