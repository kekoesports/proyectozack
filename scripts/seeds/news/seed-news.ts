import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as schema from '../../../src/db/schema/index';
import { posts } from '../../../src/db/schema/index';

try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    const unquoted = val.replace(/^["']|["']$/g, '');
    if (key && unquoted && !process.env[key]) process.env[key] = unquoted;
  }
} catch {
  // .env.local not present in CI
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  coverUrl: string | null;
  author: string;
  publishedAt: Date;
  sortOrder: number;
};

const NOW = new Date();
const day = (n: number) => new Date(NOW.getTime() - n * 86400000);

const NEWS: SeedPost[] = [
  // 1 — FEATURED (sortOrder más alto)
  {
    slug: 'apuesta-segura-cs2-canal-oficial-comunidad-gratuita',
    title: 'Apuesta Segura CS2: cómo nace una comunidad de análisis competitivo dentro de SocialPro',
    excerpt:
      'El canal de Telegram de Apuesta Segura CS2 cumple cuatro años publicando picks en abierto y análisis competitivo del tier europeo. Esto es lo que hay detrás.',
    bodyMd: `Apuesta Segura CS2 nació con una idea sencilla: leer la escena competitiva de Counter-Strike y publicar lo que entendíamos sobre cada partido antes de que empezara. Sin promesas, sin VIPs, sin humo. Solo análisis.

Cuatro años después, el canal sigue funcionando con la misma premisa. Cada pick se publica en abierto en Blogabet antes del inicio del partido y queda en histórico público. La comunidad de Telegram lleva el mismo tiempo activa, gratuita, sin upsells.

## Por qué encaja dentro de SocialPro

SocialPro es agencia de gaming y esports. Trabaja con creadores en CS2, Valorant e iGaming, y desde 2012 ha activado campañas con marcas líderes del sector. Pero más allá del trabajo de agencia, hay un proyecto editorial paralelo: leer la escena, entenderla y aportar valor a quien la sigue de cerca.

Apuesta Segura CS2 es ese proyecto. Vive dentro del ecosistema SocialPro como vertical editorial dedicada al análisis competitivo. Y su producto principal —la comunidad gratuita de Telegram— es el sitio donde ese conocimiento se publica antes que en ningún otro lado.

## Lo que encuentras dentro

Picks editoriales con análisis previo. Cobertura del tier 2 y tier 3 europeo, ESEA Main, ESEA Advanced y CCT Europe. Reading de mapas, vetos, rosters y forma reciente. Conversaciones sobre cada partido entre la comunidad, antes y después.

Todo verificable. Todo en abierto. Todo sin pago.

Si vas en serio con la escena CS2, este es el sitio donde estamos publicando.`,
    coverUrl: '/images/apuesta-segura-cs2/og-square.png',
    author: 'ArkeroZ',
    publishedAt: day(0),
    sortOrder: 100,
  },
  // 2 — Análisis
  {
    slug: 'analisis-esea-advanced-temporada-52-equipos-europeos',
    title: 'ESEA Advanced S52: el mapa de los equipos europeos que apuntan a Main',
    excerpt:
      'Una lectura del split actual: quién llega caliente, qué rosters están a medio gas y por qué Mirage va a decidir más partidos de los que parece.',
    bodyMd: `La temporada 52 de ESEA Advanced está en su tramo medio y la foto competitiva del tier 2 europeo se está aclarando. Algunos equipos ya tienen un pie en Main; otros han caído tras cambios de roster que no han cuajado; y un puñado de proyectos jóvenes están sorprendiendo desde abajo.

## Equipos a vigilar

CYBERSHOKE: viene de cerrar 8-2 en Mirage durante las últimas tres semanas. La sinergia entre el AWP y la rotación de utility está siendo el factor diferencial. Si el calendario les respeta, llegan a playoffs cómodos.

NEMIGA: el cambio de roster post-major se notó al principio. Tres derrotas seguidas y caída en la tabla. Pero en las dos últimas jornadas se han recompuesto, especialmente en Anubis, donde la nueva versión del equipo está leyendo mucho mejor las pistolas.

## Mapas que van a decidir

Mirage sigue siendo el mapa con mayor varianza en este split. La mayoría de equipos lo tienen como pick fuerte, lo que significa que cuando dos lo eligen, el resultado depende menos del mapa y más del contexto del torneo —y de las pistolas.

Anubis está creciendo en pickrate respecto a temporadas anteriores. Los equipos están encontrando rotaciones nuevas en mid y la posición de Connector se ha vuelto crítica para los CT.

## Qué esperar de las próximas dos semanas

Tres equipos llegan al cierre con opciones reales de Main. El calendario favorece a quien tenga descanso entre partidos —algo poco habitual a este nivel— y los rosters que han trabajado utility en bootcamp son los que están sacando ventaja en mapas cerrados.

Cobertura completa partido a partido en el canal de Telegram.`,
    coverUrl: '/images/apuesta-segura-cs2/og-square.png',
    author: 'ArkeroZ',
    publishedAt: day(1),
    sortOrder: 90,
  },
  // 3 — Creators
  {
    slug: 'streamers-cs2-espana-latam-roster-socialpro',
    title: 'El roster CS2 de SocialPro en España y LATAM: quién está creciendo y por qué',
    excerpt:
      'Repaso a los streamers de CS2 con los que SocialPro está activando campañas este 2026. Volumen, comunidad y datos de FTD por mercado.',
    bodyMd: `El ecosistema de creadores de CS2 en habla hispana se ha rehecho durante 2025. La salida del juego, la consolidación de plataformas como Blast.tv y la subida del competitivo tier 2 europeo han movido el foco de muchos streamers.

En SocialPro estamos trabajando con un roster que cubre los principales mercados de habla hispana: España, México, Argentina, Colombia, Chile y Perú.

## Perfiles que están creciendo

Streamers que mezclan competitivo con entretenimiento están viendo crecimiento sostenido este año. La diferencia con las primeras épocas del juego es que la audiencia exige más profundidad —no basta con jugar bien, hay que saber explicar qué está pasando en pantalla.

## Activaciones recientes

Las campañas iGaming de los últimos meses con creadores CS2 han mostrado tasas de conversión por encima de la media del sector. La trazabilidad por código personalizado y el FTD tracking que aplicamos en cada activación permite ver qué creator convierte mejor en cada mercado.

## Lo que viene

Estamos abriendo el roster a perfiles emergentes en mercados latinoamericanos. Si trabajas en CS2 con audiencia consolidada y compliance limpio, hablamos.`,
    coverUrl: '/images/logos/2.png',
    author: 'SocialPro Editorial',
    publishedAt: day(2),
    sortOrder: 80,
  },
  // 4 — Comunidad
  {
    slug: 'como-leer-historico-blogabet-tipster-cs2',
    title: 'Cómo leer un histórico de Blogabet sin caer en el primer cherry-pick',
    excerpt:
      'Yield, ROI, profit acumulado, cuota media, winrate. Qué métricas miran los profesionales y cuáles son ruido cuando evalúas a un tipster.',
    bodyMd: `El sector de las apuestas deportivas está lleno de gente que enseña capturas con números bonitos. La mayoría son irrelevantes. Si estás evaluando si seguir a un tipster, hay tres métricas que importan y un par que sólo distraen.

## Yield: la única métrica honesta

Yield es el rendimiento sobre el stake total apostado. Si has apostado 100 unidades y has ganado 7 unidades de profit, tu yield es del 7%. Es la métrica más resistente a sample sizes pequeños y a cuotas extremas.

Un yield sostenido por encima del 5% durante varios meses es trabajo serio. Por encima del 10% es excepcional. Yields del 20-30% en sample sizes de 50 picks son ruido.

## ROI: cuidado con cómo se calcula

ROI mide profit sobre la cantidad arriesgada en posiciones perdidas. Es similar al yield pero más fácil de manipular cambiando la fórmula. Mira siempre el yield primero.

## Sample size: la métrica que nadie menciona

Sin sample size, ninguna otra métrica significa nada. Un tipster con 50 picks y +30% yield no es mejor que uno con 500 picks y +7% yield. La estadística requiere volumen.

## Cómo lo hacemos en Apuesta Segura CS2

Nuestro perfil de Blogabet está abierto. Cualquiera puede ver el histórico completo, pick a pick, con cuota, stake, resultado y fecha. Sin selección posterior, sin cherry-picking, sin "imaginate que solo cuentas las verdes".

Si vas a evaluar a un tipster —el nuestro o cualquier otro— estos son los criterios que importan.`,
    coverUrl: '/images/apuesta-segura-cs2/badge.png',
    author: 'ArkeroZ',
    publishedAt: day(3),
    sortOrder: 70,
  },
  // 5 — Competitivo
  {
    slug: 'roster-moves-cs2-tier-2-europeo-octubre-2026',
    title: 'Movimientos de roster en el tier 2 europeo de CS2: lo importante de octubre 2026',
    excerpt:
      'Cinco cambios significativos en organizaciones de tier 2 que apuntan a Main, y cómo afectan al ranking competitivo del próximo split.',
    bodyMd: `Octubre cerró con varios movimientos relevantes en el tier 2 europeo. Algunos eran esperables, otros han sorprendido a la comunidad. Esta es la lectura competitiva.

## Movimientos clave

Tres equipos han fichado AWPs experimentados venidos de tier 1 con presupuestos ajustados. La consecuencia inmediata: subida del nivel medio en la posición pivote del equipo.

Dos equipos han apostado por jugadores jóvenes salidos de Main. Es un movimiento contracorriente —normalmente la dirección es vender talento joven, no comprarlo— pero refleja que algunas organizaciones están viendo más valor en proyecto que en estabilidad.

## Cómo cambia el equilibrio

Los equipos que han subido nivel en mid-late round tienen ahora más herramientas en mapas como Inferno y Anubis, donde la lectura del clutch potential es decisiva. Los que han apostado por juventud van a depender más del juego coordinado de utility.

## Qué partidos vigilar

Hay tres enfrentamientos en las próximas dos semanas que van a poner a prueba directamente a estos rosters. Cobertura completa por partido en el canal.`,
    coverUrl: null,
    author: 'ArkeroZ',
    publishedAt: day(4),
    sortOrder: 60,
  },
  // 6 — Actualidad
  {
    slug: 'cs2-major-spring-2026-clasificacion-equipos-iberoamericanos',
    title: 'CS2 Major Spring 2026: cómo está la clasificación para equipos iberoamericanos',
    excerpt:
      'Tres equipos hispanohablantes siguen vivos en la fase de clasificación. Qué necesitan para llegar al main event y dónde se decide.',
    bodyMd: `La fase de clasificación al CS2 Major Spring 2026 entra en su recta final con tres equipos de habla hispana todavía con opciones reales.

## Equipos en la lucha

Cada uno llega con una situación distinta. Uno con calendario favorable y forma sólida; otro con un partido decisivo este fin de semana; el tercero pendiente de varios resultados ajenos para mantenerse vivo.

## Lo que necesitan

Para los tres, la matemática es similar: ganar los próximos dos partidos asegura plaza en el main event. Una derrota deja la situación en manos de cómo terminen otros enfrentamientos paralelos.

## Calendario clave

Los partidos del fin de semana tienen máxima audiencia esperada en mercados de España y LATAM. Si la clasificación se decide por map count, hay tres mapas que pueden ser determinantes. Cobertura completa con análisis previo y reading de cada partido en el canal.`,
    coverUrl: null,
    author: 'SocialPro Editorial',
    publishedAt: day(5),
    sortOrder: 50,
  },
  // 7 — Análisis (largo)
  {
    slug: 'preview-cybershoke-vs-partizan-esea-advanced',
    title: 'CYBERSHOKE vs PARTIZAN — Preview ESEA Advanced S52',
    excerpt:
      'Cómo llega cada equipo, qué dice el reading de mapas y dónde están las claves del veto que va a definir el partido.',
    bodyMd: `CYBERSHOKE y PARTIZAN se enfrentan esta noche en una de las jornadas más cargadas de ESEA Advanced S52. Ambos llegan en zona de clasificación, pero por motivos distintos.

## Cómo llega CYBERSHOKE

Racha de 7-2 en sus últimos nueve partidos. Mirage como mapa más fiable —8-2 ahí en este split— y AWP encendido. La rotación de utility en mid es lo que mejor ha funcionado en las últimas semanas.

## Cómo llega PARTIZAN

Más irregular. CT-side estable en Inferno y Nuke pero ronda T inconsistente. La forma del segundo AWP ha caído en las últimas dos series, lo que limita opciones cuando el primer pick no funciona.

## El veto va a decidir

Si llegan a Mirage, partido para CYBERSHOKE. Si lo evitan vetando, PARTIZAN tiene opciones reales en Nuke o Inferno. Anubis es probablemente decider y ahí ninguno de los dos llega especialmente cómodo.

## Lectura final

CYBERSHOKE llega favorito por forma. PARTIZAN tiene plan claro si consigue evitar Mirage en el veto. Análisis completo y stake en el canal de Telegram.`,
    coverUrl: null,
    author: 'ArkeroZ',
    publishedAt: day(6),
    sortOrder: 45,
  },
  // 8 — Análisis preview 2
  {
    slug: 'preview-nemiga-vs-into-the-breach-tier-2',
    title: 'NEMIGA vs INTO THE BREACH — Preview CCT Europe Stage 2',
    excerpt:
      'Cambio de roster reciente en NEMIGA y subida de nivel en Anubis. Qué esperar del cruce.',
    bodyMd: `NEMIGA llega al partido tras tres semanas de adaptación al nuevo roster. Las primeras señales son positivas en mapas concretos, todavía por confirmar la estabilidad general.

## Lo que NEMIGA está haciendo bien

Anubis ha pasado a ser su mapa más estable. La nueva versión del equipo lee mejor las pistolas y la presión coordinada en mid. CT-side sólido y T-side con planes claros.

## Lo que INTO THE BREACH puede explotar

ITB tiene experiencia y juego coordinado de utility. Si el partido va a mapas largos, su consistencia mejora. Mirage es históricamente su mapa más fuerte.

## Por qué Anubis decide

Probablemente sea decider. NEMIGA llega ahí mejor que en Mirage; ITB tiene un veto fuerte si consigue evitarlo. La lectura del primer mapa va a marcar el resto del partido.`,
    coverUrl: null,
    author: 'ArkeroZ',
    publishedAt: day(6),
    sortOrder: 40,
  },
  // 9 — Análisis preview 3
  {
    slug: 'preview-genone-vs-aura-cct-stage',
    title: 'GENONE vs AURA — CCT Europe',
    excerpt:
      'GENONE como underdog con razones para serlo. Por qué Inferno puede ser el mapa decisivo.',
    bodyMd: `GENONE llega al cruce contra AURA con presupuesto significativamente menor pero con resultados que están sorprendiendo a la escena.

## Cómo llega GENONE

Cerró 2-1 contra equipos con presupuesto el doble en las últimas tres jornadas. Inferno es su mapa más fiable este split. Nivel medio sólido y AWP joven creciendo.

## Cómo llega AURA

Forma reciente irregular. Tier 2 estable pero sin picos altos. Sus mapas más fuertes coinciden parcialmente con los de GENONE, lo que puede generar veto cerrado.

## Veto y mapas

Si llegan a Inferno, opciones para GENONE. AURA va a intentar forzar Nuke o Mirage. El decider —probablemente Anubis o Train— es donde se va a romper el partido.`,
    coverUrl: null,
    author: 'ArkeroZ',
    publishedAt: day(6),
    sortOrder: 35,
  },
  // 10 — Actualidad (calendar)
  {
    slug: 'calendario-cs2-2026-fechas-marcadas',
    title: 'Calendario CS2 2026: las fechas que tienes que tener marcadas',
    excerpt:
      'Majors, splits regionales, Spring Update y los cierres de temporada en tier 1 y tier 2. Lo que viene en los próximos seis meses.',
    bodyMd: `2026 ya tiene calendario competitivo cerrado en sus líneas principales. Estas son las fechas que conviene tener marcadas si sigues la escena de cerca.

## Tier 1 internacional

El Major Spring 2026 entra en su recta final de clasificación durante mayo y main event en junio. Es la primera prueba seria del año para los equipos europeos consolidados.

Tras el major, calendario denso de eventos S-Tier durante julio y agosto. La rotación de torneos hace que muchos equipos roten roster y bootcamp para preparar la segunda mitad de temporada.

## Tier 2 europeo

ESEA Advanced Season 52 cierra en mayo con clasificación a Main. Después llega el split de verano con varios equipos jóvenes que apuntan a subir.

CCT Europe mantiene formato similar a 2025: stages mensuales con punto fuerte de competición en septiembre.

## Spring Update

Valve confirmó que la actualización primaveral incluye cambios en el sistema de matchmaking y ajustes a granadas. Sin fecha exacta todavía pero estimada para finales de mayo, antes del major.

## Lo que viene en SocialPro News

Cobertura previa por evento, análisis de cada split y contexto narrativo de los equipos que más se están moviendo.`,
    coverUrl: null,
    author: 'SocialPro Editorial',
    publishedAt: day(7),
    sortOrder: 30,
  },
  // 11 — Actualidad (audiences)
  {
    slug: 'audiencias-twitch-espana-cs2-octubre-2026',
    title: 'Audiencias Twitch España y LATAM en CS2: el récord histórico de octubre',
    excerpt:
      'El streaming de CS2 en habla hispana cerró octubre con cifras récord. Quién marcó el pico, dónde está el crecimiento real y qué dice del estado del juego.',
    bodyMd: `Octubre cerró con cifras de audiencia récord para los streamers hispanohablantes que cubren CS2. Los datos agregados de la región España + LATAM marcan un máximo histórico para el juego en habla hispana.

## Qué cifras se han movido

El conteo de horas vistas en directos sobre CS2 creció respecto al mismo mes del año anterior. Los picos coincidieron con torneos tier 1 y con co-streams de partidos clave de tier 2 europeo.

España lidera en horas vistas. México sigue de cerca. Argentina y Colombia marcan crecimiento sostenido respecto a 2025.

## Dónde está el crecimiento real

No es solo evento puntual. La media mensual ha subido fuera de pico de torneos, lo que indica audiencia recurrente —no flash.

Los streamers que mezclan competitivo con análisis han sido los que mejor han capitalizado el momento. La audiencia exige profundidad: no basta con jugar bien, hay que saber leer la escena.

## Qué dice del juego

CS2 está en mejor momento de audiencia hispana desde su lanzamiento. La escena competitiva tier 2 europea es accesible para audiencia hispana —los horarios son favorables— y eso multiplica las horas vistas en horario prime.

## Implicación para creadores y marcas

El momento es bueno para activar campañas en CS2. La audiencia está en pico y el inventario de streamers verificados —en SocialPro y en otros rosters— está más consolidado que nunca.`,
    coverUrl: null,
    author: 'SocialPro Editorial',
    publishedAt: day(8),
    sortOrder: 25,
  },
];

async function main() {
  console.log(`Seeding ${NEWS.length} news posts...`);

  for (const n of NEWS) {
    const existing = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.slug, n.slug))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(posts)
        .set({
          title: n.title,
          excerpt: n.excerpt,
          bodyMd: n.bodyMd,
          coverUrl: n.coverUrl,
          author: n.author,
          status: 'published',
          vertical: 'news',
          publishedAt: n.publishedAt,
          sortOrder: n.sortOrder,
        })
        .where(eq(posts.slug, n.slug));
      console.log(`  ↻  ${n.slug}`);
    } else {
      await db.insert(posts).values({
        slug: n.slug,
        title: n.title,
        excerpt: n.excerpt,
        bodyMd: n.bodyMd,
        coverUrl: n.coverUrl,
        author: n.author,
        status: 'published',
        vertical: 'news',
        publishedAt: n.publishedAt,
        sortOrder: n.sortOrder,
      });
      console.log(`  +  ${n.slug}`);
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
