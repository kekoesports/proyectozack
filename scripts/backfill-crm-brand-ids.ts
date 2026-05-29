/**
 * Backfill crmBrandId en giveaways y creator_codes
 * por coincidencia exacta de nombre normalizado (trim + lowercase + colapso de espacios).
 *
 * Uso:
 *   npx tsx scripts/backfill-crm-brand-ids.ts           # dry-run (solo reporta)
 *   npx tsx scripts/backfill-crm-brand-ids.ts --apply   # aplica los cambios
 */

import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
// Carga .env.local antes de leer process.env (dotenv maneja CRLF, comillas, etc.)
dotenvConfig({ path: join(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, isNull } from 'drizzle-orm';
import * as schema from '../src/db/schema/index';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL no configurado. Añádelo a .env.local primero.');
  process.exit(1);
}

const db = drizzle(neon(DATABASE_URL), { schema });

const APPLY = process.argv.includes('--apply');

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function backfill(): Promise<void> {
  console.log(APPLY ? '▶  APPLY mode' : '▶  DRY-RUN mode (pass --apply to write changes)');
  console.log('');

  // 1. Cargar todas las marcas CRM. Si hay duplicados de nombre normalizado → ambiguo.
  const allCrmBrands = await db
    .select({ id: schema.crmBrands.id, name: schema.crmBrands.name })
    .from(schema.crmBrands);

  const nameToId = new Map<string, number>();
  const ambiguous = new Set<string>();

  for (const b of allCrmBrands) {
    const key = normalize(b.name);
    if (nameToId.has(key)) {
      ambiguous.add(key);
      nameToId.delete(key);
    } else if (!ambiguous.has(key)) {
      nameToId.set(key, b.id);
    }
  }

  if (ambiguous.size > 0) {
    console.log('⚠  Nombres ambiguos en crm_brands (omitidos del backfill):');
    for (const name of ambiguous) console.log(`    "${name}"`);
    console.log('');
  }

  // 2. Backfill giveaways
  const pendingGiveaways = await db
    .select({ id: schema.giveaways.id, brandName: schema.giveaways.brandName })
    .from(schema.giveaways)
    .where(isNull(schema.giveaways.crmBrandId));

  let gUpdated = 0;
  const gUnmatched: string[] = [];

  for (const row of pendingGiveaways) {
    const crmBrandId = nameToId.get(normalize(row.brandName));
    if (crmBrandId !== undefined) {
      if (APPLY) {
        await db.update(schema.giveaways).set({ crmBrandId }).where(eq(schema.giveaways.id, row.id));
      }
      console.log(`  [giveaway #${row.id}] "${row.brandName}" → crm_brand_id=${crmBrandId}${APPLY ? ' ✓' : ' (dry)'}`);
      gUpdated++;
    } else {
      gUnmatched.push(`  [giveaway #${row.id}] "${row.brandName}"`);
    }
  }

  // 3. Backfill creator_codes
  const pendingCodes = await db
    .select({ id: schema.creatorCodes.id, brandName: schema.creatorCodes.brandName })
    .from(schema.creatorCodes)
    .where(isNull(schema.creatorCodes.crmBrandId));

  let cUpdated = 0;
  const cUnmatched: string[] = [];

  for (const row of pendingCodes) {
    const crmBrandId = nameToId.get(normalize(row.brandName));
    if (crmBrandId !== undefined) {
      if (APPLY) {
        await db.update(schema.creatorCodes).set({ crmBrandId }).where(eq(schema.creatorCodes.id, row.id));
      }
      console.log(`  [code #${row.id}] "${row.brandName}" → crm_brand_id=${crmBrandId}${APPLY ? ' ✓' : ' (dry)'}`);
      cUpdated++;
    } else {
      cUnmatched.push(`  [code #${row.id}] "${row.brandName}"`);
    }
  }

  // 4. Resumen
  console.log('');
  console.log('─────────────────────────────────────────');
  console.log(`Giveaways: ${gUpdated}/${pendingGiveaways.length} mapeados`);
  console.log(`Códigos:   ${cUpdated}/${pendingCodes.length} mapeados`);

  const allUnmatched = [...gUnmatched, ...cUnmatched];
  if (allUnmatched.length > 0) {
    console.log('');
    console.log('⚠  Sin coincidencia (brandName no existe en crm_brands):');
    for (const line of allUnmatched) console.log(line);
  } else {
    console.log('✓  Sin entradas sin mapear.');
  }

  if (!APPLY && (gUpdated + cUpdated) > 0) {
    console.log('');
    console.log('→  Ejecuta con --apply para aplicar los cambios.');
  }

  process.exit(0);
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
