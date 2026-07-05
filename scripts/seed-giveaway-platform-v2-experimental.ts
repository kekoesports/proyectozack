/**
 * ============================================================================
 * ⚠️  SEED EXPERIMENTAL — NO EJECUTAR EN PRODUCCIÓN SIN OK EXPLÍCITO   ⚠️
 * ============================================================================
 *
 * Este script aplica la propuesta de reajuste económico de
 * `docs/sorteos-coin-economy.md`:
 *
 *   - Precios reescalados ×11 en items EXISTENTES (skins, merch, tarjetas).
 *   - 8 items MVP nuevos de cosméticos (profile / frame / badge),
 *     insertados con `is_active = false` (INVISIBLES en la tienda) hasta
 *     que exista soporte de equipamiento en el perfil.
 *
 * Riesgos conocidos si se ejecuta:
 *   1. Los balances actuales de los usuarios NO se reescalan → sensación
 *      de empobrecimiento inmediata (Steam 10€ pasa de 1.000 → 11.000
 *      monedas y sus saldos siguen en la escala vieja).
 *   2. La comunicación debe ir por delante — anunciar el cambio con
 *      antelación razonable.
 *   3. Los cosméticos MVP se insertan `is_active = false`. La UI actual
 *      filtra por `isActive = true`, por lo que NO aparecerán en tienda.
 *      Cuando se apruebe el equipamiento, un PR aparte los activa.
 *
 * Cómo ejecutar (solo cuando producto lo apruebe explícitamente):
 *
 *   CONFIRM_SEED_V2=I_ACCEPT_ECONOMY_RESCALE \
 *     npx tsx scripts/seed-giveaway-platform-v2-experimental.ts
 *
 * Sin la variable de entorno el script imprime instrucciones y sale con
 * código 1 sin tocar nada.
 *
 * Ver también: docs/sorteos-coin-economy.md, especialmente §5 (reescalado
 * del pasado) y §4.2 (qué falta para equipar cosméticos).
 * ============================================================================
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { shopItems } from '../src/db/schema';

const CONFIRM_TOKEN = 'I_ACCEPT_ECONOMY_RESCALE';

/**
 * Precios reajustados (~×11) de items ya existentes. Coinciden por `name`.
 * El script SOLO actualiza si el item existe; nunca inserta duplicados.
 */
const RESCALE_PRICES: Array<{ name: string; costCoins: number }> = [
  { name: '★ Glock-18 · Water Elemental', costCoins: 3000 },
  { name: '★ USP-S · Kill Confirmed',      costCoins: 6000 },
  { name: '★ AK-47 · Redline',             costCoins: 15000 },
  { name: 'Camiseta SocialPro',            costCoins: 15000 },
  { name: 'Gorra SocialPro',               costCoins: 9000 },
  { name: 'Tarjeta Steam 10€',             costCoins: 11000 },
  { name: 'Tarjeta Steam 20€',             costCoins: 22000 },
  { name: 'Tarjeta Steam 50€',             costCoins: 55000 },
  { name: 'PSN Plus · 1 mes',              costCoins: 8500 },
  { name: 'Riot Points 10€',               costCoins: 11000 },
];

/**
 * Items MVP de cosméticos. Se insertan `is_active: false` para que NO
 * aparezcan en la tienda pública hasta que exista soporte real de
 * equipamiento en el perfil (migración pendiente).
 */
const COSMETIC_ITEMS = [
  { category: 'profile', name: 'Profile Card — Neon Pink',   description: 'Cosmético digital · próximamente equipable', costCoins: 1500, stock: 500, sortOrder: 30 },
  { category: 'profile', name: 'Profile Card — Cyber Blue',  description: 'Cosmético digital · próximamente equipable', costCoins: 2500, stock: 500, sortOrder: 31 },
  { category: 'profile', name: 'Profile Card — Gold Elite',  description: 'Cosmético digital premium · próximamente equipable', costCoins: 5000, stock: 200, sortOrder: 32 },
  { category: 'profile', name: 'Profile Card — Inferno',     description: 'Cosmético digital premium · próximamente equipable', costCoins: 8000, stock: 100, sortOrder: 33 },
  { category: 'frame',   name: 'Avatar Frame — Cyan',        description: 'Marco alrededor del avatar · próximamente equipable', costCoins: 2000, stock: 500, sortOrder: 40 },
  { category: 'frame',   name: 'Avatar Frame — Gold',        description: 'Marco alrededor del avatar · próximamente equipable', costCoins: 7500, stock: 150, sortOrder: 41 },
  { category: 'badge',   name: 'Badge — OG Member',          description: 'Reconocimiento pre-registro · próximamente equipable', costCoins: 3000, stock: 300, sortOrder: 50 },
  { category: 'badge',   name: 'Badge — Top Grinder',        description: 'Reconocimiento por constancia · próximamente equipable', costCoins: 5000, stock: 200, sortOrder: 51 },
];

