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
 *   - `totalValue = totalPrizes` si viene; si no, suma de `prizes[].price`.
 *   - `promoCode`: primer requirement con `promoCode`, o
 *     `organizer.promocode` como fallback.
 *   - `externalUrl` viene inyectado por el fetch (proviene del listing URL
 *     del provider registry). NO se construye desde `id` porque KeyDrop no
 *     expone URL individual pública.
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
  externalUrl: string;
}

export function keydropItemToCard({ item, creatorSlug, externalUrl }: MapInput): ExternalGiveawayCard {
  const firstPrize = item.prizes[0];

  const totalFromSum = item.prizes.reduce((acc, p) => acc + (typeof p.price === 'number' ? p.price : 0), 0);
  const totalValue = typeof item.totalPrizes === 'number' && item.totalPrizes > 0
    ? item.totalPrizes
    : totalFromSum;

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
    externalUrl,
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
