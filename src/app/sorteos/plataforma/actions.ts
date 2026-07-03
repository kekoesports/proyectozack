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

  await db.insert(coinTransactions).values({
    userId: sessionUser.id,
    amount: ENTRY_COIN_REWARD,
    source: 'sorteo',
    concept: `Participación · ${giveaway.title}`,
    refId: giveawayId,
  });

  const missionsCompleted = await evaluateAndClaimMissions(sessionUser.id);

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
  await db.insert(coinTransactions).values({
    userId: sessionUser.id,
    amount: coinsEarned,
    source: 'racha',
    concept: `Recompensa diaria · Día ${day}`,
  });

  await evaluateAndClaimMissions(sessionUser.id);
  revalidatePath('/sorteos', 'layout');
  return { ok: true, data: { coinsEarned, day } };
}

/** Canjea un item de tienda: valida saldo, decrementa stock condicionalmente y registra el canje. */
export async function redeemShopItem(input: unknown): Promise<ActionResult<{ redemptionId: number }>> {
  const sessionUser = await requirePlayerSession();
  if (!sessionUser) return { ok: false, error: 'Inicia sesión con Steam' };

  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Item no válido' };
  const { shopItemId } = parsed.data;

  const item = await db.query.shopItems.findFirst({
    where: and(eq(shopItems.id, shopItemId), eq(shopItems.isActive, true)),
  });
  if (!item) return { ok: false, error: 'El item no está disponible' };

  // Salvaguarda server-side: los cosméticos de perfil (profile / frame /
  // badge) NO se pueden canjear hasta que exista soporte de equipamiento.
  // La UI ya deshabilita el botón, pero un cliente hecho a mano podría
  // saltárselo — este check lo bloquea siempre. Ver
  // docs/sorteos-coin-economy.md §4.2.
  const COSMETIC_CATEGORIES = new Set(['profile', 'frame', 'badge']);
  if (COSMETIC_CATEGORIES.has(item.category)) {
    return {
      ok: false,
      error: 'Los cosméticos de perfil estarán disponibles cuando habilitemos el equipamiento',
    };
  }

  const balance = await getCoinBalance(sessionUser.id);
  if (balance < item.costCoins) {
    return { ok: false, error: 'No tienes monedas suficientes' };
  }

  // Snapshot de entrega según categoría.
  const profile = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.userId, sessionUser.id),
  });
  if (item.category === 'skin' && !profile?.steamTradeUrl) {
    return { ok: false, error: 'Añade tu Steam Trade URL en tu perfil antes de canjear skins' };
  }
  if (item.category === 'merch' && !profile?.shippingAddress) {
    return { ok: false, error: 'Añade tu dirección de envío antes de canjear merchandising' };
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
  if (stockUpdated.length === 0) return { ok: false, error: 'Item agotado' };

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
  if (!redemption) return { ok: false, error: 'No se pudo crear el canje' };

  // Trigger para misiones basadas en redemptions_total (p.ej. "Primer canje").
  await evaluateAndClaimMissions(sessionUser.id);

  revalidatePath('/sorteos', 'layout');
  return { ok: true, data: { redemptionId: redemption.id } };
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
