/**
 * publish-bios.ts — Publica bios SEO revisadas editorialmente para FASE 2.
 *
 * Para cada talento publicable:
 *   - Escribe seoBioManual (bio limpia, sin alucinaciones)
 *   - Corrige seoTitle y seoDescription (muchos tenían juego/rol incorrecto)
 *   - Establece seoBioStatus = 'approved'
 *
 * HOLD (se dejan en 'generated'):
 *   - RINNA: inconsistencia de país, LOL no mencionado en bio, 636 seguidores
 *   - ADAMS: 64 seguidores YT, sin contexto competitivo verificable en bio
 *
 * npx tsx scripts/publish-bios.ts --dry    → muestra cambios sin guardar
 * npx tsx scripts/publish-bios.ts          → aplica cambios en DB
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

// ─────────────────────────────────────────────────────────────────────────────
// Bios revisadas y aprobadas
// ─────────────────────────────────────────────────────────────────────────────

type BioEntry = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoBioManual: string;
};

const BIOS: BioEntry[] = [
  // ── 1. HUASOPEEK ────────────────────────────────────────────────────────────
  // PRO PLAYER CS2 · Chile · Twitch · 27.9K
  // Fix: bio generada mezclaba CS2 (Valve) con Valorant (Riot); seoTitle incorrecto
  {
    slug: 'huasopeek',
    seoTitle: 'HUASOPEEK — Pro Player CS2 de Chile | Twitch',
    seoDescription: 'HUASOPEEK, jugador profesional de CS2 y figura de 9z Team. Streamer chileno con 27.9K seguidores en Twitch. Gestionado por SocialPro.',
    seoBioManual: `HUASOPEEK es un jugador profesional chileno de Counter-Strike 2 y una de las figuras destacadas de 9z Team, organización de esports de referencia en América Latina.

Con más de 27.000 seguidores en Twitch, combina su actividad competitiva con directos orientados a la escena FPS hispanohablante. Su audiencia es mayoritariamente latinoamericana, lo que le convierte en un canal estratégico para marcas que buscan presencia en el mercado gamer de habla hispana.

Como parte del roster de SocialPro, trabaja con marcas del sector gaming mediante colaboraciones estructuradas y campañas con métricas reales.`,
  },

  // ── 2. TODOCS2 ───────────────────────────────────────────────────────────────
  // STREAMER CS2 · España · Twitch · 17.4K + 29.4K YT
  // Se aprovecha el bioLong ya escrito, que es el mejor contenido disponible
  {
    slug: 'todocs2',
    seoTitle: 'TODOCS2 — Streamer CS2 España | Twitch & YouTube',
    seoDescription: 'TODOCS2, streamer de CS2 con 17.4K seguidores en Twitch y 29.4K en YouTube. Audiencia España + LatAm. Códigos KEYDROP y SkinsMonkey. Gestionado por SocialPro.',
    seoBioManual: `TODOCS2 es un streamer de Counter-Strike 2 (CS2) de la escena española con más de 17.000 seguidores en Twitch y más de 29.000 suscriptores en YouTube. Su contenido combina creatividad, análisis del juego y directos de alto nivel que han consolidado una comunidad activa en el mundo del FPS hispano.

La audiencia de TODOCS2 es mayoritariamente de habla hispana: el 60% de sus espectadores está en España, seguido por México (25%) y Argentina (15%). Este perfil geográfico lo convierte en un creador estratégico para marcas que quieren presencia simultánea en el mercado español y latinoamericano dentro del segmento FPS.

Dentro del ecosistema de CS2 en español, TODOCS2 destaca por su estilo de directo intenso y su constancia en la plataforma. Sus espectadores son jugadores comprometidos con el FPS competitivo: un público con alto engagement, resistente al ad-skip y receptivo a integraciones de marca orgánicas dentro del contenido.

Como parte del roster de SocialPro, TODOCS2 trabaja con marcas gaming e iGaming mediante campañas estructuradas: códigos de descuento exclusivos para su comunidad, sorteos con mecánicas verificadas y activaciones en directo con seguimiento real de resultados.`,
  },

  // ── 3. DEQIUV ────────────────────────────────────────────────────────────────
  // STREAMER GTA · España · Twitch · 465.7K
  // Fix crítico: bio generada hablaba de CS2 y Valorant cuando su juego es GTA
  {
    slug: 'deqiuv',
    seoTitle: 'DEQIUV — Streamer GTA Roleplay España | Twitch',
    seoDescription: 'DEQIUV, streamer español de GTA Roleplay con 465.7K seguidores en Twitch. Referente del rol en español. Gestionado por SocialPro.',
    seoBioManual: `DEQIUV es un streamer y creador de contenido español centrado principalmente en GTA Roleplay. Con más de 465.000 seguidores en Twitch, es uno de los streamers de rol en español con mayor audiencia activa de la plataforma.

Su contenido, basado en el roleplay y la narrativa dentro del juego, genera sesiones de larga duración con alto engagement. Este perfil de audiencia lo convierte en una opción estratégica para marcas que quieren impactar en el segmento del entretenimiento streamer hispanohablante.

Como parte del roster de SocialPro, trabaja con marcas del sector gaming e iGaming mediante colaboraciones gestionadas de principio a fin: briefing, integración orgánica y seguimiento de resultados.`,
  },

  // ── 4. MECHA ALVAREZ ─────────────────────────────────────────────────────────
  // STREAMER CS2 · Argentina · Twitch · 50.7K
  // Fix: bio generada decía "escena CS2 española" cuando es argentino
  {
    slug: 'mecha',
    seoTitle: 'MECHA ALVAREZ — Streamer CS2 Argentina | Twitch',
    seoDescription: 'MECHA ALVAREZ, streamer argentino de CS2 con 50.7K seguidores en Twitch. Con historial competitivo, referente del FPS hispanohablante. Gestionado por SocialPro.',
    seoBioManual: `MECHA ALVAREZ es un streamer argentino de Counter-Strike 2 con más de 50.000 seguidores en Twitch. Con historial competitivo a sus espaldas, combina análisis táctico con directos de alto nivel, lo que le ha consolidado como referente del CS2 en la escena hispanohablante.

Su contenido mezcla el juego competitivo con una conexión cercana con su comunidad, un perfil que conecta especialmente con audiencias de Argentina, España y el resto de LatAm interesadas en el FPS.

Como parte del roster de SocialPro, trabaja con marcas gaming mediante campañas orgánicas integradas en su contenido habitual.`,
  },

  // ── 5. MARTINEZ ─────────────────────────────────────────────────────────────
  // PRO PLAYER CS2 · España · Twitch · 45.1K
  // Fix: seoTitle decía "Esports & Variety Streamer" cuando es PRO PLAYER CS2
  {
    slug: 'martinez',
    seoTitle: 'MARTINEZ — Pro Player CS2 España | Twitch',
    seoDescription: 'MARTINEZ, jugador profesional español de CS2 con 45.1K seguidores en Twitch. Referente del competitivo hispanohablante. Gestionado por SocialPro.',
    seoBioManual: `MARTINEZ es un jugador profesional español de Counter-Strike 2 y una de las figuras más reconocidas del competitivo hispanohablante. Con más de 45.000 seguidores en Twitch, comparte su actividad de alto nivel con una comunidad fiel que sigue de cerca el CS2 profesional.

Combina partidas de alto nivel con contenido dirigido a su audiencia, posicionándose como puente entre el esports profesional y los espectadores del FPS en España y LatAm.

MARTINEZ colabora con marcas gaming a través de SocialPro, con campañas que incluyen códigos de descuento, sorteos y activaciones en directo con métricas reales.`,
  },

  // ── 6. Vityshow ─────────────────────────────────────────────────────────────
  // STREAMER VALORANT · España · Twitch · 46.6K
  // Fix: bio no mencionaba Valorant; bio_short incluía "Disponible para colaboraciones" (texto CRM)
  {
    slug: 'vityshow',
    seoTitle: 'Vityshow — Streamer Valorant España | Twitch',
    seoDescription: 'Vityshow, streamer español de Valorant con 46.6K seguidores en Twitch. Personalidad energética y comunidad activa. Gestionado por SocialPro.',
    seoBioManual: `Vityshow es un streamer español de Valorant con más de 46.000 seguidores en Twitch. Su estilo energético y entretenido ha construido una comunidad activa en la plataforma, con especial presencia en el mercado español.

Combina directos de Valorant con contenido gaming variado, lo que amplía su alcance más allá de los seguidores exclusivos del FPS táctico. Un perfil equilibrado entre entretenimiento y competitividad.

Trabaja con marcas gaming e iGaming a través de SocialPro, con colaboraciones integradas en su contenido y seguimiento real de resultados.`,
  },

  // ── 7. NAOW ──────────────────────────────────────────────────────────────────
  // PRO PLAYER CS2 · España · YouTube · 5.3K
  // Fix: seoTitle decía "Gaming Content Creator de Gaming · Variety" cuando es PRO PLAYER CS2
  // Datos verificables: capitán de CarritoSpain (mencionado en bio)
  {
    slug: 'naow',
    seoTitle: 'NAOW — Pro Player CS2 · CarritoSpain | YouTube',
    seoDescription: 'NAOW, jugador profesional de CS2 y capitán de CarritoSpain. Creador de contenido gaming en YouTube. Gestionado por SocialPro.',
    seoBioManual: `NAOW es un jugador profesional de Counter-Strike 2 y capitán de CarritoSpain. Crea contenido especializado en CS2 en YouTube, combinando su experiencia competitiva con un formato accesible para su comunidad.

Su perfil como pro player y creador le permite conectar con una audiencia que valora el juego de alto nivel y el entretenimiento cercano dentro del FPS español.

Representado por SocialPro, trabaja con marcas del sector gaming y esports en colaboraciones alineadas con su comunidad.`,
  },

  // ── 8. SOFFFI ────────────────────────────────────────────────────────────────
  // STREAMER CS2 · Argentina · Twitch · 49.9K
  // Fix: bio usaba "un CS2 Content Creator" (masculino) para una creadora
  {
    slug: 'sofffi',
    seoTitle: 'SOFFFI — Streamer CS2 Argentina | Twitch',
    seoDescription: 'SOFFFI, creadora de contenido argentina de CS2 con 49.9K seguidores en Twitch. Referente femenina del FPS hispanohablante. Gestionado por SocialPro.',
    seoBioManual: `SOFFFI es una creadora de contenido argentina especializada en CS2, con casi 50.000 seguidores en Twitch. Combina habilidad competitiva con entretenimiento variado, y es una de las voces femeninas más reconocidas de la escena FPS hispanohablante.

Sus directos mezclan partidas competitivas con contenido de variedad, lo que amplía su alcance dentro de la comunidad hispana de CS2 en Twitch y YouTube.

Trabaja con marcas del sector gaming e iGaming a través de SocialPro, con colaboraciones que incluyen códigos exclusivos y sorteos para su comunidad.`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Ejecución
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\nPublicando ${BIOS.length} bios${DRY ? ' [DRY RUN — no se guardan cambios]' : ''}...\n`);

  for (const b of BIOS) {
    const preview = b.seoBioManual.slice(0, 80).replace(/\n/g, ' ');
    console.log(`→ ${b.slug.toUpperCase()}`);
    console.log(`  seoTitle: ${b.seoTitle}`);
    console.log(`  seoDesc:  ${b.seoDescription.slice(0, 100)}`);
    console.log(`  bio:      ${preview}...`);

    if (!DRY) {
      await sql`
        UPDATE talents
        SET
          seo_bio_manual   = ${b.seoBioManual},
          seo_title        = ${b.seoTitle},
          seo_description  = ${b.seoDescription},
          seo_bio_status   = 'approved',
          updated_at       = NOW()
        WHERE slug = ${b.slug}
          AND seo_bio_status = 'generated'
      `;
    }
    console.log(`  ${DRY ? '[skip]' : '✓ guardado'}`);
    console.log();
  }

  // Confirmar qué quedó en hold
  if (!DRY) {
    const held = await sql`
      SELECT slug, name, seo_bio_status
      FROM talents
      WHERE seo_bio_status = 'generated'
      ORDER BY sort_order
    `;
    console.log(`\nTalentos en HOLD (status=generated):`);
    for (const r of held) {
      console.log(`  - ${r.name} (${r.slug}): ${r.seo_bio_status}`);
    }
  }

  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
