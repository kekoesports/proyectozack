/**
 * Añade CSGOSkins y YoSports a la tabla brands (carrusel de la homepage).
 * Idempotente — onConflictDoNothing sobre slug.
 *
 * Run: npx tsx scripts/seed-new-brands.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema/index';

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

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function main() {
  const newBrands = [
    { slug: 'csgoskins', displayName: 'CSGOSKINS', logoUrl: '/images/brands/csgoskins.png', sortOrder: 17 },
    { slug: 'yosports',  displayName: 'YOSPORTS',  logoUrl: '/images/brands/yosports.png',  sortOrder: 18 },
  ];

  const result = await db.insert(schema.brands).values(newBrands).onConflictDoNothing().returning();

  if (result.length === 0) {
    console.log('✓ Ambas marcas ya existían — sin cambios.');
  } else {
    for (const r of result) {
      console.log(`✓ Insertado: [${r.id}] ${r.displayName}  sortOrder=${r.sortOrder}  logoUrl=${r.logoUrl}`);
    }
  }

  // Estado final de las nuevas marcas
  const all = await db.query.brands.findMany({ orderBy: (b, { asc }) => [asc(b.sortOrder)] });
  console.log(`\nTotal marcas en DB: ${all.length}`);
  for (const b of all) {
    console.log(`  [${String(b.sortOrder).padStart(2)}] ${b.displayName.padEnd(18)} → ${b.logoUrl ?? '(sin logo)'}`);
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
