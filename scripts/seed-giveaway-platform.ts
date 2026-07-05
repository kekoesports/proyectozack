/**
 * Seed de la plataforma de sorteos: misiones e items de tienda demo.
 *
 * ============================================================
 * NUNCA se ejecuta automáticamente. Requiere env var explícita:
 *   CONFIRM_SEED_GIVEAWAY_PLATFORM=I_ACCEPT_SEED
 *
 * Comando real:
 *   CONFIRM_SEED_GIVEAWAY_PLATFORM=I_ACCEPT_SEED \
 *     npx tsx --env-file=.env.local scripts/seed-giveaway-platform.ts
 * ============================================================
 *
 * Idempotente: no duplica si ya existen filas con el mismo título/nombre.
 * Sin borrar filas — soft-deactivate para respetar claims/redemptions
 * históricas.
 *
 * Alineado con el patrón de guardas de:
 *   · scripts/seed-socialpro-rewards-steam.ts    (CONFIRM_SEED_STEAM_REWARDS)
 *   · scripts/cleanup-legacy-shop-items.ts       (CONFIRM_CLEANUP_LEGACY_SHOP)
 *
 * Cambio PR-1a:
 *   - "Coleccionista" (10 entries totales) → isActive=false (no borrar; puede
 *     tener mission_claims históricos).
 *   - Se añade "Coleccionista mensual" como misión nueva y activa.
 *   - Se añade la escalera +10/+20/+50/+100, +200 (canje) y +150 (racha 3).
 */
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { platformMissions, shopItems } from '../src/db/schema';

const CONFIRM_TOKEN = 'I_ACCEPT_SEED';

const MISSIONS = [
  { title: 'Primera participación',        description: 'Únete a tu primer sorteo',                                           conditionType: 'entries_total',      goal: 1,   rewardCoins: 50,   sortOrder: 1 },
  { title: 'Participa en +5 sorteos',      description: 'Únete a 5 sorteos de cualquier creador',                              conditionType: 'entries_total',      goal: 5,   rewardCoins: 250,  sortOrder: 2 },
  { title: 'Participa en +10 sorteos',     description: 'Únete a 10 sorteos en total',                                         conditionType: 'entries_total',      goal: 10,  rewardCoins: 400,  sortOrder: 3 },
  { title: 'Participa en +20 sorteos',     description: 'Únete a 20 sorteos en total',                                         conditionType: 'entries_total',      goal: 20,  rewardCoins: 750,  sortOrder: 4 },
  { title: 'Participa en +50 sorteos',     description: 'Únete a 50 sorteos en total',                                         conditionType: 'entries_total',      goal: 50,  rewardCoins: 1500, sortOrder: 5 },
  { title: 'Participa en +100 sorteos',    description: 'Únete a 100 sorteos en total',                                        conditionType: 'entries_total',      goal: 100, rewardCoins: 3000, sortOrder: 6 },
  { title: 'Apoya a los 3 creadores',      description: 'Participa con NAOW, HUASOPEEK y MARTINEZ · las monedas se suman',    conditionType: 'distinct_creators',  goal: 3,   rewardCoins: 300,  sortOrder: 7 },
  { title: 'Racha 3 días',                 description: 'Reclama tu recompensa diaria 3 días seguidos',                        conditionType: 'streak_days',        goal: 3,   rewardCoins: 150,  sortOrder: 8 },
  { title: 'Racha 7 días',                 description: 'Reclama tu recompensa diaria 7 días seguidos',                        conditionType: 'streak_days',        goal: 7,   rewardCoins: 400,  sortOrder: 9 },
  { title: 'Coleccionista mensual',        description: 'Participa en 10 sorteos este mes',                                    conditionType: 'entries_this_month', goal: 10,  rewardCoins: 500,  sortOrder: 10 },
  { title: 'Primer canje en tienda',       description: 'Canjea tu primer item en la tienda',                                  conditionType: 'redemptions_total',  goal: 1,   rewardCoins: 200,  sortOrder: 11 },
];

/** Títulos legacy a desactivar (se conservan filas + claims históricos). */
const DEACTIVATE_TITLES = ['Coleccionista', 'Racha de 7 días'];

/**
 * Seed principal de la tienda — precios y stock CONSERVADORES.
 *
 * Estos valores reflejan lo que existe hoy en producción. NO reajustan la
 * economía ni añaden cosméticos: cualquier propuesta de cambio de precios
 * o de nuevos items (profile cards, frames, badges) vive en el seed
 * experimental separado:
 *
 *   scripts/seed-giveaway-platform-v2-experimental.ts
 *
 * Reglas de este archivo:
 *   1. NUNCA meter aquí cambios de economía sin OK explícito de producto.
 *   2. NUNCA meter aquí cosméticos hasta que exista soporte de
 *      equipamiento (migración pendiente — ver docs/sorteos-coin-economy.md §4.2).
 *   3. Este script es idempotente y actualiza `costCoins` si difiere:
 *      cualquier cambio de precio aquí AFECTA producción en el próximo
 *      `npx tsx scripts/seed-giveaway-platform.ts`.
 *
 * Ver también: docs/sorteos-coin-economy.md para la política y el
 * reajuste ×11 propuesto (aún no aprobado para ejecución).
 */
