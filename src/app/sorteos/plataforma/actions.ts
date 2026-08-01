'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  giveaways,
  playerProfiles,
  redemptions,
  shopItems,
} from '@/db/schema';
import {
  adultAttestationSchema,
  participateSchema,
  privacySchema,
  redeemSchema,
  shippingAddressSchema,
  tradeUrlSchema,
} from '@/lib/schemas/giveawayPlatform';
import {
  ADULT_ATTESTATION_VERSION,
  previousDay,
  todayInPlatformTz,
} from '@/lib/giveaway-platform/constants';
import { evaluateAndClaimMissions } from '@/lib/giveaway-platform/missions';
import { getCoinBalance } from '@/lib/queries/giveawayPlatform';
import { logGiveawayEvent } from '@/lib/audit/logGiveawayEvent';
import { assertAllowedCoinSourceOrLog } from '@/lib/audit/logBlockedCoinSource';
import {
  claimStreakAndAward,
  participateAndAward,
  redeemAtomically,
} from '@/lib/giveaway-platform/atomicOperations';
import { getGeoLegalConfig } from '@/lib/geo-legal-config';

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requirePlayerSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session.user;
}

/**
 * Inscribe al usuario en un sorteo. El comportamiento depende de
 * `giveaway.entryAwardCoins`:
 *
 *   - `entryAwardCoins > 0` (default 20): comportamiento histórico —
 *     acredita coin_transactions con source='sorteo' + evalúa misiones.
 *   - `entryAwardCoins = 0`: **sorteo gratis** — solo inserta la entry.
 *     NO crea coin_transactions. NO evalúa misiones. Sin puntos, sin
 *     canjes, sin depósitos, sin ranking impact.
 *
 * Idempotencia: UNIQUE(giveaway_id, user_id). Valida `status` y `endsAt`.
 */
export async function participateInGiveaway(input: unknown): Promise<ActionResult<{
  coinsEarned: number;
  missionsCompleted: { title: string; rewardCoins: number }[];
}>> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, error: 'Inicia sesión con Steam para participar' };

  const parsed = participateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Sorteo no válido' };
  const { giveawayId } = parsed.data;

  const [giveaway, profile] = await Promise.all([
    db.query.giveaways.findFirst({ where: eq(giveaways.id, giveawayId) }),
    db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.userId, sessionUser.id),
      columns: { adultAttestedAt: true },
    }),
  ]);
  if (!giveaway) return { ok: false, error: 'El sorteo no existe' };
  if (!profile?.adultAttestedAt) {
    return { ok: false, error: 'Confirma que eres mayor de 18 años para participar' };
  }
  if (giveaway.status === 'draft' || giveaway.startsAt > new Date()) {
    return { ok: false, error: 'Este sorteo todavía no está activo' };
  }
  if (giveaway.status !== 'active') {
    return { ok: false, error: 'Este sorteo ya ha finalizado' };
  }
  if (giveaway.endsAt && giveaway.endsAt <= new Date()) {
    return { ok: false, error: 'Este sorteo ya ha finalizado' };
  }

  const participation = await participateAndAward({
    userId: sessionUser.id,
    giveawayId,
  });
  if (!participation) {
    return { ok: false, error: 'Este sorteo no está disponible' };
  }
  if (!participation.inserted) {
    return { ok: false, error: 'Ya estás participando en este sorteo' };
  }

  const awardCoins = participation.entry_award_coins;

  if (awardCoins > 0) {
    await assertAllowedCoinSourceOrLog('sorteo', {
      userId: sessionUser.id,
      action: 'giveaway_participate',
      refType: 'giveaway',
      refId: giveawayId,
    });
  }

  // Toda participación en un sorteo interno cuenta para las misiones
  // basadas en `entries_total`, `entries_this_month` y `distinct_creators`,
  // sin importar si el sorteo era gratuito o daba puntos por entrar. Antes
  // sólo se evaluaba cuando awardCoins > 0, lo que dejaba la misión
  // "Primera participación" sin otorgar si el primer sorteo del usuario
  // era gratis — UX confuso reportado en el audit del 2026-07-10.
  const missionsCompleted = await evaluateAndClaimMissions(sessionUser.id);

  await logGiveawayEvent({
    userId:  sessionUser.id,
    action:  awardCoins > 0 ? 'giveaway_participate' : 'free_raffle_participate',
    outcome: 'success',
    refType: 'giveaway',
    refId:   giveawayId,
    metadata: { coinsEarned: awardCoins, missionsCompleted: missionsCompleted.length, isFree: awardCoins === 0 },
  });

  revalidatePath('/sorteos', 'layout');
  return { ok: true, data: { coinsEarned: awardCoins, missionsCompleted } };
}

