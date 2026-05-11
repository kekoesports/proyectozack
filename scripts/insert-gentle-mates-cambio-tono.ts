/**
 * Inserta el post editorial "Cambio de tono en Astana" (2-0 vs HEROIC).
 *
 * Cover URL: pendiente. El usuario sube
 *   `public/images/news/gentle-mates-astana-cambio-tono.webp`
 * y vuelve a correr este script para sincronizar el cover_url. Mientras
 * tanto coverUrl=null → NewsCard renderiza el fallback gradient.
 *
 * Run: npx tsx --env-file=.env.local scripts/insert-gentle-mates-cambio-tono.ts
 *
 * Idempotente: si el slug ya existe → UPDATE de title/excerpt/body/cover/tags.
 */
import { existsSync } from 'node:fs';
import { eq, desc } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { posts } from '../src/db/schema';

const SLUG = 'gentle-mates-cambio-tono-astana-2026';
const LOCAL_COVER_PATH = 'public/images/news/gentle-mates-astana-cambio-tono.webp';
const COVER_URL_WHEN_READY = '/images/news/gentle-mates-astana-cambio-tono.webp';

const TITLE = 'Cambio de tono en Astana';
const EXCERPT =
  'Dos victorias en dos días en PGL Astana 2026. Gentle Mates encadena algo que llevaba sin tener desde febrero — y el mensaje no es el marcador, es el tono.';
const TAGS = ['cs2', 'gentle-mates', 'tier-1', 'pgl-astana-2026', 'spain'];
const AUTHOR = 'SocialPro Editorial';

const BODY_MD = `La diferencia entre romper una racha y romper un bloqueo es cuántas veces seguidas se repite el resultado. Después de cerrar la primera Best-of-3 desde febrero contra K27, Gentle Mates lo confirmó al día siguiente: 2-0 a HEROIC.

No son títulos. Es un cambio de tono.

## No es solo el resultado

Lo importante de la segunda victoria no es el marcador frente a un HEROIC que viene cargando con su propia transición de roster. Lo importante es que no fue una repetición del 2-1 sufrido contra K27. Gentle Mates dominó en el primer mapa, mantuvo el control en el segundo y no permitió que el partido se le hiciera largo. La diferencia entre una victoria de aliento y una victoria de momentum.

Para un equipo que llevaba meses cargando con el peso de no clasificar al Major, dos victorias en dos días reescriben más narrativa que un cierre de split bueno. La presión competitiva no se elimina con un partido — se rompe con consistencia.

## La grieta de K27 y la confirmación de HEROIC

K27 fue la grieta: una serie peleada, un mapa de desempate cerrado con calma. HEROIC fue la confirmación: 2-0, ritmo propio, sin entrar en la incomodidad. Dos formas distintas de ganar la misma semana.

HEROIC no llegaba a Astana en su mejor forma, pero sigue siendo HEROIC. La marca pesa. Que Gentle Mates cerrara el cruce sin ceder mapa significa dos cosas: el roster está leyendo bien los duelos individuales y la coordinación táctica del IGL está conectando con la ejecución.

## El roster español que rompe el bloqueo

El proyecto Gentle Mates en CS2 es uno de los pocos en tier 1 europeo que no se construye sobre una mayoría francesa o nórdica. Cinco jugadores españoles starter — alex, dav1g, Martinez, mopoz, sausol — más deLonge en el banco y repk3ys como coach. Toda la línea operativa en español.

Eso, en una escena que históricamente ha tenido el techo competitivo en estructuras del norte de Europa, no es anécdota: es un proyecto que cambia el menú competitivo del que se nutre la conversación CS2 en ESP y LATAM.

## Qué significa en Astana

Dos victorias seguidas en el Swiss stage no clasifican a playoffs. Pero colocan al roster en la zona donde una tercera serie ganada cuenta como narrativa: 3-0 te lleva al top 8 sin pasar por la ronda de eliminación. Si Gentle Mates encadena otra victoria, el evento deja de ser «el primero sin presión Major» y pasa a ser «el primero donde el techo competitivo se mueve».

El siguiente partido decide eso.

## Cierre

Cuando alex habló tras la victoria a K27, lo que verbalizó fue «necesitábamos esto». Tras la segunda, no se cambia el discurso — se valida. Las victorias en CS2 no son píldoras: son curvas. Y la curva del roster español está empezando a girar.

Astana sigue. La siguiente serie llega esta misma semana.
`;

async function main() {
  const coverExists = existsSync(LOCAL_COVER_PATH);
  const coverUrl = coverExists ? COVER_URL_WHEN_READY : null;
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
      .returning({ id: posts.id, slug: posts.slug, coverUrl: posts.coverUrl });
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
