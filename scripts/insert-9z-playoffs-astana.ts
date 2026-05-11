/**
 * Inserta el editorial "9z rompe los pronósticos y se mete en playoffs".
 *
 * Run: npx tsx --env-file=.env.local scripts/insert-9z-playoffs-astana.ts
 * Idempotente: UPDATE on slug exist.
 */
import { existsSync } from 'node:fs';
import { eq, desc } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { posts } from '../src/db/schema';

const SLUG = '9z-playoffs-astana-mouz';
const LOCAL_COVER_PATH = 'public/images/news/9z-playoffs-astana-mouz.webp';
const COVER_URL = '/images/news/9z-playoffs-astana-mouz.webp';

const TITLE = '9z rompe los pronósticos y se mete en playoffs de Astana tras tumbar a MOUZ';
const EXCERPT =
  '9z asegura playoffs en PGL Astana 2026 con un 3-0 perfecto en Swiss Stage. La organización argentina elimina a MOUZ 2-1 y confirma que LATAM también pelea por el techo competitivo.';
const TAGS = ['cs2', '9z', 'latam', 'pgl-astana-2026', 'huasopeek', 'tier-1'];
const AUTHOR = 'SocialPro Editorial';

const BODY_MD = `La organización argentina 9z ya está en playoffs de PGL Astana 2026 después de firmar un inicio perfecto de 3-0 en el Swiss Stage y eliminar a uno de los equipos más sólidos del circuito internacional: MOUZ. El conjunto sudamericano cerró la serie por 2-1 y confirma que no han venido a Kazajistán solo a competir — han venido a pelear contra cualquiera.

Y dentro de esa historia hay un nombre especialmente importante para SocialPro: HUASOPEEK. El chileno, parte de nuestra agencia, vuelve a estar presente en una de las grandes historias del Counter-Strike hispanohablante.

## 3-0 perfecto para 9z

El camino de 9z en Astana está siendo una declaración de intenciones.

- Victoria 2-0 contra PARIVISION en ronda 1
- Victoria en ronda 2 para colocarse 2-0
- Y ahora el golpe definitivo: 2-1 contra MOUZ para asegurar playoffs

El equipo sudamericano vuelve a demostrar que puede competir de tú a tú contra rosters top europeos. No es casualidad: ya habían eliminado a MOUZ hace semanas en BLAST Open Rotterdam 2026.

La diferencia es que ahora lo hacen en un escenario todavía más grande.

## HUASOPEEK sigue creciendo en Tier 1

El torneo también supone otro paso adelante para HUASOPEEK dentro de la escena internacional.

El jugador chileno está consolidándose como una pieza importante en el sistema de 9z junto a nombres como dgt, max, meyern y luchov.

Para la escena hispanohablante esto tiene muchísimo valor:

- Chile representado en playoffs Tier 1
- Un roster sudamericano ganando a potencias europeas
- Y una organización latina manteniéndose competitiva en LAN internacional

Todo esto en un momento donde el CS2 de habla hispana vuelve a ganar visibilidad internacional.

## Astana está dejando una narrativa clara

Mientras muchos focos estaban puestos en equipos europeos, Astana está dejando una sensación distinta: los equipos hispanohablantes están empezando a perder el miedo escénico.

Gentle Mates ya había dado señales competitivas importantes en el torneo, y ahora 9z confirma que LATAM también puede pelear playoffs reales.

El mensaje es simple: el gap competitivo sigue existiendo, pero cada vez es menos imposible.

## Lo que viene ahora

9z ya está clasificado a playoffs y llegará con confianza total después de cerrar el Swiss Stage invicto.

El reto ahora cambia:

- mantener nivel en BO3 largos
- gestionar presión de escenario
- y demostrar que esto no es solo una buena semana

Pero pase lo que pase, Astana ya deja una fotografía potente para la comunidad hispanohablante: un equipo latino eliminando a MOUZ y entrando entre los mejores del torneo.

Y HUASOPEEK está dentro de esa historia.
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
      talentSlugs: ['huasopeek'],
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
