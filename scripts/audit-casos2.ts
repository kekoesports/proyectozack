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
    SELECT slug, brand_name, excerpt, spokesperson_quote, spokesperson_name, is_published
    FROM case_studies ORDER BY sort_order
  `;
  for (const c of cases) {
    const ex = c.excerpt ? c.excerpt.toString().slice(0, 60) + '...' : 'NULL';
    console.log(`${c.slug}: published=${c.is_published}, excerpt=${ex}, quote=${c.spokesperson_quote ? 'SI' : 'NO'}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
