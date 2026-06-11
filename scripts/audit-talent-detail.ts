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

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const talents = await sql`
    SELECT
      t.slug, t.name, t.role, t.game, t.platform, t.creator_country, t.bio,
      (SELECT string_agg(ts2.followers_display || ' ' || ts2.platform, ', ') FROM talent_socials ts2 WHERE ts2.talent_id = t.id) AS socials_summary
    FROM talents t
    WHERE t.is_published = true
      AND (t.seo_bio_status IS NULL OR t.seo_bio_status NOT IN ('approved', 'generated'))
    ORDER BY t.sort_order
  `;

  console.log('\n=== TALENTOS SIN SEO BIO ===\n');
  for (const t of talents) {
    console.log(`${t.slug} (${t.name})`);
    console.log(`  role: ${t.role} | game: ${t.game} | platform: ${t.platform} | país: ${t.creator_country ?? '?'}`);
    console.log(`  bio corta: ${t.bio ? t.bio.slice(0, 80) + '…' : 'NULL'}`);
    console.log(`  socials: ${t.socials_summary ?? 'ninguna'}`);
    console.log();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
