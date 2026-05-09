/**
 * Sincroniza la tabla `brands` con `/public/images/brands/`:
 *  - DELETE filas cuya marca no tiene asset en filesystem.
 *  - INSERT filas para assets nuevos no presentes en DB.
 *  - UPDATE logoUrl si el path en DB no apunta al asset real (extension
 *    cambió, etc.).
 *
 * Garantía: la tabla refleja exactamente los archivos en la carpeta.
 *
 * No reasigna FK porque `brands.id` no es referenciado por ninguna tabla
 * (case_studies y giveaways usan `brandName` como texto). Si en el futuro
 * se añade FK, este delete podría romper relaciones — revisar antes.
 *
 * Idempotente. Run-on-demand cuando se actualiza el folder.
 *
 * Uso:
 *   npx tsx scripts/seeds/sync-brands-to-assets.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { notInArray, eq } from 'drizzle-orm';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { brands } from '@/db/schema/content';

/**
 * Display name para slugs nuevos. Slug es el filename sin extensión, en
 * lowercase. Cuando un slug requiere displayName diferente (ej: "skinplace"
 * → "SKIN.PLACE", "1xbet" → "1XBET"), añadir override aquí.
 */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  '1win': '1WIN',
  '1xbet': '1XBET',
  clashgg: 'CLASH.GG',
  pinup: 'PIN-UP',
  skinclub: 'SKIN.CLUB',
  skinplace: 'SKIN.PLACE',
  skinsmonkey: 'SKINSMONKEY',
  pccomponentes: 'PCCOMPONENTES',
};

function slugToDisplayName(slug: string): string {
  return DISPLAY_NAME_OVERRIDES[slug] ?? slug.toUpperCase();
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const db = drizzle(neon(url));

  const assetDir = join(process.cwd(), 'public', 'images', 'brands');
  const files = readdirSync(assetDir).filter((f) => /\.(png|webp|svg|jpg)$/i.test(f));
  type Asset = { slug: string; logoUrl: string };
  const assets: Asset[] = files.map((f) => ({
    slug: f.replace(/\.[^.]+$/, '').toLowerCase(),
    logoUrl: `/images/brands/${f}`,
  }));
  const assetSlugs = assets.map((a) => a.slug);

  console.log(`Assets en filesystem: ${assets.length}`);
  console.log(`  ${assetSlugs.join(', ')}\n`);

  // 1) DELETE rows cuyo slug no está en filesystem
  const deleted = await db
    .delete(brands)
    .where(notInArray(brands.slug, assetSlugs))
    .returning({ slug: brands.slug });
  if (deleted.length > 0) {
    console.log(`Deleted ${deleted.length} orphan brand rows: ${deleted.map((r) => r.slug).join(', ')}`);
  }

  // 2) Snapshot del estado actual de la tabla
  const existing = await db.select().from(brands);
  const existingMap = new Map(existing.map((r) => [r.slug, r]));

  // 3) INSERT assets que faltan en DB / UPDATE logoUrl si difiere
  let inserted = 0;
  let updated = 0;
  let nextSortOrder =
    existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) + 1 : 0;

  for (const asset of assets) {
    const row = existingMap.get(asset.slug);
    if (!row) {
      await db.insert(brands).values({
        slug: asset.slug,
        displayName: slugToDisplayName(asset.slug),
        logoUrl: asset.logoUrl,
        sortOrder: nextSortOrder,
      });
      console.log(`  + ${asset.slug.padEnd(15)} INSERT (${asset.logoUrl})`);
      nextSortOrder += 1;
      inserted += 1;
      continue;
    }
    if (row.logoUrl !== asset.logoUrl) {
      await db.update(brands).set({ logoUrl: asset.logoUrl }).where(eq(brands.id, row.id));
      console.log(`  ~ ${asset.slug.padEnd(15)} UPDATE logoUrl ${row.logoUrl} → ${asset.logoUrl}`);
      updated += 1;
    }
  }

  console.log(
    `\nResumen: deleted=${deleted.length}, inserted=${inserted}, updated=${updated}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
