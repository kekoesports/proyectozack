/**
 * NULL out `brands.logoUrl` para brands con asset files inexistentes o
 * corruptos. Sin logoUrl el carousel renderiza el fallback de texto en
 * vez de mostrar un broken-image icon o un asset visualmente roto.
 *
 *  - `grandwin`, `zerotwo`: assets eliminados (no estaban en el upload nuevo).
 *  - `melbet`: asset cortado — solo contiene "ELBE", la M y la T finales
 *    están fuera del archivo PNG. Mejor texto fallback que logo recortado.
 *
 * Idempotente. Run-on-demand (no parte del seed automático). Cuando llegue
 * un asset MELBET correcto: re-subirlo a `/public/images/brands/melbet.png`
 * y ejecutar UPDATE manual o quitar el slug de la lista abajo.
 *
 * Uso:
 *   npx tsx scripts/seeds/null-orphan-brand-logos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { inArray } from 'drizzle-orm';
import { brands } from '@/db/schema/content';

const ORPHAN_SLUGS = ['grandwin', 'zerotwo', 'melbet'];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const db = drizzle(neon(url));

  const result = await db
    .update(brands)
    .set({ logoUrl: null })
    .where(inArray(brands.slug, ORPHAN_SLUGS))
    .returning({ slug: brands.slug });

  console.log(`Updated ${result.length} brand rows: ${result.map(r => r.slug).join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
