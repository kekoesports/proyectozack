/**
 * Inserta el post editorial "Romper barreras mentales" en posts.
 *
 * Cover storage: `public/images/news/` (committed al repo). El Blob store
 * actual está config private (facturas/contratos). Si en el futuro se monta
 * un Blob store público separado, migrar los coverUrl con un script aparte.
 *
 * Run: npx tsx --env-file=.env.local scripts/insert-gentle-mates-astana.ts
 *
 * Idempotente: si el slug ya existe → log y exit 0.
 */
import { eq, desc } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { posts } from '../src/db/schema';

const SLUG = 'gentle-mates-alex-romper-barreras-mentales-astana';
const COVER_URL = '/images/news/gentle-mates-alex-astana.webp';

const TITLE = 'Romper barreras mentales';
const EXCERPT =
  'alex tras la victoria 2-1 frente a K27: «esta era la victoria que necesitábamos». La primera Best-of-3 que Gentle Mates gana desde febrero abre una grieta en una temporada marcada por la presión competitiva.';
const TAGS = ['cs2', 'gentle-mates', 'tier-1', 'pgl-astana-2026'];
const AUTHOR = 'SocialPro Editorial';

const BODY_MD = `Gentle Mates volvió a ganar un Best-of-3.

No es un titular cualquiera. Llevaban desde febrero sin cerrar una serie larga, y el equipo francés llegó a Astana cargando con el peso de no haber clasificado para el Major. La victoria 2-1 sobre K27 en la Swiss Round 2 de PGL Astana 2026 no decide nada — todavía quedan rondas — pero rompe algo más importante que un marcador: una racha mental.

«Esta era la victoria que necesitábamos», dijo alex después del partido. Una frase que un jugador profesional no suele verbalizar sin contexto. Las victorias hay que conquistarlas y ya, sin nombrar el hambre detrás. Que alex lo dijera en directo señala lo que el roster venía cargando desde hace meses.

## El bloqueo

La temporada de Gentle Mates desde febrero ha sido un manual de presión competitiva mal gestionada. No clasificar para el Major es la consecuencia visible, pero el equipo arrastraba algo más profundo: ese estado donde cada veto pesa, cada ronda CT se siente como decisión personal y la confianza colectiva se erosiona partido a partido. En tier 1 europeo, eso no se compensa con más horas de práctica. Se compensa rompiendo el bucle.

Y romperlo, a veces, es solo ganar una serie larga.

## La grieta

El cruce contra K27 no era un partido para tomarse a la ligera. K27 viene jugando bien dentro del format de PGL — agresividad calculada en T-side, lecturas firmes en defensa. Pero Gentle Mates leyó bien el veto, mantuvo la calma en el mapa de desempate y cerró rondas decisivas. No es la victoria que cambia un torneo. Es la victoria que cambia el lenguaje interno del equipo.

«Necesitábamos volver a ganar un BO3», resumió alex. Lo dijo sin épica. Y por eso pesa.

## Reconstrucción en marcha

Llamarlo «reconstrucción» suele sonar grandilocuente, pero en este punto del año encaja. Gentle Mates ha pasado de pelearse con la clasificación al Major a recolocarse en el ranking tier 1 europeo desde el suelo. Astana es el primer torneo donde el roster se permite jugar sin la presión de un cupo Major encima. Para un equipo que viene de meses cargados, eso importa.

El próximo objetivo es claro: encadenar otra serie. En Swiss format una victoria no protege de la siguiente eliminación. Pero al menos ya no se entra a la próxima partida cargando «ocho meses sin ganar un BO3».

## Lo que pesa fuera del servidor

La parte invisible de estas victorias es la mental. alex lleva años en tier 1 — el desgaste acumulado de jugar bajo presión no se cura con un torneo. Se trabaja todos los días, con coaching, con perspective management y con compañeros de roster que sostengan el peso colectivo cuando uno cae. La frase «romper barreras mentales» no es marketing: es lenguaje habitual dentro de la escena profesional cuando un equipo se desbloquea.

Si Gentle Mates encadena dos victorias más en Astana, esta nota dejará de ser sobre presión y pasará a ser sobre proyecto. Si cae, será una victoria aislada en una temporada larga. Esa incertidumbre es lo que hace que el competitivo siga importando.

## Foco hispano

Más allá del partido, Gentle Mates encaja en una conversación que importa fuera de Francia. El club francés ha apostado fuerte por talento español: el roster actual incluye seis jugadores de España. Eso convierte al equipo en uno de los pocos en tier 1 europeo que representa a la vez a Francia y a España, una escena tradicionalmente cerrada para proyectos con núcleo hispano.

Martinez, jugador de la agencia SocialPro, viene siguiendo el recorrido de cerca. Que el equipo vuelva a su mejor versión amplía el menú competitivo que se sigue desde ESP y LATAM.

Astana sigue. La siguiente serie llega esta misma semana.
`;

async function main() {
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
        coverUrl: COVER_URL,
        author: AUTHOR,
        tags: TAGS,
      })
      .where(eq(posts.slug, SLUG))
      .returning({ id: posts.id, slug: posts.slug });
    console.log(`[ok] post actualizado:`, updated);
    process.exit(0);
  }

  console.log(`[2/2] Insertar post en DB`);
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
      coverUrl: COVER_URL,
      author: AUTHOR,
      status: 'published',
      vertical: 'news',
      publishedAt: new Date(),
      sortOrder: nextSortOrder,
      tags: TAGS,
      talentSlugs: null,
    })
    .returning({ id: posts.id, slug: posts.slug, sortOrder: posts.sortOrder });

  console.log(`[ok] post insertado:`, inserted);
  console.log(`  → /news/${inserted?.slug}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
