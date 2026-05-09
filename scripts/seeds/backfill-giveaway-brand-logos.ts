/**
 * Backfill de `giveaways.brand_logo` apuntando al asset local del registry.
 *
 * - Idempotente: actualiza filas con `brand_logo` NULL **o** apuntando a un
 *   path obsoleto (asset renombrado o eliminado del registry).
 * - Fuente de verdad: el filename real en `/public/images/brands/`.
 *
 * Uso:
 *   npx tsx scripts/seeds/backfill-giveaway-brand-logos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { isNull, ilike, and, or, eq, ne } from 'drizzle-orm';
import { giveaways } from '@/db/schema/giveaways';

/**
 * Mapping `brandName` → path local. Mayúsculas como las almacena la DB
 * (los seeds insertan brandName en uppercase). Aliases para variantes.
 */
const BRAND_LOGO_MAP: Record<string, string> = {
  KEYDROP:       '/images/brands/keydrop.png',
  HELLCASE:      '/images/brands/hellcase.png',
  SKINSMONKEY:   '/images/brands/skinsmonkey.png',
  SKINPLACE:     '/images/brands/skinplace.png',
  SKINCLUB:      '/images/brands/skinclub.png',
  GGDROP:        '/images/brands/ggdrop.png',
  CLASHGG:       '/images/brands/clashgg.png',
  '1WIN':        '/images/brands/1win.png',
  '1XBET':       '/images/brands/1xbet.png',
  RAZER:         '/images/brands/razer.png',
  JUGABET:       '/images/brands/jugabet.svg',
  PINUP:         '/images/brands/pinup.png',
  'PIN-UP':      '/images/brands/pinup.png',
  KICK:          '/images/brands/kick.png',
  PCCOMPONENTES: '/images/brands/pccomponentes.png',
  EMMA:          '/images/brands/emma.png',
  EMPIREDROP:    '/images/brands/empiredrop.png',
  EVOPLAY:       '/images/brands/evoplay.png',
};

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const db = drizzle(neon(url));

  let updated = 0;
  for (const [name, logoPath] of Object.entries(BRAND_LOGO_MAP)) {
    // NULL o apuntando a algo distinto del path canónico → actualizar
    const result = await db
      .update(giveaways)
      .set({ brandLogo: logoPath })
      .where(
        and(
          ilike(giveaways.brandName, name),
          or(isNull(giveaways.brandLogo), ne(giveaways.brandLogo, logoPath)),
        ),
      )
      .returning({ id: giveaways.id });
    if (result.length > 0) {
      console.log(`  ${name.padEnd(15)} → ${logoPath}  (${result.length} rows)`);
      updated += result.length;
    }
  }
  console.log(`\nBackfill complete: ${updated} giveaway rows updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// silence unused: kept for potential future filtered queries
void eq;