/** Reclama la recompensa fija del día de racha (1/día, TZ Europe/Madrid). */
export async function claimDailyReward(): Promise<ActionResult<{ coinsEarned: number; day: number }>> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, error: 'Inicia sesión con Steam' };

  const today = todayInPlatformTz();
  await assertAllowedCoinSourceOrLog('racha', {
    userId: sessionUser.id,
    action: 'streak_claim',
    refType: 'streak_day',
    refId: null,
  });
  const claimed = await claimStreakAndAward({
    userId: sessionUser.id,
    today,
    yesterday: previousDay(today),
  });
  if (!claimed) return { ok: false, error: 'Ya has reclamado la recompensa de hoy' };
  const day = claimed.current_day;
  const coinsEarned = claimed.amount;

  await evaluateAndClaimMissions(sessionUser.id);

  await logGiveawayEvent({
    userId:  sessionUser.id,
    action:  'streak_claim',
    outcome: 'success',
    refType: 'streak_day',
    refId:   day,
    metadata: { coinsEarned },
  });

  revalidatePath('/sorteos', 'layout');
  return { ok: true, data: { coinsEarned, day } };
}

/**
 * Códigos de error del canje. Permiten al cliente diferenciar la falta
 * de Trade URL (que muestra una CTA a /sorteos/perfil) de otros errores.
 */
type RedeemErrorCode =
  | 'unauthenticated'
  | 'invalid_input'
  | 'item_unavailable'
  | 'insufficient_balance'
  | 'trade_url_required'
  | 'shipping_required'
  | 'adult_attestation_required'
  | 'out_of_stock'
  | 'internal';

/**
 * Resultado del canje. En éxito devuelve `redemptionId` + copy amistoso
 * para que el cliente muestre "Solicitud recibida. Revisaremos el canje…".
 */
export type RedeemResult =
  | { ok: true; data: { redemptionId: number; requiresManualReview: boolean } }
  | { ok: false; code: RedeemErrorCode; error: string };

/**
 * Canjea un item mediante una única sentencia serializable: reserva stock,
 * valida saldo, debita el ledger y crea el canje. `requestKey` hace que los
 * reintentos de red sean idempotentes.
 */
export async function redeemShopItem(input: unknown): Promise<RedeemResult> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, code: 'unauthenticated', error: 'Inicia sesión con Steam' };

  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'invalid_input', error: 'Item no válido' };
  const { shopItemId } = parsed.data;
  const requestKey = parsed.data.requestKey ?? crypto.randomUUID();

  const item = await db.query.shopItems.findFirst({
    where: and(eq(shopItems.id, shopItemId), eq(shopItems.isActive, true)),
  });
  if (!item) return { ok: false, code: 'item_unavailable', error: 'El item no está disponible' };

  const requestHeaders = await headers();
  const geo = getGeoLegalConfig(requestHeaders.get('x-vercel-ip-country'));
  if (
    (item.category === 'gift' && !geo.giftCardsRewards)
    || (item.category === 'skin' && !geo.skinsRewards)
    || ((item.category === 'merch' || item.category === 'team') && !geo.merchRewards)
  ) {
    return { ok: false, code: 'item_unavailable', error: 'Esta recompensa no está disponible en tu región' };
  }

  // Salvaguarda server-side: los cosméticos de perfil (profile / frame /
  // badge) NO se pueden canjear hasta que exista soporte de equipamiento.
  // La UI ya deshabilita el botón, pero un cliente hecho a mano podría
  // saltárselo — este check lo bloquea siempre. Ver
  // docs/sorteos-coin-economy.md §4.2.
  const COSMETIC_CATEGORIES = new Set(['profile', 'frame', 'badge']);
  if (COSMETIC_CATEGORIES.has(item.category)) {
    return {
      ok: false,
      code: 'item_unavailable',
      error: 'Los cosméticos de perfil estarán disponibles cuando habilitemos el equipamiento',
    };
  }

  const balance = await getCoinBalance(sessionUser.id);
  if (balance < item.costCoins) {
    return { ok: false, code: 'insufficient_balance', error: 'No tienes puntos suficientes' };
  }

  // Snapshot de entrega según categoría.
  const profile = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.userId, sessionUser.id),
  });
  if (!profile?.adultAttestedAt) {
    return {
      ok: false,
      code: 'adult_attestation_required',
      error: 'Confirma que eres mayor de 18 años antes de canjear recompensas',
    };
  }
  if (item.category === 'skin' && !profile?.steamTradeUrl) {
    return {
      ok: false,
      code: 'trade_url_required',
      error: 'Para canjear esta recompensa necesitas añadir tu Steam Trade URL en tu perfil.',
    };
  }
  if (item.category === 'merch' && !profile?.shippingAddress) {
    return {
      ok: false,
      code: 'shipping_required',
      error: 'Añade tu dirección de envío antes de canjear merchandising',
    };
  }
  const deliveryInfo =
    item.category === 'skin' ? profile?.steamTradeUrl
    : item.category === 'merch' ? profile?.shippingAddress
    : sessionUser.email;

  await assertAllowedCoinSourceOrLog('tienda', {
    userId: sessionUser.id,
    action: 'shop_redeem',
    refType: 'shop_item',
    refId: shopItemId,
  });
  let redemption = await redeemAtomically({
    userId: sessionUser.id,
    shopItemId,
    requestKey,
    deliveryInfo: deliveryInfo ?? null,
    allowGift: geo.giftCardsRewards,
    allowSkins: geo.skinsRewards,
    allowMerch: geo.merchRewards,
  });
  if (!redemption) {
    const existing = await db.query.redemptions.findFirst({
      where: and(
        eq(redemptions.userId, sessionUser.id),
        eq(redemptions.requestKey, requestKey),
      ),
      with: { shopItem: true },
    });
    if (existing) {
      redemption = {
        redemption_id: existing.id,
        item_name: existing.shopItem.name,
        category: existing.shopItem.category,
        cost_coins: existing.costCoins,
      };
    } else {
      const [latestItem, latestBalance] = await Promise.all([
        db.query.shopItems.findFirst({ where: eq(shopItems.id, shopItemId) }),
        getCoinBalance(sessionUser.id),
      ]);
      if (!latestItem || latestItem.stock <= 0) {
        return { ok: false, code: 'out_of_stock', error: 'Item agotado' };
      }
      if (latestBalance < latestItem.costCoins) {
        return { ok: false, code: 'insufficient_balance', error: 'No tienes puntos suficientes' };
      }
      return { ok: false, code: 'internal', error: 'No se pudo crear el canje' };
    }
  }

  await logGiveawayEvent({
    userId:  sessionUser.id,
    action:  'shop_redeem',
    outcome: 'success',
    refType: 'redemption',
    refId:   redemption.redemption_id,
    metadata: { shopItemId, costCoins: redemption.cost_coins, category: redemption.category },
  });

  // Trigger para misiones basadas en redemptions_total (p.ej. "Primer canje").
  await evaluateAndClaimMissions(sessionUser.id);

  // Notificación al equipo interno — solo para categorías que requieren
  // envío/revisión manual (skins hoy; merch cuando aplique). Fire-and-forget:
  // si Resend falla no revertimos el canje.
  if (redemption.category === 'skin') {
    try {
      const { sendRewardRedemptionEmail } = await import('@/lib/email');
      await sendRewardRedemptionEmail({
        redemptionId: redemption.redemption_id,
        rewardName: redemption.item_name,
        rewardCategory: redemption.category,
        costPoints: redemption.cost_coins,
        userEmail: sessionUser.email ?? null,
        steamName: sessionUser.name ?? null,
        steamId: profile?.steamId ?? null,
        steamTradeUrl: profile?.steamTradeUrl ?? null,
        createdAtIso: new Date().toISOString(),
      });
    } catch {
      // No revertimos el canje si el email falla. Log seguro (sin PII —
      // el motivo del fallo lo veremos en el dashboard de Resend).
      console.warn('[redeem] internal notification failed', {
        redemptionId: redemption.redemption_id,
        category: redemption.category,
      });
    }
  }

  revalidatePath('/sorteos', 'layout');
  return {
    ok: true,
    data: {
      redemptionId: redemption.redemption_id,
      requiresManualReview: redemption.category === 'skin' || redemption.category === 'merch',
    },
  };
}

