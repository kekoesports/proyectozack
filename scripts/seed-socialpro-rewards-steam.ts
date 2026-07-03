/**
 * Seed idempotente de las 8 skins CS2 de SocialPro Giveaways.
 *
 * Fuente de verdad: `src/features/giveaway-platform/constants/rewards-catalog.ts`
 * → `REAL_STEAM_REWARDS`.
 *
 * ============================================================
 * NUNCA se ejecuta automáticamente. Requiere env var explícita:
 *   CONFIRM_SEED_STEAM_REWARDS=I_ACCEPT_ADD_STEAM_REWARDS
 *
 * Comando real:
 *   CONFIRM_SEED_STEAM_REWARDS=I_ACCEPT_ADD_STEAM_REWARDS npx tsx scripts/seed-socialpro-rewards-steam.ts
 * ============================================================
 *
 * Qué hace:
 *  1. Por cada skin en `REAL_STEAM_REWARDS` con `status === 'active'`:
 *     - Busca `shop_items` con `name` idéntico.
 *     - Si NO existe → INSERT con category/name/description/imageUrl/costCoins/stock.
 *     - Si SÍ existe → UPDATE de description/imageUrl/costCoins/stock/isActive
 *       (mantiene el id — no rompe redemptions históricas).
 *
 * Qué NO hace:
 *  - No borra items existentes.
 *  - No modifica items que no estén en `REAL_STEAM_REWARDS`.
 *  - No toca balances de usuarios ni redemptions históricas.
 *  - No lee datos externos (Steam, KeyDrop, etc.) — trabaja solo con el
 *    catálogo local ya committed en el repo.
 *
 * Campos del schema soportados (`src/db/schema/shopItems.ts`):
 *   category, name, description, imageUrl, costCoins, stock, isActive, sortOrder.
 *
 * Campos que el catálogo tiene pero el schema NO soporta (pendientes de
 * migración en un PR separado si el owner lo aprueba):
 *   - `wear`, `rarity`, `steamMarketUrl`, `delivery`, `requiresManualReview`,
 *     `game`, `status`, `slug`.
 *   Estos viven solo en `REAL_STEAM_REWARDS` (constante). La UI los
 *   consume desde ahí para las cards de vitrina. Cuando el item pasa a
 *   DB via este seed, sólo se persiste lo que cabe en `shop_items`.
 *   `description` embebe la info visible al usuario ("Envío por Steam
 *   Trade Offer · stock limitado · canje sujeto a revisión manual").
 */

import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { shopItems } from '../src/db/schema';
import { REAL_STEAM_REWARDS } from '../src/features/giveaway-platform/constants/rewards-catalog';

const CONFIRM_TOKEN = 'I_ACCEPT_ADD_STEAM_REWARDS';

async function main() {
  const confirm = process.env.CONFIRM_SEED_STEAM_REWARDS;
  if (confirm !== CONFIRM_TOKEN) {
    console.error(
      'Seed abortado. Requiere env var explícita:\n' +
      `  CONFIRM_SEED_STEAM_REWARDS=${CONFIRM_TOKEN} npx tsx scripts/seed-socialpro-rewards-steam.ts\n\n` +
      'Motivo: este seed añade/actualiza recompensas Steam reales en la DB\n' +
      'de producción. Se ejecuta siempre a mano tras revisar el catálogo.',
    );
    process.exit(1);
  }

  const active = REAL_STEAM_REWARDS.filter((r) => r.status === 'active');
  if (active.length === 0) {
    console.log('No hay recompensas con status="active" en el catálogo. Nada que sincronizar.');
    return;
  }

  console.log(`Sincronizando ${active.length} recompensas Steam CS2...\n`);

  let inserted = 0;
  let updated = 0;

  for (const [i, reward] of active.entries()) {
    const existing = await db.query.shopItems.findFirst({
      where: eq(shopItems.name, reward.name),
    });

    // sortOrder alto (900+) para que las 8 skins nuevas aparezcan al final
    // de la grid por defecto, antes que los items antiguos. Ajustable en UI
    // según preferencia del owner.
    const sortOrder = 900 + i;

    if (!existing) {
      const [row] = await db
        .insert(shopItems)
        .values({
          category: reward.category,
          name: reward.name,
          description: reward.description.slice(0, 300),
          imageUrl: reward.imageUrl,
          costCoins: reward.costPoints,
          stock: reward.stock,
          isActive: true,
          sortOrder,
        })
        .returning({ id: shopItems.id });
      console.log(`  + INSERT [id=${row?.id}] ${reward.name} — ${reward.costPoints.toLocaleString('es-ES')} pts / stock ${reward.stock}`);
      inserted++;
    } else {
      await db
        .update(shopItems)
        .set({
          description: reward.description.slice(0, 300),
          imageUrl: reward.imageUrl,
          costCoins: reward.costPoints,
          stock: reward.stock,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(shopItems.id, existing.id));
      console.log(`  ~ UPDATE [id=${existing.id}] ${reward.name} — ${reward.costPoints.toLocaleString('es-ES')} pts / stock ${reward.stock}`);
      updated++;
    }
  }

  console.log(`\n✓ Seed completado. Insertadas: ${inserted}. Actualizadas: ${updated}.`);
}

main()
  .catch((err) => {
    console.error('Seed fallido:', err);
    process.exit(1);
  })
  .then(() => process.exit(0));
