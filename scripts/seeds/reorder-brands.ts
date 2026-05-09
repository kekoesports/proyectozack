/**
 * Re-aplica el `sort_order` de marcas según el orden visual diseñado para
 * el carrusel home. El orden busca:
 *  - Alternar logos wide (ratio ≥ 4) con logos mid (ratio < 3) para evitar
 *    bloques visualmente pesados o débiles consecutivos.
 *  - Separar plates dark (KEYDROP, SKINSMONKEY, SKIN.PLACE) en el loop.
 *  - Mover 1WIN fuera de la posición 0 (era el frame fijo del carrusel).
 *
 * Idempotente: corre `UPDATE` por slug. Run: `npx tsx scripts/seeds/reorder-brands.ts`.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { brands } from '@/db/schema/content';

const ORDER: ReadonlyArray<readonly [string, number]> = [
  ['hellcase',      0],
  ['keydrop',       1],
  ['evoplay',       2],
  ['skinclub',      3],
  ['empiredrop',    4],
  ['pinup',         5],
  ['emma',          6],
  ['1win',          7],
  ['skinsmonkey',   8],
  ['clashgg',       9],
  ['ggdrop',       10],
  ['kick',         11],
  ['razer',        12],
  ['pccomponentes',13],
  ['jugabet',      14],
  ['1xbet',        15],
  ['skinplace',    16],
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const db = drizzle(neon(url));

  let updated = 0;
  for (const [slug, sortOrder] of ORDER) {
    const result = await db
      .update(brands)
      .set({ sortOrder })
      .where(eq(brands.slug, slug))
      .returning({ id: brands.id });
    if (result.length > 0) {
      console.log(`  ${slug.padEnd(15)} → sort_order ${sortOrder}`);
      updated += 1;
    } else {
      console.log(`  ${slug.padEnd(15)} (not found)`);
    }
  }
  console.log(`\nReorder complete: ${updated}/${ORDER.length} brand rows updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
