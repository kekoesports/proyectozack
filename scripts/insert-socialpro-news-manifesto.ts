/**
 * Inserta el manifesto "Nace una nueva voz para el CS2 hispanohablante".
 * NO usa PostBlocks layout (sin match/quote/embed/roster) — solo body MD.
 *
 * Run: npx tsx --env-file=.env.local scripts/insert-socialpro-news-manifesto.ts
 * Idempotente: si el slug ya existe, UPDATE de title/excerpt/body/cover/tags.
 */
import { existsSync } from 'node:fs';
import { eq, desc } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { posts } from '../src/db/schema';

const SLUG = 'nace-socialpro-news';
const LOCAL_COVER_PATH = 'public/images/news/socialpro-news-manifesto.webp';
const COVER_URL = '/images/news/socialpro-news-manifesto.webp';

const TITLE = 'Nace una nueva voz para el CS2 hispanohablante';
const EXCERPT =
  'Queremos contar la escena desde dentro. Cobertura competitiva, historias, foco España y LATAM, streams y comunidad — una nueva plataforma editorial para el CS2 hispano.';
const TAGS = ['socialpro-news', 'cs2', 'editorial', 'spain', 'latam'];
const AUTHOR = 'SocialPro Editorial';

const BODY_MD = `Durante años, gran parte de la conversación competitiva de Counter-Strike en español ha vivido fragmentada entre streams, tweets, clips sueltos y resultados rápidos. Mucha información, pero poco contexto. Mucho ruido, pero pocas historias bien contadas.

Por eso nace **SocialPro News**.

Una nueva plataforma editorial enfocada en el ecosistema hispanohablante de CS2, creada para dar visibilidad a jugadores, equipos, competiciones, creadores y proyectos que forman parte de la escena competitiva cada día.

No queremos ser solo «otra web de noticias». Queremos construir un espacio donde el competitivo se explique desde dentro.

---

## ¿Qué vas a encontrar en SocialPro News?

### Cobertura competitiva real

Seguiremos tanto circuitos internacionales como escenas nacionales y tier 2 europeas. Desde PGL, BLAST o ESL hasta ligas regionales, torneos nacionales, talento emergente y equipos que normalmente quedan fuera del foco principal.

Porque la escena no empieza ni termina en el top 5 mundial.

---

### Historias y entrevistas

No solo queremos publicar resultados. Queremos hablar con jugadores, coaches, creadores y personas que viven la escena desde dentro:

- entrevistas
- análisis editoriales
- historias personales
- evolución de equipos
- presión competitiva
- funcionamiento interno de organizaciones

CS2 tiene muchísimo más detrás de un marcador.

---

### Foco en España y LATAM

Uno de los pilares principales del proyecto será conectar la escena hispanohablante:

- España
- Argentina
- Chile
- México
- Uruguay
- Perú
- Colombia
- LATAM competitivo

Creemos que existe una nueva generación de talento que merece mucha más visibilidad.

---

### Streams, comunidad y creadores

SocialPro News también servirá como hub para:

- streams en directo
- creadores de CS2
- análisis de partidos
- picks competitivos
- movimientos de roster
- jugadores a seguir
- escenas tier 2 y academy

La idea es crear un ecosistema vivo, no únicamente un blog estático.

---

## Un proyecto creado desde la escena

SocialPro lleva más de 13 años trabajando dentro de los esports y el gaming. Hemos vivido clasificatorios, viajes, torneos, bootcamps, management, creación de contenido, campañas, presión competitiva y desarrollo de talento.

Y precisamente por eso creemos que hacía falta una plataforma así.

Una cobertura más cercana. Más editorial. Más humana. Más conectada con la comunidad.

---

## Esto es solo el comienzo

SocialPro News arranca hoy, pero el objetivo es crecer junto a la escena. Nuevas entrevistas. Más cobertura. Más historias. Más visibilidad para el competitivo hispanohablante.

Porque CS2 en español también merece su espacio.

Bienvenidos a SocialPro News.
`;

async function main() {
  const coverExists = existsSync(LOCAL_COVER_PATH);
  const coverUrl = coverExists ? COVER_URL : null;
  console.log(`[cover] ${coverExists ? '✓ encontrada' : '✗ pendiente'} — ${LOCAL_COVER_PATH}`);

  console.log(`[1/2] Check si slug "${SLUG}" ya existe...`);
  const existing = await db.query.posts.findFirst({
    where: eq(posts.slug, SLUG),
    columns: { id: true, slug: true },
  });

  if (existing) {
    console.log(`[update] post existe (id=${existing.id}) — sincronizo title/excerpt/body/cover/tags`);
    const [updated] = await db
      .update(posts)
      .set({
        title: TITLE,
        excerpt: EXCERPT,
        bodyMd: BODY_MD,
        coverUrl,
        author: AUTHOR,
        tags: TAGS,
      })
      .where(eq(posts.slug, SLUG))
      .returning({ id: posts.id, slug: posts.slug });
    console.log('[ok] post actualizado:', updated);
    process.exit(0);
  }

  console.log('[2/2] Insertar post en DB');
  const maxRow = await db
    .select({ sortOrder: posts.sortOrder })
    .from(posts)
    .where(eq(posts.vertical, 'news'))
    .orderBy(desc(posts.sortOrder))
    .limit(1);
  const nextSortOrder = (maxRow[0]?.sortOrder ?? 0) + 10;

  const [inserted] = await db
    .insert(posts)
    .values({
      slug: SLUG,
      title: TITLE,
      excerpt: EXCERPT,
      bodyMd: BODY_MD,
      coverUrl,
      author: AUTHOR,
      status: 'published',
      vertical: 'news',
      publishedAt: new Date(),
      sortOrder: nextSortOrder,
      tags: TAGS,
      talentSlugs: null,
    })
    .returning({ id: posts.id, slug: posts.slug, sortOrder: posts.sortOrder });

  console.log('[ok] post insertado:', inserted);
  console.log(`  → /news/${inserted?.slug}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
