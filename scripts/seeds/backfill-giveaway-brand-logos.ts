/**
 * Backfill de `giveaways.brand_logo` cuando viene NULL — apunta al PNG local
 * del registry (`/images/brands/<slug>.png`).
 *
 * Idempotente: solo actualiza filas con logo NULL. Ejecutar una vez tras
 * detectar el fallback "K naranja" en el sidebar de /sorteos.
 *
 * Uso:
 *   npx tsx scripts/seeds/backfill-giveaway-brand-logos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, isNull, ilike, and } from 'drizzle-orm';
import { giveaways } from '@/db/schema/giveaways';

const BRAND_LOGO_MAP: Record<string, string> = {
  KEYDROP: '/images/brands/keydrop.png',
  HELLCASE: '/images/brands/hellcase.png',
  SKINSMONKEY: '/images/brands/skinsmonkey.png',
  SKINPLACE: '/images/brands/skinplace.png',
  SKINCLUB: '/images/brands/skinclub.png',
  GGDROP: '/images/brands/ggdrop.png',
  CLASHGG: '/images/brands/clashgg.jpg',
  '1WIN': '/images/brands/1win.png',
  RAZER: '/images/brands/razer.png',
  MELBET: '/images/brands/melbet.png',
  JUGABET: '/images/brands/jugabet.png',
  PINUP: '/images/brands/pinup.png',
  'PIN-UP': '/images/brands/pinup.png',
  GRANDWIN: '/images/brands/grandwin.png',
  KICK: '/images/brands/kick.png',
  PCCOMPONENTES: '/images/brands/pccomponentes.png',
  EMMA: '/images/brands/emma.png',
  ZEROTWO: '/images/brands/zerotwo.png',
};

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const db = drizzle(neon(url));

  let updated = 0;
  for (const [name, logoPath] of Object.entries(BRAND_LOGO_MAP)) {
    const result = await db
      .update(giveaways)
      .set({ brandLogo: logoPath })
      .where(and(ilike(giveaways.brandName, name), isNull(giveaways.brandLogo)))
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
