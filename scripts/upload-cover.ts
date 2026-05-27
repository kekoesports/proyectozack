/**
 * Sube una imagen a Vercel Blob y devuelve la URL pública.
 * Uso: npx tsx scripts/upload-cover.ts <ruta-imagen>
 */
import { readFileSync } from 'fs';
import { join, basename, extname } from 'path';

try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {}

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? '';
if (!TOKEN) { console.error('❌ BLOB_READ_WRITE_TOKEN not set'); process.exit(1); }

const filePath = process.argv[2];
if (!filePath) { console.error('❌ Usage: npx tsx scripts/upload-cover.ts <file>'); process.exit(1); }

async function main() {
  const file = readFileSync(filePath);
  const name = basename(filePath);
  const ext  = extname(name).replace('.', '').toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
             : ext === 'png'  ? 'image/png'
             : ext === 'webp' ? 'image/webp'
             : 'application/octet-stream';

  const uploadPath = `news/covers/${name}`;
  console.log(`Uploading ${name} (${(file.length / 1024).toFixed(1)} KB) → ${uploadPath}`);

  const res = await fetch(`https://blob.vercel-storage.com/${uploadPath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': mime,
      'x-content-type': mime,
    },
    body: file,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Upload failed (${res.status}):`, err);
    process.exit(1);
  }

  const data = await res.json() as { url: string };
  console.log(`\n✅ URL: ${data.url}\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
