# SocialPro News — Editorial Pipeline

Documentación operativa para crear contenido editorial en `/news`. Cubre
el flujo completo: pack visual → procesado de thumbnails → seed de
posts con templates → validación local → producción.

## Flujo end-to-end

```
[creatividad gráfica]               [decisión editorial]
  imagen compuesta                    qué tipo de post
  grid 2×2 de thumbs                  (template existente o
                                       free-form)
       ↓                                       ↓
  process-thumbs.ts                   templates/<formato>.ts
  (sharp + crops)                     (input estricto → BuiltPost)
       ↓                                       ↓
  public/images/news/<slug>/          seed-news-templates.ts
   ├ cover-1600x900.jpg               (idempotente por slug)
   ├ thumb-800x500.jpg                       ↓
   └ og-1200x630.jpg                    DB: posts vertical='news'
       ↓                                       ↓
       └─────────── usado por ──────────→ /news, /news/[slug],
                                          NewsLatestModule, RSS
```

## 1. Crear un nuevo pack de thumbnails

### 1.1. Preparar imagen compuesta

Una imagen única con grid 2×2 (4 cuadrantes), aprox. 1536×1024 px. Cada
cuadrante debe ser una thumbnail editorial completa con:

- Categoría chip arriba
- Título mayúsculas grande
- Subtitle descriptivo
- Visual fuerte (escena CS2, render, etc.)
- Borde sutil

Coloca la imagen en `.scratch/news/source-thumbs.png` (gitignored —
fuera del repo).

> Si el grid no es 2×2 o las dimensiones son distintas, ajusta
> `QUADRANTS` en `process-thumbs.ts` (ver siguiente paso).

### 1.2. Definir cuadrantes y slugs

Edita `scripts/seeds/news/process-thumbs.ts` y actualiza el array
`QUADRANTS` con un slug por cuadrante:

```ts
const QUADRANTS: readonly Quadrant[] = [
  { slug: 'mi-nuevo-post-tl', left: 4, top: 4, width: 760, height: 504 },
  { slug: 'mi-nuevo-post-tr', left: 772, top: 4, width: 760, height: 504 },
  // ...
];
```

**Convención de slugs**: kebab-case, único entre TODOS los posts /news.
La carpeta resultante será `public/images/news/<slug>/`.

### 1.3. Ejecutar el pipeline

```bash
npx tsx scripts/seeds/news/process-thumbs.ts
```

Salida esperada (~1 segundo por cuadrante):
```
Processing 4 thumbnails from .scratch/news/source-thumbs.png...
  ✓ mi-nuevo-post-tl
  ✓ mi-nuevo-post-tr
  ...
Done.
```

Cada slug genera 3 variantes JPG optimizadas (sharp + mozjpeg):

| Variante | Dimensión | Uso | Peso típico |
|---|---|---|---|
| `cover-1600x900.jpg` | 16:9, fit cover | hero featured + detail header | ~140 KB |
| `thumb-800x500.jpg` | 16:10, fit cover | NewsCard grid + trending sidebar | ~56 KB |
| `og-1200x630.jpg` | fit contain con bg sp-black | OpenGraph + Twitter card | ~88 KB |

**No subir el original PNG** al repo — solo los JPG optimizados.

### 1.4. Crear posts en DB

Para cada cuadrante, añade un post al seed correspondiente:

- **Si usa un template editorial**: edita
  `scripts/seeds/news/seed-news-templates.ts` y añade un `build*Post(...)`
  con `coverUrl: '/images/news/<slug>/cover-1600x900.jpg'`.
- **Si es post libre**: edita `scripts/seeds/news/seed-news-thumbs.ts`
  con la estructura `SeedPost` directa.

Ambos seeds son **idempotentes** — re-ejecutables sin duplicar:

```bash
npx tsx scripts/seeds/news/seed-news-thumbs.ts
# o
npx tsx scripts/seeds/news/seed-news-templates.ts
```

### 1.5. Validar en local

```bash
npm run dev                                    # http://localhost:3000/news
npx tsc --noEmit                               # 0 errores
npm run lint                                   # 0 errores nuevos
set -a; source .env.local; set +a; npx next build  # build production
```

Visualmente:
- `/news` — el post aparece en featured/trending si tiene sortOrder alto
- `/news/<slug>` — detail page con cover, body, ecosystem panel
- `/news/feed.xml` — RSS incluye el nuevo post

### 1.6. Commit

