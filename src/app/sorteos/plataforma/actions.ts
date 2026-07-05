'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { and, eq, gt, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  coinTransactions,
  dailyStreaks,
  giveawayEntries,
  giveaways,
  playerProfiles,
  redemptions,
  shopItems,
} from '@/db/schema';
import {
  participateSchema,
  privacySchema,
  redeemSchema,
  shippingAddressSchema,
  tradeUrlSchema,
} from '@/lib/schemas/giveawayPlatform';
import {
  ENTRY_COIN_REWARD,
  STREAK_REWARDS,
  nextStreakDay,
  previousDay,
  todayInPlatformTz,
} from '@/lib/giveaway-platform/constants';
import { evaluateAndClaimMissions } from '@/lib/giveaway-platform/missions';
import { getCoinBalance } from '@/lib/queries/giveawayPlatform';
import { assertAllowedCoinSource } from '@/lib/rewards/allowed-coin-sources';
import { logGiveawayEvent } from '@/lib/audit/logGiveawayEvent';

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * NOTA driver neon-http: no hay transacciones interactivas, así que la
 * consistencia se garantiza con UNIQUEs (idempotencia) y UPDATEs
 * condicionales (stock). Si el proyecto migra a neon-serverless/Pool,
 * envolver cada action en db.transaction().
 */

async function requirePlayerSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session.user;
}

/** Inscribe al usuario en un sorteo, acredita monedas y evalúa misiones. */
export async function participateInGiveaway(input: unknown): Promise<ActionResult<{
  coinsEarned: number;
  missionsCompleted: { title: string; rewardCoins: number }[];
}>> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, error: 'Inicia sesión con Steam para participar' };

  const parsed = participateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Sorteo no válido' };
  const { giveawayId } = parsed.data;

  const giveaway = await db.query.giveaways.findFirst({
    where: eq(giveaways.id, giveawayId),
  });
  if (!giveaway) return { ok: false, error: 'El sorteo no existe' };
  if (giveaway.endsAt && giveaway.endsAt <= new Date()) {
    return { ok: false, error: 'Este sorteo ya ha finalizado' };
  }

  // Idempotencia vía UNIQUE (giveaway_id, user_id).
  const inserted = await db
    .insert(giveawayEntries)
    .values({ giveawayId, userId: sessionUser.id })
    .onConflictDoNothing()
    .returning({ id: giveawayEntries.id });
  if (inserted.length === 0) {
    return { ok: false, error: 'Ya estás inscrito en este sorteo' };
  }

  assertAllowedCoinSource('sorteo');
  await db.insert(coinTransactions).values({
    userId: sessionUser.id,
    amount: ENTRY_COIN_REWARD,
    source: 'sorteo',
    concept: `Participación · ${giveaway.title}`,
    refId: giveawayId,
  });

  const missionsCompleted = await evaluateAndClaimMissions(sessionUser.id);

  await logGiveawayEvent({
    userId:  sessionUser.id,
    action:  'giveaway_participate',
    outcome: 'success',
    refType: 'giveaway',
    refId:   giveawayId,
    metadata: { coinsEarned: ENTRY_COIN_REWARD, missionsCompleted: missionsCompleted.length },
  });

  revalidatePath('/sorteos', 'layout');
  return { ok: true, data: { coinsEarned: ENTRY_COIN_REWARD, missionsCompleted } };
}

