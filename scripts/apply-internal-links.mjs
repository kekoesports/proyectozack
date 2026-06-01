/**
 * apply-internal-links.mjs
 * Mini-QW-6: aplica 29 enlaces internos en 9 posts de blog + 4 de news.
 * Uso:
 *   node scripts/apply-internal-links.mjs          → dry run (solo muestra diff)
 *   node scripts/apply-internal-links.mjs --apply  → aplica los cambios
 */

import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Leer DATABASE_URL desde .env.local ──────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.slice('DATABASE_URL='.length).trim();
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) dbUrl = dbUrl.slice(1, -1);
    dbUrl = dbUrl.replace(/[&?]channel_binding=require/, '');
    break;
  }
}
if (!dbUrl) { console.error('DATABASE_URL no encontrada'); process.exit(1); }

const sql = neon(dbUrl);
const DRY_RUN = !process.argv.includes('--apply');

// ── Definición de cambios ────────────────────────────────────────────────────
// Formato: { slug, replacements: [ { from, to } ], append? }
const CHANGES = [

  // ── BLOG: 1win ──────────────────────────────────────────────────────────────
  {
    slug: '1win-socialpro-100-influencers-instagram-igaming',
    replacements: [
      { from: '1WIN necesitaba', to: '[1WIN](/marcas/1win) necesitaba' },
      { from: 'gaming e iGaming. El reto', to: 'gaming e [iGaming](/servicios/igaming). El reto' },
      { from: '**8M+ de alcance acumulado** en Instagram', to: '**[8M+ de alcance acumulado](/casos/onewin)** en Instagram' },
      { from: 'en España o Latinoamérica y quieres', to: 'en [España o Latinoamérica](/agencia-gaming-latam) y quieres' },
      { from: 'resultados medibles, hablemos.', to: 'resultados medibles, [hablemos](/contacto).' },
    ],
  },

  // ── BLOG: SkinsMonkey ───────────────────────────────────────────────────────
  {
    slug: 'skinsmonkey-socialpro-200000-euros-cs2-skins-marketplace',
    replacements: [
      { from: 'SkinsMonkey detectó esta oportunidad', to: '[SkinsMonkey](/marcas/skinsmonkey) detectó esta oportunidad' },
      { from: 'SocialPro seleccionó 13 creadores con las siguientes características:', to: 'SocialPro seleccionó [13 creadores especializados en CS2](/cs2-influencer-marketing) con las siguientes características:' },
      { from: 'contacta con SocialPro.', to: '[contacta con SocialPro](/contacto).' },
    ],
    append: '\n\nResultados verificados disponibles en el [caso de éxito completo de SkinsMonkey](/casos/skinsmonkey).',
  },

  // ── BLOG: Razer ─────────────────────────────────────────────────────────────
  {
    slug: 'socialpro-razer-activacion-creadores-gaming',
    replacements: [
      { from: 'Cuando RAZER buscaba reforzar', to: 'Cuando [RAZER](/marcas/razer) buscaba reforzar' },
    ],
  },

  // ── BLOG: Monetizar YouTube ─────────────────────────────────────────────────
  {
    slug: 'monetizar-canal-youtube-gaming-2026',
    replacements: [
      { from: 'gestión del compliance regulatorio cuando trabajas con marcas de iGaming', to: 'gestión del [compliance regulatorio](/guia-dgoj-igaming-influencers) cuando trabajas con marcas de iGaming' },
      { from: 'Especialmente habitual en iGaming, herramientas gaming', to: 'Especialmente habitual en [iGaming](/servicios/igaming), herramientas gaming' },
    ],
  },

  // ── BLOG: Guía marketing gaming ─────────────────────────────────────────────
  {
    slug: 'guia-marketing-gaming-espana-2026',
    replacements: [
      { from: 'la agencia tiene que conocer la regulación DGOJ y tener protocolos', to: 'la agencia tiene que conocer la [regulación DGOJ](/guia-dgoj-igaming-influencers) y tener protocolos' },
    ],
  },

  // ── BLOG: Tendencias LATAM ──────────────────────────────────────────────────
  {
    slug: 'tendencias-gaming-latam-2026',
    replacements: [
      { from: 'gestionado por la DGOJ, en LatAm', to: 'gestionado por la [DGOJ](/guia-dgoj-igaming-influencers), en LatAm' },
      { from: 'la escena CS2 hispanohablante en LatAm tiene', to: 'la escena [CS2](/cs2-influencer-marketing) hispanohablante en LatAm tiene' },
      { from: 'Para marcas de iGaming que quieren activar campañas en LatAm', to: 'Para marcas de [iGaming](/servicios/igaming) que quieren activar campañas en LatAm' },
    ],
  },

  // ── BLOG: Caso hardware ─────────────────────────────────────────────────────
  {
    slug: 'caso-exito-campana-gaming-hardware',
    replacements: [
      { from: 'un streamer de CS2 con 8.000-15.000 espectadores medios', to: 'un [streamer de CS2](/cs2-influencer-marketing) con 8.000-15.000 espectadores medios' },
    ],
  },

  // ── BLOG: Guía sponsors ─────────────────────────────────────────────────────
  {
    slug: 'guia-creadores-conseguir-sponsor',
    replacements: [
      { from: 'la normativa DGOJ obliga a los operadores', to: 'la [normativa DGOJ](/guia-dgoj-igaming-influencers) obliga a los operadores' },
      { from: 'En iGaming, los CPA pueden oscilar', to: 'En [iGaming](/servicios/igaming), los CPA pueden oscilar' },
      { from: 'Una marca de hardware como RAZER o Logitech', to: 'Una marca de hardware como [RAZER](/marcas/razer) o Logitech' },
    ],
  },

  // ── BLOG: Tendencias España 2025 ────────────────────────────────────────────
  {
    slug: 'tendencias-gaming-espana-2025',
    replacements: [
      { from: 'Dirección General de Ordenación del Juego (DGOJ) ha endurecido', to: '[Dirección General de Ordenación del Juego (DGOJ)](/guia-dgoj-igaming-influencers) ha endurecido' },
      { from: 'los streamers de CS2 acumulan más de 4 millones', to: 'los [streamers de CS2](/cs2-influencer-marketing) acumulan más de 4 millones' },
      { from: 'los 340 FTDs en activaciones específicas', to: 'los [340 FTDs en activaciones específicas](/casos/onewin)' },
      { from: 'categorías como iGaming, periféricos, energéticas, servicios financieros y tecnología', to: 'categorías como [iGaming](/servicios/igaming), periféricos, energéticas, servicios financieros y tecnología' },
    ],
  },

  // ── NEWS: 9z Astana ─────────────────────────────────────────────────────────
  {
    slug: '9z-playoffs-astana-mouz',
    replacements: [
      { from: 'SocialPro: HUASOPEEK.', to: 'SocialPro: [HUASOPEEK](/talentos/huasopeek).' },
    ],
  },

  // ── NEWS: Carritos Spain ────────────────────────────────────────────────────
  {
    slug: 'carritos-spain-gana-la-cs2-spanish-circuit-sin-perder-ni-un-solo-mapa',
    replacements: [
      { from: 'NaOw ha conquistado', to: '[NaOw](/talentos/naow) ha conquistado' },
    ],
  },

  // ── NEWS: Gentlemates CCT ────────────────────────────────────────────────────
  {
    slug: 'gentlemates-conquista-la-cct-europe-series-2-y-recupera-sensaciones-tras-varias-semanas-complicadas',
    replacements: [
      { from: 'Antonio "MartinezSa" Martínez', to: 'Antonio "[MartinezSa](/talentos/martinez)" Martínez' },
    ],
  },

  // ── NEWS: 9z Magic Astana ────────────────────────────────────────────────────
  {
    slug: '9z-y-magic-se-juegan-el-puesto-de-equipo-revelacion-en-astana',
    replacements: [
      { from: 'juega **MartínezSa**, ex jugador', to: 'juega **[MartínezSa](/talentos/martinez)**, ex jugador' },
    ],
  },
];

