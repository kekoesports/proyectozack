/**
 * Limpieza legacy + repricing merch SocialPro — 2026-07-03.
 *
 * ============================================================
 * NUNCA se ejecuta automáticamente. Requiere env var explícita:
 *   CONFIRM_CLEANUP_LEGACY_SHOP=I_ACCEPT_CLEANUP
 *
 * Comando real:
 *   CONFIRM_CLEANUP_LEGACY_SHOP=I_ACCEPT_CLEANUP \
 *     npx tsx scripts/cleanup-legacy-shop-items.ts
 * ============================================================
 *
 * Motivación:
 *  - Las 3 skins legacy de seed inicial (Water Elemental, Kill Confirmed,
 *    Redline) tienen precios obsoletos y ya han sido reemplazadas por
 *    las 8 skins reales de `REAL_STEAM_REWARDS` (PR #191). El owner
 *    pidió retirarlas de la UI.
 *  - Merch SocialPro (Camiseta, Gorra) tenía precios en puntos demasiado
 *    bajos (300 y 220). Se sube al menos 2× a valores razonables.
 *
 * Qué hace:
 *  1. Retira (soft-delete via `isActive: false`) las 3 skins legacy.
 *     NO borra la fila — `redemptions.shopItemId` es ON DELETE RESTRICT,
 *     y cualquier canje histórico rompería. El item queda inactivo y no
 *     aparece en `getActiveShopItems`.
 *  2. Sube el precio en puntos de Camiseta SocialPro (300 → 750, 2.5×)
 *     y Gorra SocialPro (220 → 500, ~2.3×).
 *
 * Qué NO hace:
 *  - No borra filas. No mueve saldos. No revierte redemptions.
 *  - No toca otros items (skins Steam nuevas, gift cards, cosméticos,
 *    team merch planned).
 *  - No modifica el schema.
 *
 * Idempotente: correr N veces produce el mismo resultado.
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { shopItems } from '../src/db/schema';

const CONFIRM_TOKEN = 'I_ACCEPT_CLEANUP';

/** Nombres exactos de las skins legacy a retirar. */
const LEGACY_SKIN_NAMES = [
  '★ Glock-18 · Water Elemental',
  '★ USP-S · Kill Confirmed',
  '★ AK-47 · Redline',
] as const;

/** Nuevos precios de merch SocialPro (~2.5× vs valores anteriores). */
const MERCH_REPRICE: readonly { name: string; newCostCoins: number }[] = [
  { name: 'Camiseta SocialPro', newCostCoins: 750 },
  { name: 'Gorra SocialPro',    newCostCoins: 500 },
];

async function main() {
  const confirm = process.env.CONFIRM_CLEANUP_LEGACY_SHOP;
  if (confirm !== CONFIRM_TOKEN) {
    console.error(
      'Cleanup abortado. Requiere env var explícita:\n' +
      `  CONFIRM_CLEANUP_LEGACY_SHOP=${CONFIRM_TOKEN} npx tsx scripts/cleanup-legacy-shop-items.ts\n\n` +
      'Motivo: este script desactiva items en `shop_items` y actualiza\n' +
      'precios. Requiere OK explícito antes de tocar la DB.',
    );
    process.exit(1);
  }

  console.log('Cleanup + repricing sobre shop_items...\n');

  // 1) Soft-delete de las 3 skins legacy.
  const deactivated = await db
    .update(shopItems)
    .set({ isActive: false, updatedAt: new Date() })
    .where(inArray(shopItems.name, [...LEGACY_SKIN_NAMES]))
    .returning({ id: shopItems.id, name: shopItems.name });

  if (deactivated.length === 0) {
    console.log('  · No se encontraron las 3 skins legacy — quizá ya fueron desactivadas.');
  } else {
    for (const row of deactivated) {
      console.log(`  ~ isActive=false [id=${row.id}] ${row.name}`);
    }
  }

  // 2) Repricing merch SocialPro.
  let repriced = 0;
  for (const { name, newCostCoins } of MERCH_REPRICE) {
    const rows = await db
      .update(shopItems)
      .set({ costCoins: newCostCoins, updatedAt: new Date() })
      .where(eq(shopItems.name, name))
      .returning({ id: shopItems.id, name: shopItems.name, costCoins: shopItems.costCoins });
    if (rows.length === 0) {
      console.log(`  · Merch "${name}" no encontrado en DB — skip.`);
    } else {
      for (const row of rows) {
        console.log(`  ~ costCoins=${row.costCoins} [id=${row.id}] ${row.name}`);
        repriced++;
      }
    }
  }

  console.log(`\n✓ Cleanup completado. Desactivadas: ${deactivated.length}. Repriced: ${repriced}.`);
}

main()
  .catch((err) => {
    console.error('Cleanup fallido:', err);
    process.exit(1);
  })
  .then(() => process.exit(0));