const SHOP_ITEMS = [
  { category: 'skin', name: '★ Glock-18 · Water Elemental', description: 'Stock propio · envío por trade offer', costCoins: 150, stock: 4, sortOrder: 1 },
  { category: 'skin', name: '★ USP-S · Kill Confirmed',      description: 'Stock propio · envío por trade offer', costCoins: 450, stock: 2, sortOrder: 2 },
  { category: 'skin', name: '★ AK-47 · Redline',             description: 'Stock propio · envío por trade offer', costCoins: 800, stock: 3, sortOrder: 3 },
  { category: 'merch', name: 'Camiseta SocialPro',            description: 'Edición 2026 · envío incluido',         costCoins: 300, stock: 25, sortOrder: 10 },
  { category: 'merch', name: 'Gorra SocialPro',               description: 'Bordado · envío incluido',              costCoins: 220, stock: 18, sortOrder: 11 },
  { category: 'gift', name: 'Tarjeta Steam 10€',              description: 'Código digital por email',              costCoins: 1000, stock: 10, sortOrder: 20 },
  { category: 'gift', name: 'Tarjeta Steam 20€',              description: 'Código digital por email',              costCoins: 1900, stock: 6, sortOrder: 21 },
  { category: 'gift', name: 'Tarjeta Steam 50€',              description: 'Código digital por email',              costCoins: 4500, stock: 3, sortOrder: 22 },
  { category: 'gift', name: 'PSN Plus · 1 mes',               description: 'Código digital por email',              costCoins: 900, stock: 8, sortOrder: 23 },
  { category: 'gift', name: 'Riot Points 10€',                description: 'Código digital por email',              costCoins: 1000, stock: 8, sortOrder: 24 },
];

async function main() {
  const confirm = process.env.CONFIRM_SEED_GIVEAWAY_PLATFORM;
  if (confirm !== CONFIRM_TOKEN) {
    console.error(
      'Seed abortado. Requiere env var explícita:\n' +
      `  CONFIRM_SEED_GIVEAWAY_PLATFORM=${CONFIRM_TOKEN} npx tsx --env-file=.env.local scripts/seed-giveaway-platform.ts\n\n` +
      'Motivo: este seed añade/actualiza misiones e items de tienda demo\n' +
      'en la DB. Se ejecuta siempre a mano tras revisar la lista.',
    );
    process.exit(1);
  }

  const existingMissions = await db.query.platformMissions.findMany();
  const missionTitles = new Set(existingMissions.map((m) => m.title));

  // 1) INSERT de misiones nuevas (por título).
  const newMissions = MISSIONS.filter((m) => !missionTitles.has(m.title));
  if (newMissions.length > 0) await db.insert(platformMissions).values(newMissions);
  console.log(`Misiones: +${newMissions.length} (${existingMissions.length} ya existían)`);

  // 2) UPDATE de misiones existentes: sincroniza recompensa, goal, orden.
  //    (Solo campos numéricos/booleanos — no piso descripciones editadas manualmente.)
  let updated = 0;
  for (const spec of MISSIONS) {
    if (!missionTitles.has(spec.title)) continue;
    const existing = existingMissions.find((m) => m.title === spec.title);
    if (!existing) continue;
    const drift =
      existing.goal !== spec.goal ||
      existing.rewardCoins !== spec.rewardCoins ||
      existing.sortOrder !== spec.sortOrder ||
      existing.conditionType !== spec.conditionType ||
      !existing.isActive;
    if (drift) {
      await db.update(platformMissions)
        .set({
          goal: spec.goal,
          rewardCoins: spec.rewardCoins,
          sortOrder: spec.sortOrder,
          conditionType: spec.conditionType,
          isActive: true,
        })
        .where(eq(platformMissions.id, existing.id));
      updated++;
    }
  }
  if (updated > 0) console.log(`Misiones actualizadas (drift): ${updated}`);

  // 3) Desactivar legacy (isActive=false, no borrar — respeta claims históricos).
  for (const title of DEACTIVATE_TITLES) {
    const legacy = existingMissions.find((m) => m.title === title);
    if (legacy && legacy.isActive) {
      await db.update(platformMissions)
        .set({ isActive: false })
        .where(eq(platformMissions.id, legacy.id));
      console.log(`Legacy desactivada: "${title}"`);
    }
  }

  // 4) Items de tienda (sin cambios).
  const existingItems = await db.query.shopItems.findMany();
  const itemNames = new Set(existingItems.map((s) => s.name));
  const newItems = SHOP_ITEMS.filter((s) => !itemNames.has(s.name));
  if (newItems.length > 0) await db.insert(shopItems).values(newItems);
  console.log(`Items de tienda: +${newItems.length} (${existingItems.length} ya existían)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
