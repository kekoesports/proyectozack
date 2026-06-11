/**
 * publish-minimal-seo.ts — Asigna seoTitle/seoDescription a talentos
 * publicados sin ninguna bio SEO. No escribe seoBioManual (sin contenido
 * generado). Solo fija los meta tags y aprueba el status.
 *
 * npx tsx scripts/publish-minimal-seo.ts --dry   → muestra sin guardar
 * npx tsx scripts/publish-minimal-seo.ts          → aplica en DB
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

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const sql = neon(url);
const DRY = process.argv.includes('--dry');

type MinimalMeta = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
};

// Solo seoTitle + seoDescription — sin seoBioManual (no hay contenido extendido verificado).
// La condición WHERE evita sobrescribir talentos que ya tengan bio aprobada.
const METAS: MinimalMeta[] = [
  {
    slug: 'orroxx',
    seoTitle: 'ORROXX — Creador CS2 España | Twitch & YouTube',
    seoDescription: 'ORROXX, creador de contenido CS2 con 9.1K seguidores en YouTube y 2.6K en Twitch. Gameplay, análisis y entretenimiento gaming hispano. Representado por SocialPro.',
  },
  {
    slug: 'dav1deus',
    seoTitle: 'dav1deus — CS2 Pro Player Chile | Instagram & Twitter',
    seoDescription: 'dav1deus, CS2 pro player chileno con 27.4K seguidores en Instagram y 21.6K en Twitter/X. Contenido competitivo y esports. Representado por SocialPro.',
  },
  {
    slug: 'curlydidsaster',
    seoTitle: 'CurlyDidSaster — Creador CS2 Inversiones & Economía España | YouTube',
    seoDescription: 'CurlyDidSaster, creador especializado en inversiones y economía del ecosistema CS2 en España. Análisis de mercado, skins y trading. Representado por SocialPro.',
  },
  {
    slug: 'zevocs2',
    seoTitle: 'ZevoCS2 — Creador CS2 España | YouTube',
    seoDescription: 'ZevoCS2, creador de contenido CS2 con 4.1K suscriptores en YouTube. Gameplay, tutoriales y análisis del ecosistema CS2 en español. Representado por SocialPro.',
  },
];

async function main(): Promise<void> {
  console.log(`\nAsignando meta SEO a ${METAS.length} talentos${DRY ? ' [DRY RUN]' : ''}...\n`);

  for (const m of METAS) {
    console.log(`→ ${m.slug}`);
    console.log(`  title: ${m.seoTitle}`);
    console.log(`  desc:  ${m.seoDescription.slice(0, 100)}`);

    if (!DRY) {
      const result = await sql`
        UPDATE talents
        SET
          seo_title        = ${m.seoTitle},
          seo_description  = ${m.seoDescription},
          seo_bio_status   = 'approved',
          updated_at       = NOW()
        WHERE slug           = ${m.slug}
          AND is_published   = true
          AND (seo_bio_status IS NULL OR seo_bio_status NOT IN ('approved', 'generated'))
      `;
      console.log(`  ✓ ${(result as unknown as { rowCount?: number }).rowCount ?? '?'} fila(s)`);
    } else {
      console.log('  [skip]');
    }
    console.log();
  }

  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
