/**
 * update-todocs2-bio.ts — bioLong SEO para TODOCS2
 * Run: npx tsx scripts/update-todocs2-bio.ts
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as schema from '../src/db/schema/index';

try {
  const env = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const raw = trimmed.slice(idx + 1).trim();
    const val = raw.replace(/^["']|["']$/g, '');
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* CI */ }

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no definida');

const db = drizzle(neon(process.env.DATABASE_URL), { schema });

const TODOCS2_BIO_LONG = `TODOCS2 es un streamer de Counter-Strike 2 (CS2) de la escena española con más de 17.000 seguidores en Twitch y más de 29.000 suscriptores en YouTube. Su contenido combina partidas en modo competitivo, análisis del juego y directos de alto nivel que han consolidado una comunidad activa en el mundo del FPS hispano.

La audiencia de TODOCS2 es mayoritariamente de habla hispana: el 60% de sus espectadores está en España, seguido por México (25%) y Argentina (15%). Este perfil geográfico lo convierte en un creador estratégico para marcas que quieren presencia simultánea en el mercado español y latinoamericano dentro del segmento FPS.

Dentro del ecosistema de CS2 en español, TODOCS2 destaca por su estilo de directo intenso y su constancia en la plataforma. Sus espectadores son jugadores comprometidos con el FPS competitivo: un público con alto engagement, resistente al ad-skip y receptivo a integraciones de marca orgánicas dentro del contenido.

Como parte del roster de SocialPro, TODOCS2 trabaja con marcas gaming e iGaming mediante campañas estructuradas: códigos de descuento exclusivos para su comunidad, sorteos con mecánicas verificadas y activaciones en directo con seguimiento real de resultados. El equipo de SocialPro gestiona la colaboración de principio a fin, desde el briefing hasta el informe de métricas.

Para marcas del sector gaming, periféricos, iGaming o cualquier producto orientado a la comunidad gamer española y latinoamericana, TODOCS2 representa un canal directo hacia uno de los públicos más comprometidos del FPS competitivo en habla hispana.`.trim();

const TODOCS2_HIGHLIGHTS = [
  '17.4K seguidores en Twitch',
  '29.4K suscriptores en YouTube',
  'Audiencia España + LATAM',
  'Especialista CS2',
  'FPS competitivo',
];

async function run(): Promise<void> {
  const result = await db
    .update(schema.talents)
    .set({ bioLong: TODOCS2_BIO_LONG, highlights: TODOCS2_HIGHLIGHTS })
    .where(eq(schema.talents.slug, 'todocs2'))
    .returning({ slug: schema.talents.slug });

  if (result.length) {
    console.log(`✓ TODOCS2 bioLong + highlights actualizados (${TODOCS2_BIO_LONG.length} chars)`);
  } else {
    console.warn('⚠ No se encontró talento con slug "todocs2"');
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
