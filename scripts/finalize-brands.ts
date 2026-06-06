/**
 * Finalización backfill brands:
 * 1. Elimina duplicado YOSPORT (id=16) — cero vínculos
 * 2. Actualiza logo_url de YoSports (id=21) a ruta local estática
 * 3. Inserta CSGOSkins si no existe
 *
 * Run: npx tsx scripts/finalize-brands.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

try {
  const f = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of f.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && v && !process.env[k]) process.env[k] = v;
  }
} catch { /* ci */ }

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // 1. Eliminar duplicado YOSPORT (id=16)
  await sql`DELETE FROM crm_brands WHERE id = 16`;
  console.log('✓ Eliminado duplicado YOSPORT (id=16)');

  // 2. Actualizar logo_url de YoSports (id=21) a ruta estática local
  await sql`UPDATE crm_brands SET logo_url = '/images/brands/yosports.png', updated_at = now() WHERE id = 21`;
  console.log('✓ YoSports (id=21) logo_url → /images/brands/yosports.png');

  // 3. Insertar CSGOSkins si no existe
  const existing = await sql`SELECT id FROM crm_brands WHERE lower(trim(name)) = 'csgoskins'`;
  if (existing.length === 0) {
    const [row] = await sql`
      INSERT INTO crm_brands (name, logo_url, status, created_at, updated_at)
      VALUES ('CSGOSkins', '/images/brands/csgoskins.png', 'activa', now(), now())
      RETURNING id
    `;
    console.log(`✓ Insertado CSGOSkins (id=${row.id}) con logo_url=/images/brands/csgoskins.png`);
  } else {
    console.log(`  CSGOSkins ya existe (id=${existing[0].id}), actualizando logo`);
    await sql`UPDATE crm_brands SET logo_url = '/images/brands/csgoskins.png', updated_at = now() WHERE lower(trim(name)) = 'csgoskins'`;
  }

  // Verificación final
  const brands = await sql`SELECT id, name, logo_url FROM crm_brands WHERE name ILIKE '%yosport%' OR name ILIKE '%csgoskin%' ORDER BY id`;
  console.log('\nEstado final:');
  for (const b of brands) console.log(`  [${b.id}] "${b.name}"  → ${b.logo_url}`);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
