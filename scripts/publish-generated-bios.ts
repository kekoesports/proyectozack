/**
 * publish-generated-bios.ts — Aprueba las 11 bios generadas de buena calidad.
 *
 * Copia seo_bio_generated → seo_bio_manual y asigna seoTitle/seoDescription
 * correctos para cada talento. RINNA y ADAMS se quedan en hold.
 *
 * npx tsx scripts/publish-generated-bios.ts --dry   → muestra sin guardar
 * npx tsx scripts/publish-generated-bios.ts          → aplica en DB
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

type BioMeta = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
};

// Bios con contenido generado de calidad aceptable.
// seoTitle/seoDescription escritos manualmente.
// seoBioManual ← seoBioGenerated (copiado en la query).
const BIOS: BioMeta[] = [
  {
    slug: 'eruby',
    seoTitle: 'ERUBY — Streamer CS2 España | YouTube & Twitch',
    seoDescription: 'ERUBY, streamer de CS2 con 32K seguidores en YouTube y 31K en Twitch. Highlights, tutoriales y colaboraciones con marcas gaming e iGaming. Gestionado por SocialPro.',
  },
  {
    slug: 'gordoreally',
    seoTitle: 'GORDO REALLY — Streamer CS2 Argentina | Twitch',
    seoDescription: 'GordoReally, streamer de CS2 con 69K seguidores en Twitch y 68K en Instagram. Entretenimiento gaming y colaboraciones con marcas iGaming. Gestionado por SocialPro.',
  },
  {
    slug: 'yamisanchezz',
    seoTitle: 'YAMISANCHEZZ — Streamer CS2 Argentina | Twitch & TikTok',
    seoDescription: 'YamiSanchezz, creadora de CS2 con 104K TikTok, 88K Instagram y 63K Twitch. Referente gaming femenino hispanohablante. Gestionado por SocialPro.',
  },
  {
    slug: 'mirai',
    seoTitle: 'MIRAI — Streamer CS2 España | Twitch',
    seoDescription: 'Mirai, streamer de CS2 mallorquina con 12K seguidores en Twitch. Contenido competitivo en la escena esports hispanohablante. Gestionado por SocialPro.',
  },
  {
    slug: 'evelyn-foxyy',
    seoTitle: 'EVELYN FOXYY — Creadora CS2 & Contenido Viral España | Instagram',
    seoDescription: 'Evelyn Foxyy, creadora de contenido viral y streamer de CS2 con 139K seguidores en Instagram. Formatos gaming y entrevistas. Gestionado por SocialPro.',
  },
  {
    slug: 'imantado',
    seoTitle: 'Imantado — Streamer CS2 y GTA España | Twitch',
    seoDescription: 'Imantado, creador gaming con más de 1M seguidores en Twitch y 452K en YouTube. CS2 y GTA Roleplay. Gestionado por SocialPro.',
  },
  {
    slug: 'jolu',
    seoTitle: 'JOLU — Creador CS2 Inversiones & Skins España | YouTube',
    seoDescription: 'JOLU, creador especializado en inversiones CS2 con 9.7K suscriptores en YouTube y 2.1K en Discord. Referente trading CS2 hispano. Gestionado por SocialPro.',
  },
  {
    slug: 'hetta',
    seoTitle: 'HETTA — Creadora CS2 Argentina | TikTok & YouTube',
    seoDescription: 'HETTA, creadora de CS2 con 69K TikTok, 43K YouTube y 15K Instagram. Contenido gaming multiplataforma. Gestionado por SocialPro.',
  },
  {
    slug: 'uxuu',
    seoTitle: 'UXUSAN — Creadora Call of Duty España | Twitch & TikTok',
    seoDescription: 'UXUSAN, creadora de Call of Duty con 10K seguidores en Twitch y 16K en TikTok. Gaming femenino hispano. Gestionado por SocialPro.',
  },
  {
    slug: 'peladego',
    seoTitle: 'PelaDego — Creadora CS2 | TikTok & Twitch',
    seoDescription: 'PelaDego, creadora de CS2 con 43K TikTok, 19K Twitch y 10K Instagram. Contenido gaming multiplataforma. Gestionado por SocialPro.',
  },
  {
    slug: 'zacketizor',
    seoTitle: 'ZaCkETiZOR — Creador CS2 España | Twitch',
    seoDescription: 'ZaCkETiZOR, creador de CS2 con 7.8K seguidores en Twitch. Gameplay competitivo y análisis de la escena CS2 hispana. Gestionado por SocialPro.',
  },
];

async function main(): Promise<void> {
  console.log(`\nAprobando ${BIOS.length} bios generadas${DRY ? ' [DRY RUN]' : ''}...\n`);

  for (const b of BIOS) {
    console.log(`→ ${b.slug}`);
    console.log(`  seoTitle: ${b.seoTitle}`);
    console.log(`  seoDesc:  ${b.seoDescription.slice(0, 100)}`);

    if (!DRY) {
      const result = await sql`
        UPDATE talents
        SET
          seo_bio_manual   = seo_bio_generated,
          seo_title        = ${b.seoTitle},
          seo_description  = ${b.seoDescription},
          seo_bio_status   = 'approved',
          updated_at       = NOW()
        WHERE slug            = ${b.slug}
          AND seo_bio_status  = 'generated'
          AND seo_bio_generated IS NOT NULL
      `;
      console.log(`  ✓ ${(result as unknown as { rowCount?: number }).rowCount ?? '?'} fila(s) actualizada(s)`);
    } else {
      console.log('  [skip]');
    }
    console.log();
  }

  if (!DRY) {
    const held = await sql`
      SELECT slug, name FROM talents WHERE seo_bio_status = 'generated' ORDER BY sort_order
    `;
    console.log('Talentos aún en HOLD (generated):');
    for (const r of held) console.log(`  - ${r.name} (${r.slug})`);
  }

  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
