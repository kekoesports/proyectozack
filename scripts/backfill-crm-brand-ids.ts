/**
 * Backfill crmBrandId en giveaways y creator_codes
 * por coincidencia exacta de nombre normalizado (trim + lowercase + colapso de espacios).
 *
 * Uso:
 *   npx tsx scripts/backfill-crm-brand-ids.ts           # dry-run (solo reporta)
 *   npx tsx scripts/backfill-crm-brand-ids.ts --apply   # aplica los cambios
 */
import { db } from '../src/lib/db';
import { crmBrands, giveaways, creatorCodes } from '../src/db/schema';
import { isNull } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function backfill(): Promise<void> {
  console.log(APPLY ? '▶  APPLY mode' : '▶  DRY-RUN mode (pass --apply to write changes)');
  console.log('');

  // 1. Cargar todas las marcas CRM (nombre → id). Si hay duplicados de nombre normalizado, ambiguo.
  const allCrmBrands = await db
    .select({ id: crmBrands.id, name: crmBrands.name })
    .from(crmBrands);

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
    .select({ id: giveaways.id, brandName: giveaways.brandName })
    .from(giveaways)
    .where(isNull(giveaways.crmBrandId));

  let gUpdated = 0;
  const gUnmatched: string[] = [];

  for (const row of pendingGiveaways) {
    const crmBrandId = nameToId.get(normalize(row.brandName));
    if (crmBrandId !== undefined) {
      if (APPLY) {
        await db.update(giveaways).set({ crmBrandId }).where(eq(giveaways.id, row.id));
      }
      console.log(`  [giveaway #${row.id}] "${row.brandName}" → crm_brand_id=${crmBrandId}${APPLY ? ' ✓' : ' (dry)'}`);
      gUpdated++;
    } else {
      gUnmatched.push(`  [giveaway #${row.id}] "${row.brandName}"`);
    }
  }

  // 3. Backfill creator_codes
  const pendingCodes = await db
    .select({ id: creatorCodes.id, brandName: creatorCodes.brandName })
    .from(creatorCodes)
    .where(isNull(creatorCodes.crmBrandId));

  let cUpdated = 0;
  const cUnmatched: string[] = [];

  for (const row of pendingCodes) {
    const crmBrandId = nameToId.get(normalize(row.brandName));
    if (crmBrandId !== undefined) {
      if (APPLY) {
        await db.update(creatorCodes).set({ crmBrandId }).where(eq(creatorCodes.id, row.id));
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
