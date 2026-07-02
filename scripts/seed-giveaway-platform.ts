/**
 * Seed de la plataforma de sorteos: misiones e items de tienda demo.
 * Uso: npx tsx scripts/seed-giveaway-platform.ts
 * Idempotente: no duplica si ya existen filas con el mismo título/nombre.
 */
import { db } from '../src/lib/db';
import { platformMissions, shopItems } from '../src/db/schema';

const MISSIONS = [
  { title: 'Primera participación', description: 'Únete a tu primer sorteo', conditionType: 'entries_total', goal: 1, rewardCoins: 50, sortOrder: 1 },
  { title: 'Participa en +5 sorteos', description: 'Únete a 5 sorteos de cualquier creador', conditionType: 'entries_total', goal: 5, rewardCoins: 250, sortOrder: 2 },
  { title: 'Apoya a los 3 creadores', description: 'Participa con NAOW, HUASOPEEK y MARTINEZ · las monedas se suman', conditionType: 'distinct_creators', goal: 3, rewardCoins: 300, sortOrder: 3 },
  { title: 'Racha de 7 días', description: 'Reclama tu recompensa diaria 7 días seguidos', conditionType: 'streak_days', goal: 7, rewardCoins: 400, sortOrder: 4 },
  { title: 'Coleccionista', description: 'Participa en 10 sorteos en total', conditionType: 'entries_total', goal: 10, rewardCoins: 500, sortOrder: 5 },
];

const SHOP_ITEMS = [
  { category: 'skin', name: '★ Glock-18 · Water Elemental', description: 'Stock propio · envío por trade offer', costCoins: 150, stock: 4, sortOrder: 1 },
  { category: 'skin', name: '★ USP-S · Kill Confirmed', description: 'Stock propio · envío por trade offer', costCoins: 450, stock: 2, sortOrder: 2 },
  { category: 'skin', name: '★ AK-47 · Redline', description: 'Stock propio · envío por trade offer', costCoins: 800, stock: 3, sortOrder: 3 },
  { category: 'merch', name: 'Camiseta SocialPro', description: 'Edición 2026 · envío incluido', costCoins: 300, stock: 25, sortOrder: 10 },
  { category: 'merch', name: 'Gorra SocialPro', description: 'Bordado · envío incluido', costCoins: 220, stock: 18, sortOrder: 11 },
  { category: 'gift', name: 'Tarjeta Steam 10€', description: 'Código digital por email', costCoins: 1000, stock: 10, sortOrder: 20 },
  { category: 'gift', name: 'Tarjeta Steam 20€', description: 'Código digital por email', costCoins: 1900, stock: 6, sortOrder: 21 },
  { category: 'gift', name: 'Tarjeta Steam 50€', description: 'Código digital por email', costCoins: 4500, stock: 3, sortOrder: 22 },
  { category: 'gift', name: 'PSN Plus · 1 mes', description: 'Código digital por email', costCoins: 900, stock: 8, sortOrder: 23 },
  { category: 'gift', name: 'Riot Points 10€', description: 'Código digital por email', costCoins: 1000, stock: 8, sortOrder: 24 },
];

async function main() {
  const existingMissions = await db.query.platformMissions.findMany();
  const missionTitles = new Set(existingMissions.map((m) => m.title));
  const newMissions = MISSIONS.filter((m) => !missionTitles.has(m.title));
  if (newMissions.length > 0) await db.insert(platformMissions).values(newMissions);
  console.log(`Misiones: +${newMissions.length} (${existingMissions.length} ya existían)`);

  const existingItems = await db.query.shopItems.findMany();
  const itemNames = new Set(existingItems.map((s) => s.name));
  const newItems = SHOP_ITEMS.filter((s) => !itemNames.has(s.name));
  if (newItems.length > 0) await db.insert(shopItems).values(newItems);
  console.log(`Items de tienda: +${newItems.length} (${existingItems.length} ya existían)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
