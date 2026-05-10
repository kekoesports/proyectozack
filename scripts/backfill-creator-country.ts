import { config } from 'dotenv';
config({ path: '.env.local' });
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { talents } from '../src/db/schema';

const BACKFILL: Record<string, string> = {
  deqiuv: 'ES',
  martinez: 'ES',
  yamisanchezz: 'ES',
  mecha: 'AR',
  rinna: 'AR',
  sofffi: 'AR',
  mirai: 'ES',
  'evelyn-foxyy': 'ES',
  naow: 'ES',
};

async function main() {
  let updated = 0;
  let skipped = 0;
  for (const [slug, country] of Object.entries(BACKFILL)) {
    const existing = await db.query.talents.findFirst({
      where: eq(talents.slug, slug),
      columns: { creatorCountry: true },
    });
    if (!existing) {
      console.log(`[skip] slug ${slug} no existe`);
      skipped++;
      continue;
    }
    if (existing.creatorCountry === country) {
      console.log(`[skip] ${slug} ya tiene ${country}`);
      skipped++;
      continue;
    }
    await db.update(talents).set({ creatorCountry: country }).where(eq(talents.slug, slug));
    console.log(`[ok] ${slug} → ${country} (era: ${existing.creatorCountry ?? 'NULL'})`);
    updated++;
  }
  console.log(`\nResumen: ${updated} actualizados, ${skipped} sin cambios.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
