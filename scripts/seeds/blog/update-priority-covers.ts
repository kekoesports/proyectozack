/**
 * Seed idempotente — sincroniza `posts.cover_url` con los JPGs renderizados
 * por `scripts/regen-blog-covers-premium.mjs`. Cubre tanto los 3 covers
 * branded (Razer / 1WIN / SkinsMonkey) como los 7 editoriales.
 *
 * Diseño:
 *  - Busca por patrón ILIKE en `slug` (no asumimos el slug exacto)
 *  - Hace UPDATE solo si la fila existe; si no, log warning, no crea nada
 *  - Idempotente: correr N veces produce el mismo estado
 *  - NO toca title, body, status ni ningún otro campo
 *
 * Uso:
 *  - Asegurar que DATABASE_URL está en .env.local o .env.production.local
 *  - npx tsx scripts/seeds/blog/update-priority-covers.ts
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// ── Carga env desde .env.local + .env.production.local ─────────────
function loadEnv() {
  const files = ['.env.local', '.env.production.local'];
  for (const f of files) {
    try {
      const content = readFileSync(join(process.cwd(), f), 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 0) continue;
        const k = t.slice(0, i).trim();
        const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        if (k && v && !process.env[k]) process.env[k] = v;
      }
    } catch {
      /* archivo opcional */
    }
  }
}
loadEnv();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(
    '\n[update-priority-covers] DATABASE_URL no está disponible.\n' +
      'Asegúrate de que .env.local o .env.production.local lo tienen seteado y vuelve a ejecutar.\n',
  );
  process.exit(2);
}

const sql = neon(dbUrl);

// ── Targets — patrón slug + coverUrl deseado ───────────────────────
type Target = {
  readonly label:    string;
  readonly slugLike: string;       // patrón ILIKE
  readonly cover:    string;        // ruta absoluta web del JPG
};

const TARGETS: readonly Target[] = [
  // Branded — case studies con logo de marca
  { label: 'RAZER',          slugLike: '%razer%',                          cover: '/images/blog/razer-socialpro-creadores-gaming.jpg' },
  { label: '1WIN',           slugLike: '%1win-socialpro%',                 cover: '/images/blog/1win-socialpro-influencers-instagram.jpg' },
  { label: 'SKINSMONKEY',    slugLike: '%skinsmonkey-socialpro%',          cover: '/images/blog/skinsmonkey-socialpro-cs2-marketplace.jpg' },
  // Editorial — covers SP logo + título
  { label: 'MONETIZAR YT',   slugLike: 'monetizar-canal-youtube%',         cover: '/images/blog/monetizar-canal-youtube-gaming-2026.jpg' },
  { label: 'GUÍA MARKETING', slugLike: 'guia-marketing-gaming%',           cover: '/images/blog/guia-marketing-gaming-espana-2026.jpg' },
  { label: 'TENDENCIAS LATAM', slugLike: 'tendencias-gaming-latam%',       cover: '/images/blog/tendencias-gaming-latam-2026.jpg' },
  { label: 'CASO HARDWARE',  slugLike: 'caso-exito-campana-gaming%',       cover: '/images/blog/caso-exito-campana-gaming-hardware.jpg' },
  { label: 'GUÍA SPONSOR',   slugLike: 'guia-creadores-conseguir%',        cover: '/images/blog/guia-creadores-conseguir-sponsor.jpg' },
  { label: 'TENDENCIAS ESP', slugLike: 'tendencias-gaming-espana%',        cover: '/images/blog/tendencias-gaming-espana-2025.jpg' },
  { label: 'REGULACIONES',   slugLike: 'regulaciones-igaming-espana%',     cover: '/images/blog/regulaciones-igaming-espana-streamers.jpg' },
];

// ── Run ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n  update-priority-covers — D1 cover refresh\n');

  for (const t of TARGETS) {
    const matches = await sql`
      SELECT id, slug, cover_url
      FROM posts
      WHERE slug ILIKE ${t.slugLike}
    `;

    if (matches.length === 0) {
      console.log(`  ⚠  ${t.label.padEnd(12)} no se encontró ningún post con slug ILIKE ${t.slugLike}`);
      continue;
    }

    if (matches.length > 1) {
      console.log(
        `  ⚠  ${t.label.padEnd(12)} ${matches.length} posts coinciden — actualizando solo el primero por seguridad`,
      );
      console.log(`     candidatos: ${matches.map((m) => m.slug).join(', ')}`);
    }

    const target = matches[0];
    if (!target) continue;

    if (target.cover_url === t.cover) {
      console.log(`  =  ${t.label.padEnd(12)} ya apunta a ${t.cover} (slug=${target.slug})`);
      continue;
    }

    await sql`
      UPDATE posts
      SET cover_url = ${t.cover},
          updated_at = NOW()
      WHERE id = ${target.id}
    `;
    console.log(
      `  ✓  ${t.label.padEnd(12)} cover_url actualizado (slug=${target.slug})\n` +
        `     antes: ${target.cover_url ?? '(null)'}\n` +
        `     ahora: ${t.cover}`,
    );
  }

  console.log('\n  ✅  Done.\n');
}

main().catch((e) => {
  console.error('[update-priority-covers] error:', e);
  process.exit(1);
});
