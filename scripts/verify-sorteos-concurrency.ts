import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  coinTransactions,
  giveawayEntries,
  giveawayWinners,
  giveaways,
  playerProfiles,
  redemptions,
  shopItems,
  talents,
  user,
} from '@/db/schema';
import {
  participateAndAward,
  pickWinnerAtomically,
  redeemAtomically,
} from '@/lib/giveaway-platform/atomicOperations';

const runKey = `qa-sorteos-${Date.now()}`;
const userIds = [`${runKey}-a`, `${runKey}-b`] as const;
const createdGiveawayIds: number[] = [];
let createdShopItemId: number | null = null;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function cleanup(): Promise<void> {
  if (createdGiveawayIds.length > 0) {
    await db.delete(giveawayWinners).where(inArray(giveawayWinners.giveawayId, createdGiveawayIds));
    await db.delete(giveawayEntries).where(inArray(giveawayEntries.giveawayId, createdGiveawayIds));
    await db.delete(giveaways).where(inArray(giveaways.id, createdGiveawayIds));
  }
  await db.delete(redemptions).where(inArray(redemptions.userId, [...userIds]));
  await db.delete(coinTransactions).where(inArray(coinTransactions.userId, [...userIds]));
  if (createdShopItemId) {
    await db.delete(shopItems).where(eq(shopItems.id, createdShopItemId));
  }
  await db.delete(playerProfiles).where(inArray(playerProfiles.userId, [...userIds]));
  await db.delete(user).where(inArray(user.id, [...userIds]));
}

async function main(): Promise<void> {
  const talent = await db.query.talents.findFirst({ columns: { id: true } });
  assert(talent, 'El dump no contiene talentos para crear las fixtures');

  const now = new Date();
  await db.insert(user).values(userIds.map((id, index) => ({
    id,
    name: `QA Player ${index + 1}`,
    email: `${id}@example.invalid`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })));
  await db.insert(playerProfiles).values(userIds.map((id, index) => ({
    userId: id,
    steamId: `${runKey}-${index}`,
    adultAttestedAt: now,
    adultAttestationVersion: 'qa',
    isPrivate: index === 1,
  })));

  const [activeGiveaway] = await db.insert(giveaways).values({
    talentId: talent.id,
    title: `[QA] Atomic participation ${runKey}`,
    brandName: 'QA',
    redirectUrl: '/sorteos',
    startsAt: new Date(now.getTime() - 60_000),
    endsAt: new Date(now.getTime() + 3_600_000),
    entryAwardCoins: 20,
    status: 'active',
  }).returning({ id: giveaways.id });
  assert(activeGiveaway, 'No se pudo crear el sorteo activo');
  createdGiveawayIds.push(activeGiveaway.id);

  const participationResults = await Promise.all([
    participateAndAward({ userId: userIds[0], giveawayId: activeGiveaway.id }),
    participateAndAward({ userId: userIds[0], giveawayId: activeGiveaway.id }),
  ]);
  const insertedParticipations = participationResults.filter((result) => result?.inserted).length;
  const [entryCount] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(giveawayEntries)
    .where(and(
      eq(giveawayEntries.giveawayId, activeGiveaway.id),
      eq(giveawayEntries.userId, userIds[0]),
    ));
  const [participationAward] = await db
    .select({ value: sql<number>`coalesce(sum(amount), 0)::int` })
    .from(coinTransactions)
    .where(and(
      eq(coinTransactions.userId, userIds[0]),
      eq(coinTransactions.refKey, `giveaway:${activeGiveaway.id}:user:${userIds[0]}`),
    ));
  assert(insertedParticipations === 1, 'La participación concurrente se insertó más de una vez');
  assert(entryCount?.value === 1, 'La fixture produjo más de una entry');
  assert(participationAward?.value === 20, 'Los puntos de participación no son idempotentes');

  const [shopItem] = await db.insert(shopItems).values({
    category: 'gift',
    name: `[QA] One stock ${runKey}`,
    costCoins: 100,
    stock: 1,
    isActive: true,
  }).returning({ id: shopItems.id });
  assert(shopItem, 'No se pudo crear el item');
  createdShopItemId = shopItem.id;
  await db.insert(coinTransactions).values({
    userId: userIds[0],
    amount: 80,
    source: 'admin',
    concept: 'QA concurrency balance',
    refKey: `${runKey}:balance`,
  });

  const redemptionResults = await Promise.all([
    redeemAtomically({
      userId: userIds[0],
      shopItemId: shopItem.id,
      requestKey: `${runKey}-redeem-a`,
      deliveryInfo: 'qa@example.invalid',
      allowGift: true,
      allowSkins: true,
      allowMerch: true,
    }),
    redeemAtomically({
      userId: userIds[0],
      shopItemId: shopItem.id,
      requestKey: `${runKey}-redeem-b`,
      deliveryInfo: 'qa@example.invalid',
      allowGift: true,
      allowSkins: true,
      allowMerch: true,
    }),
  ]);
  const successfulRedemptions = redemptionResults.filter(Boolean).length;
  const itemAfter = await db.query.shopItems.findFirst({
    where: eq(shopItems.id, shopItem.id),
    columns: { stock: true },
  });
  const [redemptionCount] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(redemptions)
    .where(eq(redemptions.userId, userIds[0]));
  assert(successfulRedemptions === 1, 'Dos canjes concurrentes consumieron el mismo stock/saldo');
  assert(itemAfter?.stock === 0, 'El stock final no es cero');
  assert(redemptionCount?.value === 1, 'Se crearon múltiples canjes');

  const [endedGiveaway] = await db.insert(giveaways).values({
    talentId: talent.id,
    title: `[QA] Atomic winner ${runKey}`,
    brandName: 'QA',
    redirectUrl: '/sorteos',
    startsAt: new Date(now.getTime() - 7_200_000),
    endsAt: new Date(now.getTime() - 3_600_000),
    entryAwardCoins: 0,
    status: 'ended',
  }).returning({ id: giveaways.id });
  assert(endedGiveaway, 'No se pudo crear el sorteo vencido');
  createdGiveawayIds.push(endedGiveaway.id);
  await db.insert(giveawayEntries).values(userIds.map((userId) => ({
    giveawayId: endedGiveaway.id,
    userId,
  })));

  const winnerResults = await Promise.all([
    pickWinnerAtomically({ giveawayId: endedGiveaway.id }),
    pickWinnerAtomically({ giveawayId: endedGiveaway.id }),
  ]);
  const [winnerCount] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(giveawayWinners)
    .where(eq(giveawayWinners.giveawayId, endedGiveaway.id));
  const giveawayAfter = await db.query.giveaways.findFirst({
    where: eq(giveaways.id, endedGiveaway.id),
    columns: { status: true },
  });
  assert(winnerResults.filter(Boolean).length === 1, 'Hubo más de una selección ganadora');
  assert(winnerCount?.value === 1, 'La BD contiene más de un ganador');
  assert(giveawayAfter?.status === 'ended', 'El sorteo no quedó cerrado');

  console.log(JSON.stringify({
    participation: 'atomic_and_idempotent',
    redemption: 'single_stock_single_debit',
    winner: 'single_after_lifecycle_close',
  }));
}

main()
  .finally(cleanup)
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'QA concurrency failed');
    process.exitCode = 1;
  });
