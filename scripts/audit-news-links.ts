/**
 * Audita los artículos de news buscando URLs crudas en body_md
 * (URLs no envueltas en sintaxis markdown [texto](url)).
 *
 * Uso:
 *   npx tsx scripts/audit-news-links.ts            # solo reporte, no escribe
 *   npx tsx scripts/audit-news-links.ts --auto-link # envuelve URLs crudas y guarda en DB
 *
 * Requiere DATABASE_URL en .env.local o en el entorno.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

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

const AUTO_LINK = process.argv.includes('--auto-link');
const DATABASE_URL = process.env.DATABASE_URL ?? '';
if (!DATABASE_URL) { console.error('❌ DATABASE_URL not set'); process.exit(1); }

// Detecta URLs crudas: http(s):// que NO están dentro de ]( ni en un atributo HTML/JSON
// Lookbehind negativo: no precedida por ]( ni por "  '  >  =
const RAW_URL_RE = /(?<!\]\()(?<!["'>= ])https?:\/\/[^\s<>"')\]]+/g;

function labelFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.replace(/\/$/, '');
    const short = path.length > 30 ? path.slice(0, 30) + '…' : path;
    return short ? `${host}${short}` : host;
  } catch {
    return url.slice(0, 40);
  }
}

function wrapRawUrls(bodyMd: string): { body: string; count: number } {
  let count = 0;
  const body = bodyMd.replace(RAW_URL_RE, (url) => {
    count++;
    return `[${labelFromUrl(url)}](${url})`;
  });
  return { body, count };
}

type Post = { id: number; slug: string; title: string; body_md: string };

async function main() {
  const sql = neon(DATABASE_URL);
  const mode = AUTO_LINK ? '✏️  AUTO-LINK' : '🔍 REPORT';
  console.log(`\n${mode} — audit-news-links\n${'─'.repeat(60)}`);

  const posts = await sql`
    SELECT id, slug, title, body_md
    FROM posts
    WHERE vertical = 'news' AND body_md IS NOT NULL
    ORDER BY id
  ` as Post[];

  console.log(`Posts analizados: ${posts.length}\n`);

  let totalFindings = 0;
  const affected: { id: number; slug: string; urls: string[] }[] = [];

  for (const post of posts) {
    const lines = post.body_md.split('\n');
    const findings: { line: number; url: string; context: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      RAW_URL_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = RAW_URL_RE.exec(line)) !== null) {
        const start = Math.max(0, m.index - 20);
        const end = Math.min(line.length, m.index + m[0].length + 20);
        const context = '…' + line.slice(start, end) + '…';
        findings.push({ line: i + 1, url: m[0], context });
        totalFindings++;
      }
    }

    if (findings.length > 0) {
      affected.push({ id: post.id, slug: post.slug, urls: findings.map(f => f.url) });
      console.log(`📄 [${post.id}] ${post.slug}`);
      console.log(`   "${post.title.slice(0, 70)}"`);
      for (const f of findings) {
        console.log(`   Línea ${f.line}: ${f.context}`);
        console.log(`   └─ URL cruda: ${f.url}`);
      }
      console.log();
    }
  }

  console.log('─'.repeat(60));

  if (totalFindings === 0) {
    console.log('✅ Sin URLs crudas detectadas en ningún artículo.\n');
    return;
  }

  console.log(`⚠️  ${totalFindings} URL(s) cruda(s) en ${affected.length} artículo(s).\n`);

  if (!AUTO_LINK) {
    console.log('💡 Ejecuta con --auto-link para envolver automáticamente las URLs crudas.');
    console.log('   npx tsx scripts/audit-news-links.ts --auto-link\n');
    console.log('   O edítalas manualmente en /admin/noticias siguiendo el patrón [texto](url).\n');
    return;
  }

  // AUTO-LINK: envolver y persistir
  let updated = 0;
  for (const post of posts) {
    const { body, count } = wrapRawUrls(post.body_md);
    if (count === 0) continue;

    await sql`
      UPDATE posts
      SET body_md = ${body}, updated_at = now()
      WHERE id = ${post.id}
    `;
    console.log(`  ✅ [${post.id}] ${post.slug} — ${count} URL(s) envuelta(s)`);
    updated++;
  }

  console.log(`\n✅ ${updated} artículo(s) actualizados.`);
  console.log('   Los cambios se propagarán en la web en ≤ 60 s (revalidate=60 en news/[slug]/page.tsx).\n');
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1); });