// ── Ejecutar ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(70)}`);
console.log(DRY_RUN ? '  DRY RUN — sin cambios en BD' : '  APPLY — escribiendo en BD');
console.log(`${'─'.repeat(70)}\n`);

let totalLinks = 0;
let totalPosts = 0;
let errors = 0;

for (const change of CHANGES) {
  const rows = await sql`SELECT body_md FROM posts WHERE slug = ${change.slug}`;
  if (!rows.length) {
    console.error(`  ✗ POST NO ENCONTRADO: ${change.slug}`);
    errors++;
    continue;
  }
  let body = rows[0].body_md;
  let modified = false;
  const diffs = [];

  for (const { from, to } of change.replacements) {
    if (!body.includes(from)) {
      console.warn(`  ⚠  FRAGMENTO NO HALLADO en ${change.slug}:\n     "${from}"`);
      errors++;
      continue;
    }
    diffs.push({ from, to });
    body = body.replace(from, to);
    modified = true;
    totalLinks++;
  }

  if (change.append) {
    diffs.push({ from: '(append al final)', to: change.append.trim() });
    body = body + change.append;
    modified = true;
    totalLinks++;
  }

  if (modified) {
    totalPosts++;
    console.log(`\n  📄 ${change.slug}`);
    for (const d of diffs) {
      const truncFrom = d.from.length > 55 ? d.from.slice(0, 52) + '…' : d.from;
      const truncTo   = d.to.length   > 55 ? d.to.slice(0, 52)   + '…' : d.to;
      console.log(`     ← "${truncFrom}"`);
      console.log(`     → "${truncTo}"`);
    }

    if (!DRY_RUN) {
      await sql`UPDATE posts SET body_md = ${body} WHERE slug = ${change.slug}`;
      console.log(`     ✓ actualizado`);
    }
  }
}

console.log(`\n${'─'.repeat(70)}`);
console.log(`  Posts modificados : ${totalPosts}`);
console.log(`  Links añadidos    : ${totalLinks}`);
if (errors) console.log(`  Errores/warnings  : ${errors}`);
console.log(`  Modo              : ${DRY_RUN ? 'DRY RUN (sin cambios)' : 'APLICADO'}`);
console.log(`${'─'.repeat(70)}\n`);
