/**
 * Corrige redirectUrls de creator_codes que apuntan a imágenes en vez de sitios web.
 *
 * Uso:
 *   npx tsx scripts/fix-cta-urls.ts           # dry-run
 *   npx tsx scripts/fix-cta-urls.ts --apply   # aplica cambios
 */

import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
dotenvConfig({ path: join(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema/index';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL no configurado.'); process.exit(1); }

const db = drizzle(neon(DATABASE_URL), { schema });
const APPLY = process.argv.includes('--apply');

// Correcciones confirmadas por auditoría de 2026-05-31
// - KEYDROP ids 43,44: mainUrl confirmado en crm_brands (key.drop)
// - Skin Club ids 38,39,40: skin.club (dominio público conocido)
// - YOCASINO id 45: yocasino.es (dominio público conocido)
// Revisar manualmente si alguna URL cambia en el futuro.
const FIXES: Array<{ id: number; brandName: string; oldUrl: string; newUrl: string }> = [
  { id: 43, brandName: 'KEYDROP',   oldUrl: 'https://i.imgur.com/fTyrSAQ.png',                           newUrl: 'https://key.drop' },
  { id: 44, brandName: 'KEYDROP',   oldUrl: 'https://i.imgur.com/fTyrSAQ.png',                           newUrl: 'https://key.drop' },
  { id: 38, brandName: 'Skin Club', oldUrl: 'https://images.opencollective.com/skin-club/fcbd3d5/logo/256.png', newUrl: 'https://skin.club' },
  { id: 39, brandName: 'Skin Club', oldUrl: 'https://images.opencollective.com/skin-club/fcbd3d5/logo/256.png', newUrl: 'https://skin.club' },
  { id: 40, brandName: 'SKIN CLUB', oldUrl: 'https://images.opencollective.com/skin-club/fcbd3d5/logo/256.png', newUrl: 'https://skin.club' },
  { id: 45, brandName: 'YOCASINO', oldUrl: 'https://i.imgur.com/vZKKJd3.png',                            newUrl: 'https://yocasino.es' },
];

async function run(): Promise<void> {
  console.log(APPLY ? '▶  APPLY mode' : '▶  DRY-RUN mode (pass --apply to write changes)');
  console.log('');

  let fixed = 0;
  let skipped = 0;

  for (const fix of FIXES) {
    const [row] = await db
      .select({ id: schema.creatorCodes.id, redirectUrl: schema.creatorCodes.redirectUrl })
      .from(schema.creatorCodes)
      .where(eq(schema.creatorCodes.id, fix.id));

    if (!row) {
      console.log(`  [id=${fix.id}] ⚠  No encontrado — skipped`);
      skipped++;
      continue;
    }

    if (row.redirectUrl !== fix.oldUrl) {
      console.log(`  [id=${fix.id}] ${fix.brandName} — ya corregido o diferente: "${row.redirectUrl}" — skipped`);
      skipped++;
      continue;
    }

    console.log(`  [id=${fix.id}] ${fix.brandName}`);
    console.log(`    BEFORE: ${fix.oldUrl}`);
    console.log(`    AFTER:  ${fix.newUrl}${APPLY ? ' ✓' : ' (dry)'}`);

    if (APPLY) {
      await db.update(schema.creatorCodes)
        .set({ redirectUrl: fix.newUrl })
        .where(eq(schema.creatorCodes.id, fix.id));
    }
    fixed++;
  }

  console.log('');
  console.log('─────────────────────────────────────────');
  console.log(`Corregidos: ${fixed} / Saltados: ${skipped}`);

  if (!APPLY && fixed > 0) {
    console.log('');
    console.log('→  Ejecuta con --apply para aplicar los cambios.');
  }

  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
