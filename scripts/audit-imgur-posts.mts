// Audit de posts con imágenes alojadas en Imgur. Uso: npx tsx scripts/audit-imgur-posts.mts
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

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

const u = new URL(raw);
u.searchParams.delete('channel_binding');
const cleaned = u.toString();

console.log('Conectando a DB...');
const sql = neon(cleaned);

type PostRow = {
  id: number;
  slug: string;
  title: string;
  status: string;
  vertical: string;
  cover_url: string | null;
  og_image_url: string | null;
  body_has_imgur: boolean;
};

const rows = await sql`
  SELECT
    id, slug, title, status, vertical,
    cover_url, og_image_url,
    (body_md ILIKE '%i.imgur.com%' OR body_md ILIKE '%imgur.com%') AS body_has_imgur
  FROM posts
  WHERE
    cover_url ILIKE '%imgur.com%'
    OR og_image_url ILIKE '%imgur.com%'
    OR body_md ILIKE '%imgur.com%'
  ORDER BY vertical, status, id
` as PostRow[];

if (rows.length === 0) {
  console.log('\n✅ No se encontraron posts con imágenes de Imgur.');
  process.exit(0);
}

console.log(`\n⚠️  Posts con imágenes en Imgur: ${rows.length}\n`);
for (const r of rows) {
  const flags: string[] = [];
  if (r.cover_url?.includes('imgur.com')) flags.push(`cover_url: ${r.cover_url}`);
  if (r.og_image_url?.includes('imgur.com')) flags.push(`og_image_url: ${r.og_image_url}`);
  if (r.body_has_imgur) flags.push('body_md: contiene imgur');

  console.log(`[${r.id}] ${r.vertical}/${r.status} — ${r.slug}`);
  console.log(`  ${r.title}`);
  for (const f of flags) console.log(`  → ${f}`);
  console.log('');
}
