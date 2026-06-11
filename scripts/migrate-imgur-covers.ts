/**
 * migrate-imgur-covers.ts — Migra covers de Imgur a Vercel Blob.
 *
 * Descarga cada imagen de Imgur, la sube a Vercel Blob y actualiza
 * `posts.cover_url` en la DB. Idempotente: si la URL ya apunta a Blob,
 * la salta.
 *
 * MODOS:
 *   npm run migrate:imgur          → dry-run (no escribe nada, solo lista)
 *   npm run migrate:imgur -- --save → ejecuta la migración real
 *   npm run migrate:imgur -- --save --id=48  → solo un artículo específico
 *
 * SEGURIDAD: Las URLs de Imgur no se borran ni se tocan. Solo se actualiza
 * el campo cover_url apuntando al nuevo blob. Si algo falla, la fila queda
 * con la URL Imgur original intacta.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

// ── Load .env.local ────────────────────────────────────────────────────────────
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {/* ignore */}

// ── Config ─────────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL ?? '';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? '';

if (!DATABASE_URL) { console.error('❌ DATABASE_URL no configurado'); process.exit(1); }
if (!BLOB_TOKEN) { console.error('❌ BLOB_READ_WRITE_TOKEN no configurado'); process.exit(1); }

const args = process.argv.slice(2);
const SAVE = args.includes('--save');
const ID_FILTER = args.find(a => a.startsWith('--id='))?.split('=')[1];

const sql = neon(DATABASE_URL);

// ── Helpers ────────────────────────────────────────────────────────────────────
function ext(url: string): string {
  const u = new URL(url);
  const path = u.pathname;
  const dot = path.lastIndexOf('.');
  if (dot < 0) return 'jpg';
  const candidate = path.slice(dot + 1).toLowerCase().split('?')[0];
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(candidate) ? candidate : 'jpg';
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SocialPro-migration/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') ?? 'image/jpeg';
  return { buffer, mimeType: ct.split(';')[0] ?? 'image/jpeg' };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📸 migrate-imgur-covers — modo: ${SAVE ? '🔥 SAVE (escritura real)' : '🔍 DRY-RUN'}\n`);

  // 1. Obtener artículos afectados
  let rows: { id: number; slug: string; title: string; cover_url: string }[];
  if (ID_FILTER) {
    rows = await sql`
      SELECT id, slug, title, cover_url
      FROM posts
      WHERE id = ${parseInt(ID_FILTER, 10)}
        AND cover_url ILIKE '%imgur%'
    `;
  } else {
    rows = await sql`
      SELECT id, slug, title, cover_url
      FROM posts
      WHERE cover_url ILIKE '%imgur%'
        AND status = 'published'
      ORDER BY id
    `;
  }

  if (rows.length === 0) {
    console.log('✅ No hay artículos con covers de Imgur. Nada que migrar.');
    return;
  }

  console.log(`Encontrados ${rows.length} artículos:\n`);

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const post of rows) {
    const { id, slug, cover_url } = post;

    // Doble check: ya fue migrado?
    if (cover_url.includes('vercel-storage.com') || cover_url.includes('blob.vercel-storage')) {
      console.log(`  [SKIP] #${id} ${slug} — ya en Vercel Blob`);
      skipped++;
      continue;
    }

    const filename = `news/covers/${slug}.${ext(cover_url)}`;

    if (!SAVE) {
      console.log(`  [DRY]  #${id} ${slug}`);
      console.log(`         origen: ${cover_url}`);
      console.log(`         destino: blob/${filename}`);
      ok++;
      continue;
    }

    try {
      console.log(`  [→]  #${id} ${slug}`);
      const { buffer, mimeType } = await downloadImage(cover_url);
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: mimeType,
        token: BLOB_TOKEN,
      });
      await sql`
        UPDATE posts SET cover_url = ${blob.url} WHERE id = ${id}
      `;
      console.log(`  [✅] ${blob.url}`);
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [❌] #${id} ${slug}: ${msg}`);
      failed++;
    }

    // Pausa entre requests para no saturar Imgur
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\nResumen: ${ok} OK, ${failed} errores, ${skipped} saltados.`);
  if (!SAVE && ok > 0) {
    console.log('\nEjecuta con --save para aplicar los cambios:');
    console.log('  npm run migrate:imgur -- --save');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
