import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { brands } from '../src/db/schema/index';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* no .env.local */ }

const dbUrl = process.env.DATABASE_URL!;
const sql = neon(dbUrl);
const db = drizzle(sql, { schema: { brands } });

async function main() {
  const existing = await db.select().from(brands).where(eq(brands.slug, 'csdrop'));
  if (existing.length > 0) {
    console.log(`CSDROP already in brands (id=${existing[0].id}) — updating logoUrl`);
    await db.update(brands)
      .set({ logoUrl: '/images/brands/csdrop.png', displayName: 'CSDROP', sortOrder: 19 })
      .where(eq(brands.slug, 'csdrop'));
    console.log('Updated OK');
  } else {
    const [row] = await db.insert(brands).values({
      slug: 'csdrop',
      displayName: 'CSDROP',
      logoUrl: '/images/brands/csdrop.png',
      sortOrder: 19,
    }).returning();
    console.log(`Inserted brands id=${row.id}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
