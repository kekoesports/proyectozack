/**
 * Añade la marca PROZIS a la tabla `brands` (carrusel homepage).
 * Idempotente — onConflictDoNothing sobre slug.
 *
 * Run: npx tsx scripts/add-prozis-brand.ts
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
  const prozis = {
    slug: 'prozis',
    displayName: 'PROZIS',
    logoUrl: '/images/brands/prozis.png',
    sortOrder: 20,
  };

  const result = await db.insert(schema.brands).values(prozis).onConflictDoNothing().returning();

  if (result.length === 0) {
    console.log('✓ PROZIS ya existía — sin cambios.');
  } else {
    for (const r of result) {
      console.log(`✓ Insertado: [${r.id}] ${r.displayName}  sortOrder=${r.sortOrder}  logoUrl=${r.logoUrl}`);
    }
  }

  const all = await db.query.brands.findMany({ orderBy: (b, { asc }) => [asc(b.sortOrder)] });
  console.log(`\nTotal marcas en DB: ${all.length}`);
  for (const b of all) {
    console.log(`  [${String(b.sortOrder).padStart(2)}] ${b.displayName.padEnd(18)} → ${b.logoUrl ?? '(sin logo)'}`);
  }

  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
