import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql as sqlExpr } from 'drizzle-orm';
import * as schema from '../src/db/schema/index';

try {
  const f = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const l of f.split('\n')) {
    const i = l.indexOf('='); if (i < 0) continue;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && v && !process.env[k]) process.env[k] = v;
  }
} catch {}

const { talents, talentSocials } = schema;
const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
const testSlug = `test-orm-${Date.now()}`;

async function run() {
  try {
    const [maxRow] = await db.select({ max: sqlExpr<number>`COALESCE(MAX(${talents.sortOrder}), 0)` }).from(talents);
    const nextSort = (maxRow?.max ?? 0) + 1;

    console.log('Inserting talent...');
    const [inserted] = await db.insert(talents).values({
      slug: testSlug,
      name: 'Test ORM Debug',
      role: 'Creator',
      game: 'General',
      platform: 'twitch',
      status: 'active',
      bio: '',
      gradientC1: '#f5632a',
      gradientC2: '#8b3aad',
      initials: 'TO',
      sortOrder: nextSort,
      visibility: 'internal',
    }).returning({ id: talents.id });

    console.log('✅ Talent insert OK, id:', inserted?.id);

    if (inserted) {
      console.log('Inserting social...');
      await db.insert(talentSocials).values({
        talentId: inserted.id,
        platform: 'twitch',
        handle: 'testhandle',
        followersDisplay: '-',
        hexColor: '#9147ff',
        sortOrder: 1,
      });
      console.log('✅ Social insert OK');

      // Cleanup
      const sql2 = neon(process.env.DATABASE_URL!);
      await sql2`DELETE FROM talents WHERE id = ${inserted.id}`;
      console.log('✅ Cleanup OK');
    }
  } catch (err) {
    console.error('❌ ERROR:', err instanceof Error ? err.message : err);
    console.error('Stack:', err instanceof Error ? err.stack?.slice(0, 800) : '');
    const sql2 = neon(process.env.DATABASE_URL!);
    await sql2`DELETE FROM talents WHERE slug = ${testSlug}`.catch(() => {});
  }
}

run().catch(console.error);