```
feat(news): nuevo pack <descripción> + posts editoriales
```

Push automático → Vercel deploy → propagación al edge en ~1-2 min.

## 2. Templates editoriales

5 builders puros con types estrictos en `src/lib/news/templates/`:

| Template | Categoría | Cuándo usar |
|---|---|---|
| `buildPatchAnalysisPost` | Análisis | Cambios Valve sobre meta del juego |
| `buildWeeklyWatchPost` | Actualidad | "Qué ver esta semana" — partidos clave |
| `buildRosterMovesPost` | Análisis | Resumen de fichajes/salidas/cambios IGL |
| `buildTier2WatchlistPost` | Competitivo | 3-7 equipos tier 2 a seguir el split |
| `buildCreatorHighlightPost` | Creators | Perfil de un creator del roster |

Cada template:

- **Requiere input ESTRICTO TS**. El compilador rechaza inputs
  incompletos. La consistencia editorial (estructura H2/H3, tags
  canónicos, footer ecosystem) está garantizada — no depende de la
  disciplina del editor.
- **Soporta `reviewNotes?: string[]`** opcional — bloque "[REVISAR]"
  visible al final del body para recordar al editor qué confirmar
  antes de publicar.
- **Devuelve `BuiltPost`** insertable directo en DB.

Ejemplo:

```ts
import { buildWeeklyWatchPost } from '@/lib/news/templates';

const post = buildWeeklyWatchPost({
  slug: 'que-ver-cs2-semana-20-2026',
  publishedAt: new Date('2026-05-13'),
  author: 'SocialPro Editorial',
  coverUrl: '/images/news/<slug>/cover-1600x900.jpg',
  sortOrder: 220,
  weekLabel: 'Semana 20',
  narrative: 'Cierre de ESEA Advanced y...',
  matches: [
    { when: 'Lun 19:00', league: 'ESEA Advanced',
      teamA: 'TEAM_A', teamB: 'TEAM_B', hook: '...' },
    // ...
  ],
  storyline: 'Pre-major bootcamps...',
  extraTags: ['esea-advanced', 'tier-2-eu'],
  reviewNotes: ['Confirmar horario exacto antes de promocionar'],
});
```

## 3. Tags

Catálogo en `src/lib/news/tags.ts`. Posts pueden usar tags fuera del
catálogo (label fallback humanizado), pero los conocidos obtienen un
label legible.

Cada post lleva tags via campo `tags jsonb`. El `EcosystemPanel` los
usa para encontrar related posts y permitir filtrado en `/news?tag=X`.

Cuando un tag aparece recurrentemente en posts → añadirlo al catálogo
para tener label coherente.

## 4. Categorías editoriales

5 fijas en `src/lib/utils/news.ts`:

- `actualidad` — pink accent
- `analisis` — blue accent
- `creators` — orange accent
- `comunidad` — emerald accent
- `competitivo` — purple accent

La categoría se **deriva automáticamente** del slug + título (regex en
`deriveNewsCategory()`). Los templates baked-in fuerzan tags que
guían la derivación. Si un post seed cae en la categoría incorrecta,
ajustar slug/título o el regex.

## 5. Reutilización de assets

Un mismo cover puede ser usado por varios posts (ej. múltiples templates
que comparten thumbnail visual). El pipeline NO duplica archivos — solo
referencia el path desde el `coverUrl` del post.

Cuando el grupo edite/regenere un thumbnail, basta con re-ejecutar
`process-thumbs.ts` con el slug correspondiente. Todos los posts que
referencian ese path verán la versión nueva sin tocar DB.

## 6. Reglas editoriales

**Sí**:
- Datos verificables o slots `[REVISAR]` claros
- Estructura H2/H3 narrativa
- Footer con cross-link al ecosistema (`/apuesta-segura-cs2`,
  `/talentos`)
- Tags canónicos cuando aplican

**No**:
- Fake stats sin marcar como `[REVISAR]`
- Clickbait casino
- Repetición del copy baked-in del thumbnail (genera redundancia
  visual)
- Estética portal SEO genérico

## 7. Pipeline futuro (no implementado)

Cuando crezca el volumen editorial, el siguiente paso es el pipeline
**Creator → Transcript → Draft → Noticia revisada**. Documentado en
`docs/news-pipeline-creator.md` con types preparados en
`src/lib/news/pipeline.types.ts`. Implementar **solo cuando** el
flujo manual + templates deje de cubrir la cadence deseada.
