import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema/index';

try {
  const f = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of f.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* ci */ }

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function main() {
  const cases = await db.query.caseStudies.findMany({
    with: { body: { orderBy: (b: { sortOrder: unknown }, { asc }: { asc: (c: unknown) => unknown }) => [asc(b.sortOrder)] }, tags: true, creators: true },
    orderBy: (c: { sortOrder: unknown }, { asc }: { asc: (col: unknown) => unknown }) => [asc(c.sortOrder)],
  });

  console.log(`\n=== LISTADO /casos (${cases.length} casos publicados) ===`);
  for (const c of cases) {
    const linkedCreators = c.creators.filter((cr: { talentId: number | null }) => cr.talentId !== null).length;
    console.log(`\n[${c.sortOrder}] ${c.brandName} (/${c.slug}) isPublished=${c.isPublished}`);
    console.log(`  title: ${c.title.slice(0, 70)}...`);
    console.log(`  campaignPeriod: ${c.campaignPeriod ?? '(null)'}`);
    console.log(`  conversions: ${c.conversions ?? '(null)'} | reach: ${c.reach ?? '(null)'}`);
    console.log(`  body: ${c.body.length} párrafos | tags: ${c.tags.length} | creators: ${c.creators.length} (${linkedCreators} con enlace talento)`);
    if (c.creators.length > 0) {
      console.log(`  creators: ${c.creators.map((cr: { creatorName: string; talentId: number | null }) => cr.creatorName + (cr.talentId ? `[id=${cr.talentId}]` : '[sin link]')).join(', ')}`);
    }
    if (c.tags.length > 0) {
      console.log(`  tags: ${c.tags.map((t: { tag: string }) => t.tag).join(', ')}`);
    }
    const takeaways = c.keyTakeaways ? c.keyTakeaways.split('\n').filter(Boolean).length : 0;
    console.log(`  keyTakeaways: ${takeaways} puntos`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
