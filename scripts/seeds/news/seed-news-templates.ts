/**
 * seed-news-templates — produce un post de cada formato editorial usando
 * los templates de src/lib/news/templates. Sirve de:
 *   - validación viva de los templates
 *   - ejemplos de uso copiables
 *   - contenido inicial para los formatos recurrentes
 *
 * Idempotente por slug. Re-ejecutable.
 *
 * Uso: npx tsx scripts/seeds/news/seed-news-templates.ts
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as schema from '../../../src/db/schema/index';
import { posts } from '../../../src/db/schema/index';
import {
  buildPatchAnalysisPost,
  buildWeeklyWatchPost,
  buildRosterMovesPost,
  buildTier2WatchlistPost,
  buildCreatorHighlightPost,
  type BuiltPost,
} from '../../../src/lib/news/templates';

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
  /* .env.local optional */
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const NOW = new Date();
const day = (n: number) => new Date(NOW.getTime() - n * 86400000);

const BUILTS: BuiltPost[] = [
  // 1 — Patch Analysis
  buildPatchAnalysisPost({
    slug: 'cs2-patch-analysis-spring-update-2026',
    publishedAt: day(0),
    author: 'SocialPro Editorial',
    coverUrl: '/images/news/meta-cs2-mapas-armas-tendencias/cover-1600x900.jpg',
    sortOrder: 220,
    version: 'CS2 Spring Update 2026',
    hook: 'Cambios significativos en utility, smokes interactivas y un par de ajustes de mapa que reabren rotaciones que llevaban meses cerradas.',
    changes: {
      maps: [
        'Mirage: ajuste de timings en mid — los smokes se mantienen 1 segundo menos',
        'Anubis: rework parcial de Connector mejora la rotación CT',
      ],
      weapons: [
        'M4A1-S: ligero ajuste de spread en disparo continuado',
        'Glock-18: animación de recoil más lineal',
      ],
      utility: [
        'Smokes: tiempo de duración reducido en interacción con HE',
        'Molotovs: extinción más rápida sobre superficies metálicas',
      ],
      economy: [
        'Bonificación tras eco round con ganador parcial: ajuste menor',
      ],
    },
    impact: {
      affectedMaps: ['Mirage', 'Anubis'],
      metaShift:
        'Los equipos con utility coordinada en mid van a beneficiarse del cambio de duración de smokes. La adaptación a estos timings va a marcar diferencia en los primeros 6-8 partidos competitivos posteriores al patch.',
      winnersLosers:
        'Rosters fuertes en CT-side de Mirage ganan margen; los que dependían de smokes prolongados en T-side tienen que reescribir su libro de utility.',
    },
    extraTags: ['mapas', 'utility', 'spring-update'],
    reviewNotes: ['Confirmar fecha exacta del despliegue y notas oficiales de Valve antes de promocionar el post'],
  }),

  // 2 — Weekly Watch
  buildWeeklyWatchPost({
    slug: 'que-ver-cs2-semana-19-2026',
    publishedAt: day(1),
    author: 'SocialPro Editorial',
    coverUrl: '/images/news/equipos-tier-2-cs2-seguir/cover-1600x900.jpg',
    sortOrder: 215,
    weekLabel: 'Semana 19',
    narrative:
      'Semana cargada en tier 2 europeo: tres cruces decisivos para clasificación a Main y un partido tier 1 que puede romper rankings.',
    matches: [
      {
        when: 'Lunes 19:00',
        league: 'ESEA Advanced S52',
        teamA: 'CYBERSHOKE',
        teamB: 'PARTIZAN',
        hook: 'CYBERSHOKE llega con racha 7-2 y Mirage como pick fuerte. Si gana asegura plaza Main con una jornada de antelación.',
      },
      {
        when: 'Miércoles 17:30',
        league: 'CCT Europe',
        teamA: 'NEMIGA',
        teamB: 'INTO THE BREACH',
        hook: 'Cambio de roster reciente en NEMIGA. Anubis puede ser el mapa decisor por la presión de pistolas.',
      },
      {
        when: 'Sábado 21:00',
        league: 'CCT Europe',
        teamA: 'GENONE',
        teamB: 'AURA',
        hook: 'GENONE como underdog con resultados recientes contra equipos de presupuesto doble. Inferno es su mapa más fiable este split.',
      },
      {
        when: 'Domingo 19:00',
        league: 'BLAST.tv qualifier',
        teamA: 'FALCONS',
        teamB: 'SPIRIT',
        hook: 'Tier 1 con calendario pesado por delante. Quien gane se posiciona favorito para los primeros majors del año.',
      },
    ],
    storyline:
      'Pre-major: la mayoría de equipos tier 1 están bootcampando esta semana. Las composiciones que veamos en stream van a ser diferentes a lo que aparezca en el major.',
    extraTags: ['esea-advanced', 'cct-europe', 'tier-2-eu', 'tier-1-eu'],
  }),

  // 3 — Roster Moves
  buildRosterMovesPost({
    slug: 'cs2-roster-moves-mayo-2026',
    publishedAt: day(2),
    author: 'SocialPro Editorial',
    coverUrl: null,
    sortOrder: 210,
    period: 'Mayo 2026',
    summary:
      'Mes con varios movimientos significativos: dos AWPs experimentados rotando, un cambio de IGL sorprendente y consolidación de proyectos jóvenes en tier 2.',
    moves: [
      {
        team: '[Equipo A]',
        type: 'in',
        player: '[Jugador]',
        note: 'Fichaje de AWP veterano de tier 1 con presupuesto ajustado. La sinergia con el resto del roster joven puede acelerar la curva del equipo.',
      },
      {
        team: '[Equipo B]',
        type: 'role-change',
        player: '[IGL]',
        note: 'Cambio de IGL inesperado a mitad de split. Los próximos 8 partidos son la prueba real de si la nueva voz coordinada funciona.',
      },
      {
        team: '[Equipo C]',
        type: 'bench',
        player: '[Jugador]',
        note: 'Banco temporal tras racha de bajo rendimiento. La organización mantiene contrato pero busca alternativa de tier 2.',
      },
    ],
    competitiveImpact:
      'Estos movimientos no cambian inmediatamente el ranking competitivo — los equipos que ficharon arriba tendrán 4-6 semanas de adaptación antes de que se note. El cambio de IGL es más decisivo: si la lectura no cuadra, suele ser el primer signo de un split malo.',
    reviewNotes: [
      'Sustituir [Equipo A], [Jugador], [IGL], etc. por nombres reales antes de promocionar',
      'Verificar que los movimientos están confirmados oficialmente (no rumores)',
    ],
    extraTags: ['tier-1-eu', 'tier-2-eu'],
  }),

  // 4 — Tier 2 Watchlist
  buildTier2WatchlistPost({
    slug: 'tier-2-watchlist-cs2-spring-split-2026',
    publishedAt: day(3),
    author: 'ArkeroZ',
    coverUrl: '/images/news/equipos-tier-2-cs2-seguir/cover-1600x900.jpg',
    sortOrder: 205,
    periodLabel: 'Spring split 2026',
    summary:
      'El split de primavera del tier 2 europeo está moviendo más rosters de lo habitual. Esta es la lectura editorial.',
    picks: [
      {
        team: '[Equipo CYB]',
        category: 'fichando-arriba',
        why: 'Fichó AWP veterano hace dos meses. La curva de adaptación está cuajando. Si mantiene la forma actual, puede saltar a Main al cierre del split.',
        strength: 'Mirage CT-side · juego coordinado de utility',
      },
      {
        team: '[Equipo NEM]',
        category: 'reconstruccion',
        why: 'Cayó de tier 1 hace 14 meses. Está reconstruyendo desde Advanced con presupuesto. Forma reciente apunta a recuperación real, no solo proyecto.',
        strength: 'Anubis · presión coordinada en pistolas',
      },
      {
        team: '[Equipo GEN]',
        category: 'outsider',
        why: 'Sin presupuesto grande pero con talento individual notable. Cierra series 2-1 contra equipos con presupuesto doble.',
        strength: 'Inferno · star plays en momentos clutch',
      },
      {
        team: '[Equipo AC1]',
        category: 'academia-consolidada',
        why: 'Academia de organización tier 1 con tres temporadas en Advanced. Cuando esto cuaja, el ascenso a Main es cuestión de splits.',
        strength: 'Map pool amplio · disciplina en eco rounds',
      },
    ],
    reviewNotes: [
      'Sustituir [Equipo CYB], [Equipo NEM], etc. por nombres reales del split actual antes de publicar',
      'Verificar resultados recientes en HLTV antes de promocionar',
    ],
  }),

  // 5 — Creator Highlight
  buildCreatorHighlightPost({
    slug: 'creator-highlight-arkeroz-cs2-analyst',
    publishedAt: day(4),
    author: 'SocialPro Editorial',
    coverUrl: '/images/apuesta-segura-cs2/badge.png',
    sortOrder: 200,
    talentSlug: 'arkeroz',
    creatorName: 'ArkeroZ',
    platform: 'Telegram',
    hook: 'Cinco años analizando la escena competitiva de CS2 desde tier 2 europeo y publicando picks en abierto en Blogabet.',
    highlights: [
      'Histórico público de 109 picks publicadas con +27% yield desde mayo 2025',
      'Cobertura semanal de ESEA Advanced, Main y CCT Europe',
      'Comunidad gratuita en Telegram con análisis previos antes de cada partido',
      'Trabajo editorial dentro del ecosistema SocialPro como tipster principal del proyecto Apuesta Segura CS2',
    ],
    storyline:
      'La cobertura editorial de tier 2 europeo va en aumento — más calendarios, más rosters por seguir y mayor profundidad de análisis previo a cada cruce competitivo.',
    extraTags: ['arkeroz', 'apuesta-segura-cs2', 'analisis', 'tipster'],
    reviewNotes: [
      'Confirmar talent slug "arkeroz" existe en /talentos/[slug] o ajustar antes de publicar',
    ],
  }),
];

async function main() {
  console.log(`Seeding ${BUILTS.length} template-based editorial posts...`);
  for (const p of BUILTS) {
    const existing = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.slug, p.slug))
      .limit(1);

    const baseValues = {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      bodyMd: p.bodyMd,
      coverUrl: p.coverUrl,
      author: p.author,
      status: 'published' as const,
      vertical: 'news' as const,
      publishedAt: p.publishedAt,
      sortOrder: p.sortOrder,
      tags: [...p.tags],
    };

    if (existing.length > 0) {
      await db.update(posts).set(baseValues).where(eq(posts.slug, p.slug));
      console.log(`  ↻  ${p.slug}`);
    } else {
      await db.insert(posts).values(baseValues);
      console.log(`  +  ${p.slug}`);
    }
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
