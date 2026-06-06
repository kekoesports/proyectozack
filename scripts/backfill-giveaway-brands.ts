/**
 * Backfill: vincula giveaways existentes a crm_brands por nombre (case-insensitive).
 * Muestra cuántos quedan sin vincular y cuáles son.
 *
 * Run: npx tsx scripts/backfill-giveaway-brands.ts
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local manually
const envPath = join(process.cwd(), '.env.local');
const envFile = readFileSync(envPath, 'utf-8');
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // 1. Backfill: vincular por nombre exacto (case-insensitive)
  const backfill = await sql`
    UPDATE giveaways g
    SET    crm_brand_id = b.id
    FROM   crm_brands b
    WHERE  g.crm_brand_id IS NULL
      AND  lower(trim(g.brand_name)) = lower(trim(b.name))
  `;
  console.log(`Backfill: ${backfill.length ?? 0} rows afectados (neon devuelve array vacío en UPDATE).`);

  // 2. Total vinculados tras backfill
  const [linked] = await sql`SELECT count(*)::int AS n FROM giveaways WHERE crm_brand_id IS NOT NULL`;
  const [unlinkedTotal] = await sql`SELECT count(*)::int AS n FROM giveaways WHERE crm_brand_id IS NULL`;

  console.log(`\nGiveaways vinculados a crm_brands:   ${linked.n}`);
  console.log(`Giveaways SIN crm_brand_id:           ${unlinkedTotal.n}`);

  // 3. Desglose de los sin vincular
  const unlinked = await sql`
    SELECT brand_name, count(*)::int AS n
    FROM   giveaways
    WHERE  crm_brand_id IS NULL
    GROUP  BY brand_name
    ORDER  BY count(*) DESC
  `;

  if (unlinked.length === 0) {
    console.log('\n✓ Todos los giveaways están vinculados a crm_brands.');
  } else {
    console.log('\nMarcas sin vincular:');
    for (const row of unlinked) {
      console.log(`  "${row.brand_name}"  → ${row.n} giveaway(s)`);
    }
  }

  // 4. Verificar qué marcas existen en crm_brands para orientar posibles altas
  console.log('\nMarcas disponibles en crm_brands:');
  const brands = await sql`SELECT id, name, logo_url IS NOT NULL AS has_logo FROM crm_brands ORDER BY name`;
  for (const b of brands) {
    console.log(`  [${b.id}] ${b.name}  ${b.has_logo ? '(logo ✓)' : '(sin logo)'}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
