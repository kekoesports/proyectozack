import type {
  KeydropCard,
  KeydropListItem,
  KeydropRequirementSchema,
  KeydropStatus,
} from './types';
import type { z } from 'zod';

/**
 * KeyDrop API → shape interna limpia (`KeydropCard`).
 *
 * Reglas:
 *   - Corrige typo upstream `fullfilled → fulfilled` en `requirements`.
 *   - `duractionSeconds` NO se expone; solo `deadlineTimestamp` sirve a UI.
 *   - `totalValue = totalPrizes` si viene; si no, suma de `prizes[].price`.
 *   - `promoCode`: primer requirement con `promoCode`, o `organizer.promocode`
 *     como fallback.
 *   - `externalUrl`: URL general de giveaways de KeyDrop (KeyDrop no expone
 *     URL pública individual por giveaway — el patrón /es/giveaway/{id}
 *     devuelve 404). El botón etiquetado "Ver en KeyDrop" lleva al listing
 *     general. Si en el futuro KeyDrop publica URLs individuales, actualizar
 *     `KEYDROP_LISTING_URL` para volver a un patrón por id.
 *   - `imageUrl` = `prizes[0].itemImg` (mostramos solo el primer premio como
 *     portada; el conteo total va en `prizeCount`).
 *   - `status` desconocido → 'unknown' (no rompe UI).
 */

/** URL genérica del listing público de giveaways de KeyDrop. */
const KEYDROP_LISTING_URL = 'https://key-drop.com/es/giveaways';

/**
 * URL destino del botón "Ver en KeyDrop".
 *
 * Idealmente sería `https://key-drop.com/es/giveaway/{id}` pero ese patrón
 * devuelve 404 (verificado 2026-07). Hasta que KeyDrop publique URLs
 * individuales, apuntamos al listing general — el `id` queda solo como
 * identificador interno.
 */
export function buildKeydropExternalUrl(_id: string): string {
  return KEYDROP_LISTING_URL;
}

export function toKeydropCard(item: KeydropListItem): KeydropCard {
  const firstPrize = item.prizes[0];
  const totalFromSum = item.prizes.reduce((acc, p) => acc + (typeof p.price === 'number' ? p.price : 0), 0);
  const totalValue = typeof item.totalPrizes === 'number' && item.totalPrizes > 0
    ? item.totalPrizes
    : totalFromSum;
  const currency = firstPrize?.currency ?? item.depositAmountRequiredCurrency;

  const requirements = requirementsToArray(item as { requirements?: Record<string, z.infer<typeof KeydropRequirementSchema>> });
  const promoCode = requirements.find((r) => typeof r.promoCode === 'string' && r.promoCode.length > 0)?.promoCode
    ?? item.organizer.promocode;

  const status: KeydropStatus | 'unknown' =
    item.status === 'new' || item.status === 'started' || item.status === 'ended'
      ? item.status
      : 'unknown';

  const title = firstPrize?.title ?? 'Sorteo KeyDrop';
  const imageUrl = firstPrize?.itemImg ?? '';
  const imageAlt = firstPrize
    ? `${firstPrize.title}${firstPrize.subtitle ? ' · ' + firstPrize.subtitle : ''}`
    : 'Premio KeyDrop';

  const winners = Array.isArray(item.winners)
    ? item.winners.map((w) => ({
        steamId: w.idSteam,
        username: w.username,
        avatarUrl: w.steamAvatar,
        prizeId: w.prizeId,
      }))
    : [];

  return {
    id: item.id,
    source: 'keydrop',
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
    createdAt: new Date(item.createdAt),
    deadlineTimestamp: item.deadlineTimestamp !== null ? new Date(item.deadlineTimestamp) : null,
    promoCode,
    externalUrl: buildKeydropExternalUrl(item.id),
    prizeCount: item.prizes.length,
    winners,
    requirements,
  };
}

/**
 * Convierte el objeto `requirements: { "0": {...}, "1": {...} }` a array
 * y corrige `fullfilled → fulfilled`. Devuelve [] si no viene requirements.
 */
function requirementsToArray(
  item: { requirements?: Record<string, z.infer<typeof KeydropRequirementSchema>> },
): KeydropCard['requirements'] {
  if (!item.requirements || typeof item.requirements !== 'object') return [];
  return Object.values(item.requirements).map((r) => ({
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
 * Formatea el label de moneda + valor para mostrar en cards.
 * Ejemplos:
 *   formatCurrency(1073.78, 'USD') → '$1,073.78'
 *   formatCurrency(10, 'EUR')      → '10 €'
 *   formatCurrency(1073.78, 'BTC') → '1,073.78 BTC'
 */
export function formatCurrency(value: number, currency: string): string {
  const c = currency.toUpperCase();
  const num = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (c === 'USD') return `$${num}`;
  if (c === 'EUR') return `${num} €`;
  return `${num} ${c}`;
}
