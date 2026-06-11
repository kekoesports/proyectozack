// Migración de portadas Imgur → Vercel Blob.
// Uso: npx tsx scripts/migrate-imgur-to-blob.mts [--dry-run]
// Sin --dry-run ejecuta la migración y actualiza la BD.

import { readFileSync } from 'fs';
import { join, extname } from 'path';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('🔍 DRY-RUN — sin cambios en BD ni Blob\n');

// ── Load .env.local ─────────────────────────────────────────────────────────
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
// News covers need a PUBLIC Blob store — use BLOB_READ_WRITE_TOKEN_NEWS if available.
// To create one: Vercel Dashboard → Storage → New Store → type Public → copy token → set BLOB_READ_WRITE_TOKEN_NEWS in Vercel + .env.local
const blobToken = process.env.BLOB_READ_WRITE_TOKEN_NEWS ?? process.env.BLOB_READ_WRITE_TOKEN;
if (!blobToken) { console.error('BLOB_READ_WRITE_TOKEN_NEWS (or BLOB_READ_WRITE_TOKEN) not set'); process.exit(1); }
if (!process.env.BLOB_READ_WRITE_TOKEN_NEWS) {
  console.warn('⚠️  BLOB_READ_WRITE_TOKEN_NEWS not set — using private store token. Migration will fail if store is private.\n   Create a public store and set BLOB_READ_WRITE_TOKEN_NEWS to fix.\n');
}

const u = new URL(raw);
u.searchParams.delete('channel_binding');
const sql = neon(u.toString());

// ── Fetch affected posts ─────────────────────────────────────────────────────
type PostRow = { id: number; slug: string; cover_url: string | null; og_image_url: string | null };

const rows = await sql`
  SELECT id, slug, cover_url, og_image_url
  FROM posts
  WHERE cover_url ILIKE '%imgur.com%' OR og_image_url ILIKE '%imgur.com%'
  ORDER BY id
` as PostRow[];

console.log(`Posts con Imgur: ${rows.length}\n`);

let ok = 0;
let fail = 0;

for (const row of rows) {
  const imgurUrl = row.cover_url ?? row.og_image_url ?? '';
  const ext = extname(new URL(imgurUrl).pathname) || '.jpeg';
  const blobPath = `news/covers/${row.slug}${ext}`;

  process.stdout.write(`[${row.id}] ${row.slug}  →  ${blobPath} ... `);

  if (DRY_RUN) {
    console.log('(skip)');
    continue;
  }

  try {
    // Download from Imgur
    const res = await fetch(imgurUrl, { headers: { 'User-Agent': 'SocialPro-Bot/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();

    // Upload to Vercel Blob
    const { url: blobUrl } = await put(blobPath, buf, {
      access: 'public',
      contentType: res.headers.get('content-type') ?? 'image/jpeg',
      addRandomSuffix: false,
      token: blobToken,
    });

    // Update DB — both cover_url and og_image_url if they point to Imgur
    const newCover = row.cover_url?.includes('imgur.com') ? blobUrl : row.cover_url;
    const newOg = row.og_image_url?.includes('imgur.com') ? blobUrl : row.og_image_url;

    await sql`UPDATE posts SET cover_url = ${newCover}, og_image_url = ${newOg} WHERE id = ${row.id}`;

    console.log(`✅  ${blobUrl}`);
    ok++;
  } catch (err) {
    console.log(`❌  ${(err as Error).message}`);
    fail++;
  }
}

if (!DRY_RUN) {
  console.log(`\nMigración completada: ${ok} OK · ${fail} errores`);
} else {
  console.log(`\nDRY-RUN completo. ${rows.length} posts afectados. Ejecutar sin --dry-run para migrar.`);
}