/** Registra la declaración +18 necesaria para participar y canjear. */
export async function confirmAdultStatus(input: unknown): Promise<ActionResult> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, error: 'Sesión no válida' };
  const parsed = adultAttestationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Debes confirmar que eres mayor de 18 años' };

  const updated = await db
    .update(playerProfiles)
    .set({
      adultAttestedAt: new Date(),
      adultAttestationVersion: ADULT_ATTESTATION_VERSION,
      updatedAt: new Date(),
    })
    .where(eq(playerProfiles.userId, sessionUser.id))
    .returning({ id: playerProfiles.id });
  if (updated.length === 0) return { ok: false, error: 'No se encontró tu perfil de jugador' };
  revalidatePath('/sorteos', 'layout');
  return { ok: true };
}

/** Guarda la Steam Trade URL del perfil. */
export async function updateTradeUrl(input: unknown): Promise<ActionResult> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, error: 'Sesión no válida' };
  const parsed = tradeUrlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'URL no válida' };

  await db
    .update(playerProfiles)
    .set({ steamTradeUrl: parsed.data.tradeUrl, updatedAt: new Date() })
    .where(eq(playerProfiles.userId, sessionUser.id));
  revalidatePath('/sorteos', 'layout');
  return { ok: true };
}

/** Cambia la visibilidad pública del perfil (nombre enmascarado en rankings). */
export async function updatePrivacy(input: unknown): Promise<ActionResult> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, error: 'Sesión no válida' };
  const parsed = privacySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Valor no válido' };

  await db
    .update(playerProfiles)
    .set({ isPrivate: parsed.data.isPrivate, updatedAt: new Date() })
    .where(eq(playerProfiles.userId, sessionUser.id));
  revalidatePath('/sorteos', 'layout');
  return { ok: true };
}

/** Guarda la dirección de envío para canjes de merchandising. */
export async function updateShippingAddress(input: unknown): Promise<ActionResult> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, error: 'Sesión no válida' };
  const parsed = shippingAddressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Dirección no válida' };

  await db
    .update(playerProfiles)
    .set({ shippingAddress: parsed.data.address, updatedAt: new Date() })
    .where(eq(playerProfiles.userId, sessionUser.id));
  revalidatePath('/sorteos', 'layout');
  return { ok: true };
}
