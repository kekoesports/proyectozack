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
  const cases = await sql`
    SELECT
      cs.slug,
      cs.brand_name,
      cs.title,
      cs.excerpt,
      cs.hero_image_url,
      cs.logo_url,
      cs.spokesperson_quote,
      cs.spokesperson_name,
      cs.spokesperson_role,
      cs.key_takeaways,
      cs.campaign_period,
      cs.is_published,
      (SELECT COUNT(*)::int FROM case_creators cc WHERE cc.case_id = cs.id) AS creator_count,
      (SELECT COUNT(*)::int FROM case_body cb WHERE cb.case_id = cs.id) AS body_count,
      (SELECT COUNT(*)::int FROM case_tags ct WHERE ct.case_id = cs.id) AS tag_count
    FROM case_studies cs
    ORDER BY cs.sort_order
  `;

  console.log('\n=== AUDITORÍA CASOS DE ÉXITO ===\n');
  for (const c of cases) {
    const issues: string[] = [];
    if (!c.excerpt) issues.push('❌ sin excerpt');
    if (!c.hero_image_url) issues.push('❌ sin hero_image_url');
    if (!c.logo_url) issues.push('⚠️  sin logo_url (usa case-config)');
    if (!c.spokesperson_quote) issues.push('⚠️  sin quote');
    if (!c.key_takeaways) issues.push('⚠️  sin key_takeaways');
    if (!c.campaign_period) issues.push('⚠️  sin campaign_period');
    if (Number(c.body_count) === 0) issues.push('❌ sin body');
    if (Number(c.creator_count) === 0) issues.push('⚠️  sin creadores');
    if (!c.is_published) issues.push('⚠️  no publicado');

    const status = issues.filter(i => i.startsWith('❌')).length === 0 ? '✓' : '✗';
    console.log(`${status} ${c.slug} [${c.brand_name}]`);
    console.log(`  creators=${c.creator_count}, body=${c.body_count}, tags=${c.tag_count}`);
    if (issues.length > 0) console.log('  ' + issues.join('\n  '));
    console.log();
  }
  console.log(`Total: ${cases.length} casos`);
}

main().catch((e) => { console.error(e); process.exit(1); });