async function main() {
  if (process.env.CONFIRM_SEED_V2 !== CONFIRM_TOKEN) {
    console.log('');
    console.log('=================================================================');
    console.log(' ⚠️  SEED EXPERIMENTAL v2 — NO EJECUTADO');
    console.log('=================================================================');
    console.log('');
    console.log(' Este script REESCALA los precios existentes ×11 e inserta');
    console.log(' 8 items MVP de cosméticos (invisibles hasta equipamiento).');
    console.log('');
    console.log(' Riesgos: los balances actuales NO se reescalan. Los usuarios');
    console.log(' sentirán "empobrecimiento" hasta que ganen a la nueva escala.');
    console.log('');
    console.log(' Para ejecutar, se requiere la variable de entorno:');
    console.log('');
    console.log('   CONFIRM_SEED_V2=' + CONFIRM_TOKEN + ' \\');
    console.log('     npx tsx scripts/seed-giveaway-platform-v2-experimental.ts');
    console.log('');
    console.log(' Alternativa recomendada: aplicar los cambios en un PR');
    console.log(' aparte con validación de balances y aviso comunitario.');
    console.log('');
    console.log('=================================================================');
    console.log('');
    process.exit(1);
  }

  console.log('[seed-v2] confirmación recibida. Iniciando cambios...');

  // 1) Reescalado de precios existentes.
  const existing = await db.query.shopItems.findMany();
  const byName = new Map(existing.map((it) => [it.name, it]));

  let updated = 0;
  for (const spec of RESCALE_PRICES) {
    const cur = byName.get(spec.name);
    if (!cur) {
      console.log(`[seed-v2] SKIP (no existe): ${spec.name}`);
      continue;
    }
    if (cur.costCoins === spec.costCoins) {
      console.log(`[seed-v2] SKIP (ya al precio nuevo): ${spec.name}`);
      continue;
    }
    await db
      .update(shopItems)
      .set({ costCoins: spec.costCoins, updatedAt: new Date() })
      .where(eq(shopItems.id, cur.id));
    console.log(`[seed-v2] UPDATE: ${spec.name} · ${cur.costCoins} → ${spec.costCoins}`);
    updated += 1;
  }

  // 2) Inserción de cosméticos MVP con is_active=false.
  let inserted = 0;
  for (const spec of COSMETIC_ITEMS) {
    if (byName.has(spec.name)) {
      console.log(`[seed-v2] SKIP (ya existe): ${spec.name}`);
      continue;
    }
    await db.insert(shopItems).values({
      category: spec.category,
      name: spec.name,
      description: spec.description,
      costCoins: spec.costCoins,
      stock: spec.stock,
      sortOrder: spec.sortOrder,
      isActive: false, // ← INVISIBLE hasta que exista equipamiento
    });
    console.log(`[seed-v2] INSERT (inactivo): ${spec.name}`);
    inserted += 1;
  }

  console.log('');
  console.log(`[seed-v2] Resumen: ${updated} precio(s) actualizado(s), ${inserted} cosmético(s) insertado(s) inactivo(s).`);
  console.log('[seed-v2] Los cosméticos permanecerán ocultos en la tienda hasta que se apruebe');
  console.log('[seed-v2] el soporte de equipamiento (migración de player_profiles / user_cosmetics).');
}

void main().then(
  () => process.exit(0),
  (err) => { console.error('[seed-v2] Error:', err); process.exit(1); },
);
