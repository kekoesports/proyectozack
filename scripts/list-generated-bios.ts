/**
 * list-generated-bios.ts — muestra todos los talentos con seoBioStatus=generated
 * junto con sus datos clave para revisión editorial.
 * npx tsx scripts/list-generated-bios.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

try {
  const f = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of f.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx < 0) continue;
    const key = t.slice(0, idx).trim();
    let val = t.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* ignore */ }

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const sql = neon(url);

async function main() {
const rows = await sql`
  SELECT
    t.id,
    t.slug,
    t.name,
    t.role,
    t.game,
    t.platform,
    t.creator_country,
    t.bio,
    t.bio_long,
    t.seo_bio_generated,
    t.seo_bio_manual,
    t.seo_bio_status,
    t.seo_title,
    t.seo_description,
    t.seo_keywords,
    t.highlights,
    (
      SELECT json_agg(json_build_object(
        'platform', ts.platform,
        'followers_display', ts.followers_display,
        'profile_url', ts.profile_url
      ) ORDER BY ts.sort_order)
      FROM talent_socials ts
      WHERE ts.talent_id = t.id
    ) AS socials
  FROM talents t
  WHERE t.seo_bio_status = 'generated'
  ORDER BY t.sort_order
`;

console.log(`\nTalentos con seoBioStatus=generated: ${rows.length}\n`);
console.log('='.repeat(80));

for (const r of rows) {
  console.log(`\n### ${r.name} (${r.slug})`);
  console.log(`Rol: ${r.role} | Juego: ${r.game} | País: ${r.creator_country ?? 'N/A'} | Plataforma: ${r.platform}`);
  console.log(`Bio corta: ${r.bio?.slice(0, 100) ?? 'N/A'}`);
  if (r.seo_title) console.log(`seoTitle: ${r.seo_title}`);
  if (r.seo_description) console.log(`seoDescription: ${r.seo_description}`);
  if (r.seo_keywords?.length) console.log(`Keywords: ${(r.seo_keywords as string[]).join(', ')}`);
  if (r.highlights?.length) console.log(`Highlights: ${(r.highlights as string[]).join(' | ')}`);
  console.log(`\n--- seoBioGenerated ---`);
  console.log(r.seo_bio_generated ?? '(vacío)');
  if (r.bio_long) {
    console.log(`\n--- bioLong ---`);
    console.log(r.bio_long);
  }
  console.log('\n' + '-'.repeat(80));
}
}

main().catch((e) => { console.error(e); process.exit(1); });
