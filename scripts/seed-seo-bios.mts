// Siembra seo_bio_generated para talentos con seo_bio_status = 'empty'.
// Solo actualiza los que tienen status 'empty'. No toca 'generated', 'edited', 'approved'.
// Uso: npx tsx scripts/seed-seo-bios.mts [--dry-run]
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('🔍 DRY-RUN — sin cambios en BD\n');

try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const idx = line.indexOf('=');
    if (idx < 0 || line.trimStart().startsWith('#')) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !(process.env[key])) process.env[key] = val;
  }
} catch { /* ignore */ }

const raw = process.env.DATABASE_URL ?? '';
if (!raw) { console.error('DATABASE_URL not set'); process.exit(1); }
const u = new URL(raw); u.searchParams.delete('channel_binding');
const sql = neon(u.toString());

// Bios: slug → texto SEO ~150-200 palabras, tercera persona, datos verificados de DB.
// Talentos omitidos por datos insuficientes: CurlyDidSaster, ZevoCS2, dav1deus, ORROXX.
const BIOS: Record<string, string> = {
  eruby: `ERUBY es streamer y creador de contenido especializado en Counter-Strike 2, con más de 32.000 seguidores en YouTube y más de 31.000 en Twitch. Sus directos y vídeos combinan entretenimiento con análisis técnico del juego, ofreciendo highlights competitivos, tutoriales y una perspectiva cercana de la escena CS2 hispanohablante. Colabora activamente con marcas del ecosistema gaming e iGaming, y ha construido una comunidad fiel que valora su constancia y calidad de producción. ERUBY representa la nueva generación de creadores de CS2 que fusionan el gameplay de alto nivel con contenido de calidad editorial, siendo referente dentro de la escena española de Counter-Strike.`,

  'evelyn-foxyy': `Evelyn Foxyy es creadora de contenido viral y streamer especializada en CS2, conocida principalmente por su comunidad en Instagram donde supera los 139.000 seguidores. Sus formatos incluyen entrevistas a pie de calle y contenido de entretenimiento que conecta la cultura gaming con audiencias generales, logrando viralidad más allá de la comunidad esports tradicional. También está presente en Twitch, donde comparte sus streams de Counter-Strike 2 con su comunidad. Su capacidad para llevar los esports a públicos no especializados la convierte en un perfil único para campañas que buscan alcance masivo y visibilidad transversal en el mercado hispanohablante.`,

  gordoreally: `GordoReally es uno de los streamers de CS2 con mayor comunidad en España, con más de 69.000 seguidores en Twitch y más de 68.000 en Instagram. Activo también en Kick con más de 7.700 seguidores, ha diversificado su presencia en múltiples plataformas de streaming. Su propuesta de contenido combina el entretenimiento gaming con una personalidad cercana y genuina que conecta con audiencias amplias. Sus colaboraciones con marcas del sector iGaming y gaming destacan por la alta confianza que ha construido con su comunidad a lo largo de años de actividad, convirtiéndolo en uno de los perfiles más versátiles de la escena gaming hispanohablante.`,

  hetta: `HETTA es creadora de contenido gaming especializada en Counter-Strike 2, con una destacada presencia en TikTok donde acumula más de 69.000 seguidores, y en YouTube con más de 43.000 suscriptores. Su formato de contenido se adapta a las tendencias de cada plataforma, combinando el análisis del juego con entretenimiento visual que alcanza audiencias amplias más allá de la comunidad tradicional de CS2. En Instagram mantiene una comunidad activa de más de 15.000 seguidores. HETTA es representada por SocialPro y ofrece oportunidades de colaboración para marcas que buscan conectar con la escena de CS2 hispanohablante a través de formatos creativos y multiplataforma.`,

  imantado: `Imantado es uno de los creadores de contenido gaming más relevantes de la escena hispanohablante, con más de 1 millón de seguidores en Twitch y más de 452.000 suscriptores en YouTube. Su contenido abarca desde roleplay en GTA hasta Counter-Strike 2, con una personalidad carismática que ha construido comunidades multimillonarias: más de 647.000 seguidores en X y 351.000 en Instagram. También activo en Kick con más de 71.000 seguidores, Imantado ofrece a las marcas una visibilidad premium con audiencias altamente comprometidas y diversificadas en todas las principales plataformas de contenido digital.`,

  jolu: `JOLU es creador de contenido sevillano especializado en el mercado de inversiones dentro del ecosistema de Counter-Strike 2. Con presencia en YouTube donde supera los 9.700 suscriptores, comparte análisis, guías y actualizaciones sobre skins e inversiones en CS2, combinando conocimiento técnico con un formato entretenido accesible. Mantiene una comunidad activa en Discord con más de 2.100 miembros, donde comparte información exclusiva con sus seguidores más comprometidos. JOLU ocupa un nicho muy específico dentro de la economía del CS2 hispanohablante, siendo referente para audiencias interesadas en el trading y la valorización de activos digitales dentro del juego.`,

  mirai: `Mirai es streamer de Counter-Strike 2 y creadora de contenido originaria de Mallorca, con más de 12.000 seguidores en Twitch donde transmite partidas competitivas y contenido de CS2 de forma regular. Con experiencia consolidada en la plataforma, Mirai combina el gameplay competitivo con un estilo personal cercano que destaca dentro de la escena femenina de los esports hispanohablantes. También presente en Instagram, donde comparte contenido complementario con su comunidad. Representada por SocialPro, Mirai es un referente para marcas gaming e iGaming que buscan conectar con audiencias de la escena de Counter-Strike en España.`,

  peladego: `PelaDego es creadora de contenido multiformato especializada en Counter-Strike 2, con una comunidad sólida en TikTok que supera los 43.000 seguidores y presencia activa en Twitch con más de 19.000 seguidores. Su estilo combina el entretenimiento gaming con formatos cortos de alta difusión, alcanzando audiencias dentro y fuera de la comunidad esports. En Instagram acumula más de 10.000 seguidores y en YouTube más de 6.600 suscriptores, completando una presencia multiplataforma versátil. PelaDego es representada por SocialPro y ofrece a las marcas acceso a audiencias gaming activas en las principales plataformas digitales del mercado español.`,

  uxuu: `UXUSAN es creadora de contenido gaming especializada en Call of Duty, con presencia en Twitch donde acumula más de 10.000 seguidores y en TikTok con más de 16.000 seguidores. Su estilo cercano y entretenido conecta con comunidades gaming en diferentes plataformas, ofreciendo contenido variado dentro del ecosistema de los shooters. También activa en Instagram y X, UXUSAN es representada por SocialPro y ofrece oportunidades de colaboración para marcas del sector gaming que buscan llegar a audiencias hispanohablantes aficionadas a los videojuegos de acción.`,

  yamisanchezz: `Yami Sánchez es creadora de contenido de CS2 con una de las comunidades más amplias de la escena gaming femenina hispana, superando los 104.000 seguidores en TikTok y los 88.000 en Instagram. En Twitch reúne a más de 63.000 seguidores que la siguen por sus partidas competitivas y su personalidad carismática. También activa en X con más de 45.000 seguidores y en Kick, YamiSanchezz ha consolidado una presencia multiplataforma que la convierte en una de las voces más relevantes del CS2 hispanohablante. Sus colaboraciones con marcas gaming e iGaming destacan por el alto engagement y la fidelidad de su comunidad.`,

  zacketizor: `ZaCkETiZOR es creador de contenido especializado en Counter-Strike 2, activo en Twitch con más de 7.800 seguidores y en X donde comparte novedades y análisis de la escena CS2 con más de 3.100 seguidores. Su propuesta de contenido se enfoca en el gameplay competitivo y la comunidad de Counter-Strike 2 hispanohablante, con presencia también en YouTube e Instagram. ZaCkETiZOR es representado por SocialPro dentro del ecosistema de creadores de CS2 en España, ofreciendo a las marcas acceso a audiencias especializadas y comprometidas con la escena competitiva.`,
};

const slugs = Object.keys(BIOS);
console.log(`Bios preparadas para ${slugs.length} talentos: ${slugs.join(', ')}\n`);

if (DRY_RUN) {
  for (const [slug, bio] of Object.entries(BIOS)) {
    console.log(`[${slug}] (${bio.length} chars) — ${bio.slice(0, 80)}…`);
  }
  console.log('\nDRY-RUN completo. Ejecutar sin --dry-run para aplicar.');
  process.exit(0);
}

let ok = 0;
let skip = 0;
for (const [slug, bio] of Object.entries(BIOS)) {
  const result = await sql`
    UPDATE talents
    SET seo_bio_generated = ${bio}, seo_bio_status = 'generated'
    WHERE slug = ${slug} AND seo_bio_status = 'empty'
    RETURNING id, name
  ` as Array<{ id: number; name: string }>;

  if (result.length > 0) {
    console.log(`✅  ${result[0]!.name} (${slug})`);
    ok++;
  } else {
    console.log(`⏭  ${slug} — skipped (status != empty or not found)`);
    skip++;
  }
}

console.log(`\nSiembra completada: ${ok} actualizados · ${skip} saltados`);
console.log('Revisar en admin: /admin/talents/[id]/seo → aprobar cuando listos.');
