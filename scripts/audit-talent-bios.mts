// Audit de talentos sin bio aprobada. Uso: npx tsx scripts/audit-talent-bios.mts
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

// Load .env.local — strips surrounding quotes from values
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const idx = line.indexOf('=');
    if (idx < 0 || line.trimStart().startsWith('#')) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && val && !(process.env[key])) process.env[key] = val;
  }
} catch { /* ignore */ }

const raw = process.env.DATABASE_URL ?? '';
if (!raw) { console.error('DATABASE_URL not set'); process.exit(1); }

// neon() v1.0.2 rejects channel_binding param
const cleaned = raw.replace(/[?&]channel_binding=[^&]*/g, (m) => {
  return m.startsWith('?') ? '?' : '';
}).replace(/\?$/, '');

console.log('Connecting to DB...');
const sql = neon(cleaned);

type Row = { id: number; name: string; slug: string; status: string; visibility: string; seo_bio_status: string | null };
const rows = await sql`
  SELECT id, name, slug, status, visibility, seo_bio_status
  FROM talents
  ORDER BY name
` as Row[];

console.log(`\nTotal talentos: ${rows.length}`);

const groups: Record<string, Row[]> = {};
for (const r of rows) {
  const k = r.seo_bio_status ?? 'null';
  if (!groups[k]) groups[k] = [];
  groups[k].push(r);
}

for (const [status, list] of Object.entries(groups)) {
  console.log(`\n=== ${status.toUpperCase()} (${list.length}) ===`);
  for (const r of list) {
    console.log(`  ${r.name.padEnd(25)} ${r.slug.padEnd(25)} ${r.visibility}/${r.status}`);
  }
}

const notApproved = rows.filter(r => r.seo_bio_status !== 'approved' && r.visibility === 'public');
console.log(`\n📊 Públicos sin bio approved: ${notApproved.length}`);
for (const r of notApproved) {
  console.log(`  ⚠️  ${r.name} (${r.slug}) — ${r.seo_bio_status ?? 'empty'}`);
}
