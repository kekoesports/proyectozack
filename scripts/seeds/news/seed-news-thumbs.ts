/**
 * seed-news-thumbs — incorpora los 4 posts editoriales del primer pack de
 * thumbnails premium a la vertical /news.
 *
 * Pipeline asociado:
 *   1. process-thumbs.ts genera public/images/news/<slug>/cover|thumb|og.jpg
 *   2. este script crea el post en DB referenciando esos paths
 *
 * Datos editoriales: redactados con conocimiento de la escena CS2 hasta
 * la fecha de cutoff. Los datos sensibles que cambian rápido están
 * marcados con [REVISAR] para refinar antes de promocionar el post.
 *
 * Idempotente — actualiza por slug si existe.
 *
 * Uso: npx tsx scripts/seeds/news/seed-news-thumbs.ts
 */
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
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local optional
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
  coverUrl: string;
  author: string;
  publishedAt: Date;
  sortOrder: number;
};

const NOW = new Date();
const day = (n: number) => new Date(NOW.getTime() - n * 86400000);
const cover = (slug: string) => `/images/news/${slug}/cover-1600x900.jpg`;

const POSTS: SeedPost[] = [
  // 1 — BLAST Premier Spring Final 2024 (retrospectiva editorial)
  {
    slug: 'blast-premier-spring-final-2024',
    title: 'BLAST Premier Spring Final 2024: favoritos, picks y claves del torneo',
    excerpt:
      'Repaso editorial al BLAST Premier Spring Final 2024 disputado en Londres. Quiénes llegaron como favoritos, cómo se desarrollaron los cruces y qué dejó el torneo para entender el resto de la temporada.',
    bodyMd: `BLAST Premier Spring Final 2024 fue uno de los puntos altos del calendario competitivo de CS2 en la primera mitad de 2024. Ocho equipos clasificados, formato corto y un trofeo que históricamente ha marcado el ritmo competitivo del año.

Esta es nuestra lectura editorial — favoritos confirmados, picks que funcionaron y claves del torneo para entender qué quedó en la escena tras el evento.

## El contexto: cómo llegaba la escena

Spring Final llegó después de varios meses de movimiento intenso entre rosters tier 1. Algunos equipos consolidados venían de buenos resultados en finales internacionales; otros llegaban probando piezas nuevas. La distancia entre los seis primeros del ranking mundial era pequeña.

El factor diferencial: la forma en CS2. El juego llevaba menos de un año en su versión actual, y los equipos que mejor habían adaptado su libro de jugadas a las nuevas mecánicas eran los que más opciones tenían.

## Favoritos confirmados

[Spirit](https://www.hltv.org/team/8297/spirit) llegó como uno de los favoritos claros. Su forma reciente, la consistencia del AWP y la profundidad del roster eran lo que se esperaba ver en grupos competitivos.

Otros nombres que llegaban con expectativa eran [FaZe Clan](https://www.hltv.org/team/6667/faze) —histórico vencedor del formato BLAST en años previos— y [NaVi](https://www.hltv.org/team/4608/natus-vincere), siempre presente en cualquier conversación sobre tier 1.

[REVISAR] resultados específicos del torneo y MVP del evento.

## Lo que dejó el torneo

Tres lecturas que se quedaron en la escena tras el cierre del evento:

1. **El nivel de utility coordinada** marcó la diferencia. En partidos parejos, los equipos con mejor lectura de granadas en mid-rounds ganaron mapas que parecían decididos antes del round 16.
2. **La rotación de mapas** se confirmó: Mirage e Inferno como pickrate alto en tier 1, con Anubis y Vertigo creciendo en uso competitivo.
3. **El roster meta** sigue apuntando a IGL fuertes con AWP de soporte. Los equipos que llegaron con esa estructura tuvieron mejor recorrido.

## Por qué importa para entender el resto de la temporada

BLAST Premier Spring Final 2024 fue tanto un cierre de la primera fase del año como un anticipo de los Majors siguientes. Los equipos que dejaron buena imagen aquí llegaron con narrativa positiva al verano competitivo.

Para audiencia que sigue la escena de cerca, este torneo dejó datos útiles para leer roster moves, expectativas de mapas y rotación de utility. Mucho de lo que vimos en BLAST se confirmó después en eventos posteriores.

> Más coberturas y análisis competitivos en SocialPro News. Si te interesa la lectura partido a partido, el canal de Telegram de Apuesta Segura CS2 publica análisis previos antes de cada cruce.

[REVISAR] cifras de audiencia y prizepool exactos del evento si se incluyen en revisión final.`,
    coverUrl: cover('blast-premier-spring-final-2024'),
    author: 'SocialPro Editorial',
    publishedAt: day(0),
    sortOrder: 200,
  },
  // 2 — Top 5 Picks de la Semana (recurring editorial)
  {
    slug: 'top-5-picks-semana-cs2',
    title: 'Top 5 Picks de la Semana: valor, estadísticas y análisis competitivo',
    excerpt:
      'Cinco picks editoriales con valor real frente a la cuota: contexto, lectura competitiva y por qué creemos que pueden ofrecer rendimiento esta semana. Sin humo, sin volumen forzado.',
    bodyMd: `Cada semana publicamos en el canal de [Apuesta Segura CS2](/apuesta-segura-cs2) entre tres y seis picks editoriales sobre el ecosistema competitivo de Counter-Strike 2. Esta es la selección destacada de la semana — los picks que creemos que mejor combinan contexto, lectura de mapas y valor frente a la cuota.

Lo de siempre: nunca apuestas obligadas, siempre publicadas en abierto antes del partido y con histórico verificable en Blogabet.

## Por qué publicamos solo 5

La premisa del proyecto es que un volumen alto de picks dilye la calidad. Preferimos publicar pocas y bien analizadas — con contexto de mapas, vetos, forma reciente y narrativa del torneo. Si una semana solo encontramos tres picks con valor real, publicamos tres.

## Los 5 destacados

[REVISAR] datos específicos de partidos de esta semana. Esta sección se refrescará semanalmente. Estructura editorial reutilizable:

### 1. ESEA Advanced — equipo A vs equipo B (mapa)

Hook editorial corto sobre por qué hay valor: contexto del split, cuota encontrada, stake calibrado.

### 2. CCT Europe — equipo C vs equipo D (match)

Mismo formato. Lectura de mapas y reading competitivo del cruce.

### 3-5. Picks adicionales

Mismo formato. Cuando la semana lo permite, mezclamos partidos tier 2 europeo con cruces de tier 1 si encontramos valor.

## Cómo leer un pick editorial

Tres datos importan más que la cuota: stake, contexto del partido y cómo encaja con el bankroll. Una pick a 1.85 con stake 2/10 en un partido bien analizado vale más que una pick a 3.00 con stake 5/10 en un partido del que sabemos poco.

[Más sobre cómo leemos un histórico de tipster](/news/como-leer-historico-blogabet-tipster-cs2).

## El histórico está abierto

Cada pick se publica en Blogabet antes del inicio del partido. Cualquiera puede ver el histórico completo, pick a pick, con cuota, stake, resultado y fecha. Sin selección posterior, sin cherry-picking.

Si la lectura competitiva te interesa, el canal de Telegram es donde aterrizan las picks completas con análisis previo.`,
    coverUrl: cover('top-5-picks-semana-cs2'),
    author: 'ArkeroZ',
    publishedAt: day(1),
    sortOrder: 190,
  },
  // 3 — Meta actual de CS2 (analysis)
  {
    slug: 'meta-cs2-mapas-armas-tendencias',
    title: 'Meta actual de CS2: análisis de mapas, armas y tendencias competitivas',
    excerpt:
      'Lectura del estado actual del competitivo de Counter-Strike 2: mapa pool, armas con mejor rendimiento, tendencias de utility y cómo están adaptando los equipos top el libro de jugadas.',
    bodyMd: `El meta competitivo de CS2 ha ido madurando a lo largo de los últimos dieciocho meses. Tras el cambio de motor desde CS:GO, los equipos profesionales han iterado sobre rotaciones, uso de utility y composiciones de roster hasta llegar a un estado más estable.

Este es nuestro reading editorial del meta actual — qué mapas dominan, qué armas marcan diferencia y dónde están las tendencias que más están moviendo a los equipos top.

## Mapa pool: qué se juega y por qué

Los siete mapas competitivos rotan según el calendario de Valve. Lo que vemos en tier 1 e tier 2 europeo:

**Mirage** sigue siendo el mapa con pickrate más alto. Conocido, predecible en composición y con líneas de utility muy aprendidas. Los equipos que lo eligen suelen llegar con plan claro.

**Inferno** se mantiene como uno de los más sólidos. La presión coordinada en banana y la lectura de mid son donde se decide la mayoría de partidos.

**Anubis** ha crecido en pickrate respecto a 2024. Las rotaciones de mid y la posición de Connector han madurado, y muchos equipos lo tienen como pick ofensivo fuerte.

**Nuke** divide a la escena. Equipos que lo trabajan a fondo lo ganan; los que no lo evitan en veto.

**Ancient, Vertigo y Train** completan el pool con uso variable según equipos. Su pickrate sigue siendo más bajo en torneos grandes, pero a tier 2 aparecen con más frecuencia.

[REVISAR] composición exacta del mapa pool si Valve publica updates recientes.

## Armas: qué marca diferencia

El meta de armas en CS2 es razonablemente estable:

- **AK-47** sigue siendo la base T-side. Un kill, un round.
- **M4A1-S vs M4A4** depende del estilo de equipo y del mapa. M4A1-S por silenciador en mapas con líneas largas; M4A4 por capacidad de carga sostenida.
- **AWP** es el arma más decisiva del juego. Los equipos top construyen sus jugadas alrededor de la posición de AWP.
- **Pistolas** — la USP-S y la Glock-18 son base. La Desert Eagle aparece en eco rounds donde los equipos buscan flips de economía.

## Tendencias de utility

Tres tendencias claras en cómo los equipos top usan utility:

1. **Smokes coordinadas** — el cambio de mecánica de smokes (interactuables con HE) ha cambiado las rotaciones. Los equipos que mejor leen cuándo "abrir" un smoke con HE sacan rounds que antes no eran posibles.
2. **Molotovs en mid-late round** — ya no solo para apertura. Los molotovs como denial de retake post-plant son tendencia consolidada.
3. **Granadas flash en setups** — el uso de pop-flashes para abrir bombsites con coordinación de cinco hombres está más afinado que nunca.

## Lectura de fondo

El meta actual premia equipos con buen IGL, AWP fiable y al menos dos jugadores con capacidad de star round. El "lone wolf" que carga rounds solo es cada vez más raro a alto nivel — la coordinación gana.

Para audiencia que sigue la escena: si quieres entender por qué un equipo gana o pierde un mapa, mira la utility usage rate antes que las estadísticas de kills.

> Análisis competitivos previos a cada partido en el canal de [Apuesta Segura CS2](/apuesta-segura-cs2). Match previews semanales en SocialPro News.`,
    coverUrl: cover('meta-cs2-mapas-armas-tendencias'),
    author: 'ArkeroZ',
    publishedAt: day(2),
    sortOrder: 180,
  },
  // 4 — Equipos Tier 2 a seguir (competitivo)
  {
    slug: 'equipos-tier-2-cs2-seguir',
    title: 'Equipos tier 2 de CS2 a seguir: talento, resultados y oportunidades',
    excerpt:
      'Cinco equipos del tier 2 europeo de CS2 que están moviendo la escena: forma reciente, perfil de roster y por qué pueden dar el salto a tier 1 en los próximos splits.',
    bodyMd: `El tier 2 europeo de CS2 es donde se construyen los rosters tier 1 del año siguiente. Equipos jóvenes con talento individual, organizaciones consolidadas que reconstruyen tras cambios y proyectos académicos que están subiendo nivel.

Este es nuestro reading editorial de los equipos tier 2 que más están moviendo la escena ahora mismo — en forma, en talento individual y en posibilidades de dar el salto.

## Por qué importa el tier 2

Para audiencia que sigue la escena de cerca, ignorar el tier 2 es perderse el contexto de lo que viene. Casi todos los nombres que llenan rosters tier 1 hoy pasaron por ESEA Advanced, CCT Europe o competiciones similares antes de subir.

Para audiencias casuales, el tier 2 es donde se ven partidos competitivos con narrativa fresca — equipos que todavía no son nombres consolidados pero juegan con la motivación de quien aspira a serlo.

## Cinco equipos a seguir

### Roster A — fichando arriba

Equipos que están fichando jugadores con experiencia tier 1 a precio bajo. La sinergia de un AWP veterano con un proyecto joven puede acelerar mucho la curva.

[REVISAR] nombres concretos según roster moves recientes. La escena rota cada split.

### Roster B — academia consolidada

Proyectos académicos de organizaciones tier 1 que llevan dos o tres temporadas en tier 2 con buenos resultados. Cuando uno de estos rosters cuaja, el ascenso a Main es cuestión de splits.

### Roster C — proyecto joven

Equipos formados por jugadores sub-21 que están sorprendiendo en ESEA Advanced. La forma sostenida durante varios meses suele anticipar paso a tier 1.

### Roster D — reconstrucción

Organizaciones que cayeron de tier 1 hace uno o dos años y están reconstruyendo desde Advanced. Si tienen presupuesto y paciencia, suelen volver.

### Roster E — outsider

Equipo sin presupuesto grande pero con talento individual notable. Estos rosters son los que más sorprenden cuando aciertan con su veto.

## Qué mirar para detectar tier 2 con futuro

Tres datos editoriales:

1. **Consistencia de mapa pool**. Los rosters tier 2 que ganarán mañana son los que ya tienen tres mapas sólidos hoy.
2. **Forma frente a tier 1**. Cuando un tier 2 saca mapas a un tier 1 en ESL Challenger o similar, es señal.
3. **Estabilidad de roster**. Los equipos que no rotan por seis meses suelen romper su techo.

## Qué viene en cobertura

En SocialPro News mantenemos cobertura editorial de la escena tier 2 europea. Match previews antes de cada cruce relevante, análisis de splits y reading competitivo de los rosters que están moviendo la escena.

[REVISAR] equipos concretos al editar — la lista cambia cada split y conviene actualizar nombres antes de promocionar.

> Análisis previo a cada partido tier 2 europeo en el canal de [Apuesta Segura CS2](/apuesta-segura-cs2).`,
    coverUrl: cover('equipos-tier-2-cs2-seguir'),
    author: 'SocialPro Editorial',
    publishedAt: day(3),
    sortOrder: 170,
  },
];

async function main() {
  console.log(`Seeding ${POSTS.length} thumb-driven editorial posts...`);
  for (const p of POSTS) {
    const existing = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.slug, p.slug))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(posts)
        .set({
          title: p.title,
          excerpt: p.excerpt,
          bodyMd: p.bodyMd,
          coverUrl: p.coverUrl,
          author: p.author,
          status: 'published',
          vertical: 'news',
          publishedAt: p.publishedAt,
          sortOrder: p.sortOrder,
        })
        .where(eq(posts.slug, p.slug));
      console.log(`  ↻  ${p.slug}`);
    } else {
      await db.insert(posts).values({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        bodyMd: p.bodyMd,
        coverUrl: p.coverUrl,
        author: p.author,
        status: 'published',
        vertical: 'news',
        publishedAt: p.publishedAt,
        sortOrder: p.sortOrder,
      });
      console.log(`  +  ${p.slug}`);
    }
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
