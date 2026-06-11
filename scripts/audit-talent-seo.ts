/**
 * audit-talent-seo.ts — Audita datos SEO de talentos públicos.
 * Muestra bios aprobadas, faltantes de foto, topGeos, etc.
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

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const talents = await sql`
    SELECT
      slug, name, is_published, show_in_roster,
      seo_bio_status, seo_bio_manual, seo_bio_generated,
      seo_title, seo_description,
      bio, bio_long, photo_url, creator_country, top_geos,
      audience_language
    FROM talents
    WHERE is_published = true
    ORDER BY sort_order
  `;

  console.log('\n=== AUDITORÍA SEO TALENTOS PUBLICADOS ===\n');

  const byStatus: Record<string, typeof talents> = { approved: [], generated: [], none: [], pending: [] };
  for (const t of talents) {
    const s = (t.seo_bio_status as string) || 'none';
    (byStatus[s] ?? byStatus.none).push(t);
  }

  console.log(`Total publicados: ${talents.length}`);
  console.log(`  approved:   ${byStatus.approved?.length ?? 0}`);
  console.log(`  generated:  ${byStatus.generated?.length ?? 0} (en hold)`);
  console.log(`  pending:    ${byStatus.pending?.length ?? 0}`);
  console.log(`  sin status: ${byStatus.none?.length ?? 0}`);

  console.log('\n--- TALENTOS SIN BIO APROBADA ---');
  const sinBio = talents.filter((t) => t.seo_bio_status !== 'approved');
  for (const t of sinBio) {
    const issues: string[] = [];
    if (!t.seo_bio_manual && !t.seo_bio_generated) issues.push('sin bio (ninguna)');
    else if (t.seo_bio_status === 'generated') issues.push('generada en hold');
    else issues.push(`status=${t.seo_bio_status || 'null'}`);
    if (!t.photo_url) issues.push('sin foto');
    if (!t.creator_country) issues.push('sin país');
    if (!t.bio) issues.push('sin bio corta');
    console.log(`  ${t.slug}: ${issues.join(', ')}`);
  }

  console.log('\n--- APROBADAS — verificar seoTitle/seoDesc ---');
  for (const t of byStatus.approved ?? []) {
    const ok = t.seo_title && t.seo_description;
    if (!ok) console.log(`  ⚠️  ${t.slug}: title=${t.seo_title ? 'SI' : 'NO'}, desc=${t.seo_description ? 'SI' : 'NO'}`);
  }
  const allOk = (byStatus.approved ?? []).every((t) => t.seo_title && t.seo_description);
  if (allOk) console.log(`  ✓ Todos con seoTitle y seoDescription`);

  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
