/**
 * Ajusta el orden del carrusel de brands y añade PIRATESWAP.
 *
 * Cambios (idempotente — se puede correr varias veces):
 *   - Inserta PIRATESWAP al lado de KEYDROP (sort_order=2).
 *   - Mueve PROZIS al lado de PCCOMPONENTES (sort_order=15, después de
 *     PCCOMPONENTES=14 en el nuevo orden).
 *   - Renumera todos los sort_order a 0..N sin huecos.
 *
 * Orden resultante:
 *   0 HELLCASE
 *   1 KEYDROP
 *   2 PIRATESWAP    ← nuevo
 *   3 EVOPLAY
 *   4 SKIN.CLUB
 *   5 EMPIREDROP
 *   6 PIN-UP
 *   7 EMMA
 *   8 1WIN
 *   9 SKINSMONKEY
 *  10 CLASH.GG
 *  11 GGDROP
 *  12 KICK
 *  13 RAZER
 *  14 PCCOMPONENTES
 *  15 PROZIS        ← movido (era 20)
 *  16 JUGABET
 *  17 1XBET
 *  18 SKIN.PLACE
 *  19 CSGOSKINS
 *  20 YOSPORTS
 *  21 CSDROP
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const FINAL_ORDER: readonly string[] = [
  'hellcase',
  'keydrop',
  'pirateswap',
  'evoplay',
  'skinclub',
  'empiredrop',
  'pinup',
  'emma',
  '1win',
  'skinsmonkey',
  'clashgg',
  'ggdrop',
  'kick',
  'razer',
  'pccomponentes',
  'prozis',
  'jugabet',
  '1xbet',
  'skinplace',
  'csgoskins',
  'yosports',
  'csdrop',
];

const PIRATESWAP = {
  slug: 'pirateswap',
  displayName: 'PIRATESWAP',
  logoUrl: '/images/brands/pirateswap.png',
};

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL no está definido. Aborto.');
    process.exit(1);
  }
  const sql = neon(dbUrl);

  // Estado antes
  const before = await sql`SELECT slug, display_name, sort_order FROM brands ORDER BY sort_order ASC` as Array<{
    slug: string; display_name: string; sort_order: number;
  }>;
  console.log('Antes:');
  console.table(before);

  // 1) Insert PIRATESWAP si no existe (idempotente por slug UNIQUE).
  //    Con temporal sort_order = -1 para no chocar con la renumeración.
  await sql`
    INSERT INTO brands (slug, display_name, logo_url, sort_order)
    VALUES (${PIRATESWAP.slug}, ${PIRATESWAP.displayName}, ${PIRATESWAP.logoUrl}, -1)
    ON CONFLICT (slug) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          logo_url     = EXCLUDED.logo_url
  `;

  // 2) Verificar que todos los slugs del orden final existen en DB.
  const rows = await sql`SELECT slug FROM brands` as Array<{ slug: string }>;
  const dbSlugs = new Set(rows.map((r) => r.slug));
  const missing = FINAL_ORDER.filter((s) => !dbSlugs.has(s));
  if (missing.length > 0) {
    console.error('Slugs esperados que faltan en DB:', missing);
    console.error('Aborto para no dejar el orden inconsistente.');
    process.exit(1);
  }

  // 3) Slugs en DB que NO están en el orden final: los dejamos al final,
  //    conservando su orden relativo actual. No es esperable con el estado
  //    de hoy, pero blindamos por si aparece un slug nuevo entre medias.
  const extras = rows
    .map((r) => r.slug)
    .filter((s) => !FINAL_ORDER.includes(s));
  if (extras.length > 0) {
    console.warn('Slugs presentes en DB no listados en FINAL_ORDER:', extras);
  }
  const fullOrder = [...FINAL_ORDER, ...extras];

  // 4) Aplicar sort_order 0..N. Un UPDATE por slug — la tabla tiene ~22
  //    filas, sobra performance. Neon HTTP driver no soporta tx interactiva
  //    (drizzle-http); si el UNIQUE(sort_order) fuera estricto usaríamos
  //    valores temporales. La tabla actual no tiene UNIQUE en sort_order,
  //    así que la reasignación secuencial es segura.
  for (let i = 0; i < fullOrder.length; i++) {
    const slug = fullOrder[i];
    await sql`UPDATE brands SET sort_order = ${i} WHERE slug = ${slug}`;
  }

  // Estado después
  const after = await sql`SELECT slug, display_name, sort_order FROM brands ORDER BY sort_order ASC` as Array<{
    slug: string; display_name: string; sort_order: number;
  }>;
  console.log('\nDespués:');
  console.table(after);

  console.log('\n✅ Orden aplicado, PIRATESWAP añadido y PROZIS reubicado.');
}

main().catch((e) => { console.error(e); process.exit(1); });