/** Reclama la recompensa fija del día de racha (1/día, TZ Europe/Madrid). */
export async function claimDailyReward(): Promise<ActionResult<{ coinsEarned: number; day: number }>> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, error: 'Inicia sesión con Steam' };

  const today = todayInPlatformTz();
  const existing = await db.query.dailyStreaks.findFirst({
    where: eq(dailyStreaks.userId, sessionUser.id),
  });

  let day = 1;
  if (!existing) {
    const created = await db
      .insert(dailyStreaks)
      .values({ userId: sessionUser.id, currentDay: 1, lastClaimDate: today })
      .onConflictDoNothing()
      .returning({ id: dailyStreaks.id });
    if (created.length === 0) return { ok: false, error: 'Ya has reclamado hoy' };
  } else {
    if (existing.lastClaimDate === today) {
      return { ok: false, error: 'Ya has reclamado la recompensa de hoy' };
    }
    // Aritmética de calendario (previousDay) → inmune a cambios de DST.
    const yesterday = previousDay(today);
    const isConsecutive = existing.lastClaimDate === yesterday;
    // Racha rota: reset a 1. Racha viva: avanza con rotación 7→1.
    day = isConsecutive ? nextStreakDay(existing.currentDay) : 1;

    // UPDATE condicional: solo gana una petición concurrente.
    const updated = await db
      .update(dailyStreaks)
      .set({ currentDay: day, lastClaimDate: today, updatedAt: new Date() })
      .where(and(
        eq(dailyStreaks.userId, sessionUser.id),
        sql`${dailyStreaks.lastClaimDate} IS DISTINCT FROM ${today}`,
      ))
      .returning({ id: dailyStreaks.id });
    if (updated.length === 0) return { ok: false, error: 'Ya has reclamado hoy' };
  }

  const coinsEarned = STREAK_REWARDS[day - 1] ?? STREAK_REWARDS[0];
  assertAllowedCoinSource('racha');
  await db.insert(coinTransactions).values({
    userId: sessionUser.id,
    amount: coinsEarned,
    source: 'racha',
    concept: `Recompensa diaria · Día ${day}`,
  });

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
 * Canjea un item de tienda: valida saldo, decrementa stock condicionalmente
 * y registra el canje.
 *
 * ## Modelo de concurrencia y race condition teórica
 *
 * El driver `neon-http` no soporta transacciones multi-statement — cada
 * `await db.xxx(...)` es una petición independiente. La secuencia es:
 *
 *   1. Lee saldo (`getCoinBalance`).
 *   2. Lee perfil (Trade URL/dirección) si aplica.
 *   3. **UPDATE condicional de stock** con `.where(and(eq(id), gt(stock, 0)))`.
 *      → Atómico a nivel SQL: solo gana una petición cuando `stock === 1`.
 *   4. INSERT en `coin_transactions` (negativo, descuenta puntos).
 *   5. INSERT en `redemptions`.
 *
 * El paso 3 es el gate anti-oversell — dos peticiones simultáneas sobre
 * el último item disponible no pueden ambas retornar filas. Con `stock: 1`
 * (skins Steam) esto es suficiente en la práctica.
 *
 * **Riesgo teórico residual (bajo)**: entre pasos 1 y 4 no hay lock —
 * si el usuario dispara dos canjes en paralelo con saldo justo, ambos
 * pueden pasar el balance check y descontar dos veces. La UNIQUE de
 * `redemptions` NO existe (múltiples canjes del mismo item por el mismo
 * usuario son legítimos). Mitigable con transaccion pooled (neon-serverless
 * WebSocket) o UPSERT atómico via `WITH ... UPDATE ... RETURNING`. Fuera
 * de scope aquí.
 *
 * Ver `docs/sorteos-rewards-catalog.md` §canje si se decide hardening.
 */
export async function redeemShopItem(input: unknown): Promise<RedeemResult> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, code: 'unauthenticated', error: 'Inicia sesión con Steam' };

  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'invalid_input', error: 'Item no válido' };
  const { shopItemId } = parsed.data;

  const item = await db.query.shopItems.findFirst({
    where: and(eq(shopItems.id, shopItemId), eq(shopItems.isActive, true)),
  });
  if (!item) return { ok: false, code: 'item_unavailable', error: 'El item no está disponible' };

  const balance = await getCoinBalance(sessionUser.id);
  if (balance < item.costCoins) {
    return { ok: false, code: 'insufficient_balance', error: 'No tienes puntos suficientes' };
  }

  // Snapshot de entrega según categoría.
  const profile = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.userId, sessionUser.id),
  });
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

  // Decremento condicional de stock: solo gana una petición si queda 1.
  const stockUpdated = await db
    .update(shopItems)
    .set({ stock: sql`${shopItems.stock} - 1`, updatedAt: new Date() })
    .where(and(eq(shopItems.id, shopItemId), gt(shopItems.stock, 0)))
    .returning({ id: shopItems.id });
  if (stockUpdated.length === 0) return { ok: false, code: 'out_of_stock', error: 'Item agotado' };

  assertAllowedCoinSource('tienda');
  await db.insert(coinTransactions).values({
    userId: sessionUser.id,
    amount: -item.costCoins,
    source: 'tienda',
    concept: `Canje · ${item.name}`,
    refId: shopItemId,
  });
  const [redemption] = await db
    .insert(redemptions)
    .values({
      userId: sessionUser.id,
      shopItemId,
      costCoins: item.costCoins,
      deliveryInfo: deliveryInfo ?? null,
    })
    .returning({ id: redemptions.id });
  if (!redemption) return { ok: false, code: 'internal', error: 'No se pudo crear el canje' };

  await logGiveawayEvent({
    userId:  sessionUser.id,
    action:  'shop_redeem',
    outcome: 'success',
    refType: 'redemption',
    refId:   redemption.id,
    metadata: { shopItemId, costCoins: item.costCoins, category: item.category },
  });

  // Trigger para misiones basadas en redemptions_total (p.ej. "Primer canje").
  await evaluateAndClaimMissions(sessionUser.id);

  // Notificación al equipo interno — solo para categorías que requieren
  // envío/revisión manual (skins hoy; merch cuando aplique). Fire-and-forget:
  // si Resend falla no revertimos el canje.
  if (item.category === 'skin') {
    try {
      const { sendRewardRedemptionEmail } = await import('@/lib/email');
      await sendRewardRedemptionEmail({
        redemptionId: redemption.id,
        rewardName: item.name,
        rewardCategory: item.category,
        costPoints: item.costCoins,
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
        redemptionId: redemption.id,
        category: item.category,
      });
    }
  }

  revalidatePath('/sorteos', 'layout');
  return {
    ok: true,
    data: {
      redemptionId: redemption.id,
      requiresManualReview: item.category === 'skin' || item.category === 'merch',
    },
  };
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
