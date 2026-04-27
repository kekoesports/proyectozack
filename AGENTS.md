# AGENTS.md — SocialPro

> Next.js 16 · React 19 · TypeScript strict · Tailwind v4 · Drizzle ORM · Neon Postgres · Better Auth · Zod v4 · motion v12+
> See `CLAUDE.md` for project overview, architecture, and hard lessons. See `roadmap.md` for migration phases.

## Commands

```bash
npm run dev                    # dev server :3000
npm run build                  # production build
npm run lint                   # eslint
npx tsc --noEmit               # typecheck (run after every change)

# Unit tests (Jest — 3 projects: client, server, fuzz)
npm test                       # all tests
npm test -- --testPathPattern="contact"               # single test by name
npm test -- --selectProjects server                    # server tests only
npm test -- --selectProjects client                    # client tests only
npm run test:fuzz                                      # property-based (fast-check)
npm run test:watch                                     # watch mode
npm run test:coverage                                  # with coverage

# E2E (Playwright — Chromium, auto-starts dev server)
npm run test:e2e                          # all e2e
npx playwright test e2e/contact.spec.ts   # single e2e file

# Database
npx drizzle-kit generate       # generate migration SQL from schema changes
npm run migrate                # apply migrations via neon-http (matches app driver)
# Note: do NOT use `npx drizzle-kit migrate` — it uses @neondatabase/serverless
# over websockets and hangs in this project. Use `npm run migrate` instead,
# which runs scripts/migrate.ts using the same neon-http driver as src/lib/db.ts.
```

Test files live at `src/__tests__/{client,server}/**/*.test.ts(x)` and `src/__tests__/fuzz/**/*.fuzz.ts`.
E2E tests live at `e2e/`.

## Code Style

### Imports — 4 tiers, blank line between groups

```ts
// 1. External packages
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
// 2. Internal lib / db
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
// 3. Components
import { SectionTag } from '@/components/ui/SectionTag';
// 4. Type-only (use `import type`)
import type { TalentWithRelations } from '@/types';
```

`@/*` maps to `src/*`. Use `import type` for type-only imports (enforced by `verbatimModuleSyntax`).

### Naming

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase file + named export | `TalentCard.tsx` → `export function TalentCard()` |
| Pages/layouts | default export | `export default async function HomePage()` |
| Queries | camelCase, verb-first | `getTalents()`, `getCaseBySlug()` |
| Types | PascalCase, `type` (never `interface`) | `type TalentWithRelations = { ... }` |
| Schema tables | camelCase TS / snake_case SQL | `talentSocials` → `talent_socials` |
| Constants | UPPER_SNAKE_CASE | `NAV_LINKS`, `FILTERS` |
| CSS tokens | `sp-` prefix | `bg-sp-black`, `text-sp-muted2` |

### Formatting

- 2-space indent, single quotes, semicolons, trailing commas.
- Double quotes only in JSX attributes (`className="..."`).
- Files under 500 LOC. Split when exceeded.

### TypeScript

- `type` over `interface`, always.
- Explicit return types on all exported functions.
- `readonly` props by default.
- No `any` — use `unknown` + type guards.
- No `@ts-ignore`, `@ts-expect-error`, or `!.` assertions.
- `row ?? undefined` — never return `null` from queries.
- Always `safeParse`, never `parse` (Zod).

### Exports

- Components: **named exports** only. Never `export default` except pages/layouts.
- Query files: named exports. Admin variants below a `// ── Admin ──` separator.
- Types: re-exported from `src/types/index.ts` via `InferSelectModel`.

### Error Handling

- API routes: parse body as `unknown` → Zod `safeParse` → 400/422 on failure.
- Catch pattern: `err instanceof Error ? err.message : 'unknown'`.
- Console: `console.error('[context] description:', msg)` with bracketed tag.
- Side effects (email): isolated try/catch, failures never block the response.
- Client forms: status machine `'idle' | 'sending' | 'ok' | 'error'`, never expose server errors.

## Key Patterns

### Server vs Client Components

- **Server** (default): no directive, `async`, fetches data directly, passes props down.
- **Client**: `'use client'` at top, receives all data via props, no DB calls.
- Motion: `import * as m from 'motion/react-client'`; AnimatePresence from `'motion/react'`.

### Queries (`src/lib/queries/`)

- Public queries filter `visibility = 'public'`. Admin queries (`getAll*`) skip it.
- Single-item lookups: wrap in `cache()` from React.
- Always `orderBy: sortOrder ASC` when available.
- Return `row ?? undefined`, explicit return types.

### API Routes (`src/app/api/`)

1. Parse JSON → 400 on failure
2. Zod `safeParse` → 422 on validation failure
3. DB operation
4. Side effects (email) in isolated try/catch
5. Return `{ success: true }` / `{ error: string }`

### Database

- Schema in `src/db/schema/` (14 files), re-exported from `index.ts`.
- All schema changes via Drizzle Kit — never raw SQL.
- Change order: **DB schema → Query/API → Frontend** (strict, never reversed).

### Tailwind v4

Tokens in `src/app/globals.css` `@theme {}` — **not** in `tailwind.config.ts` (doesn't exist).
Complex CSS (marquee, gradient text, modals) stays in `globals.css`.

### Auth

- Better Auth + Drizzle adapter. Roles: `admin` | `brand`.
- Guard: `requireRole(role, loginPath)` in `src/lib/auth-guard.ts`.
- Dev bypass: mock session in `NODE_ENV === 'development'`.

## Gotchas

- `CLAUDE.md` says tokens in `tailwind.config.ts` — **wrong**, they're in `globals.css @theme`.
- `talentSocials.platform` uses short keys (`yt`, `tw`) but `talentMetricSnapshots.platform` uses full names (`youtube`, `twitch`).
- `parseFollowers("-")` must return 0. Creators with 0 followers sort to bottom regardless of direction.
- Migration 0003 has `CREATE TABLE` for auth tables that may already exist.
- Dev auth bypass: `requireRole()` returns mock session — test real auth in staging.

## Component Conventions (LLM-first)

> Source of truth para descubrir, crear, mover o documentar componentes.
> El plan completo de reorg vive en `.weave/plans/frontend-modular-reorg.md`.
> El manifest navegable de componentes vive en `src/components/CATALOG.md`.

### Layout físico

```
src/
  app/                              # Next.js routes — THIN: solo data fetching + render de feature
  features/<feature>/               # Lógica + UI por dominio
    components/                     # Componentes de la feature
    components/<Composite>/         # Carpeta cuando hay sub-componentes privados
      <Composite>.tsx               # Entry point del composite (named export)
      <Composite>.parts.tsx         # Sub-componentes privados (no se importan fuera de la feature)
    hooks/                          # use<Foo>.ts — opcional
    schemas/                        # Zod schemas locales a la feature — opcional
    api/                            # Handlers gordos extraídos de app/api — opcional
    data.ts                         # Composer de queries para esta feature — opcional
    README.md                       # OBLIGATORIO
  components/
    ui/                             # Primitivos GLOBALES sin acoplamiento a feature
    layout/                         # Chrome de la app (Nav, Footer, Sidebars)
    CATALOG.md                      # Manifest autogenerado
  lib/
    queries/, schemas/, services/, parsers/, utils/
    db.ts, env.ts, auth.ts, auth-guard.ts, permissions.ts, site-url.ts
  types/                            # InferSelectModel + types compuestos
  db/schema/                        # Drizzle source of truth
```

### Reglas de ubicación

| Tipo | Dónde va | Ejemplo |
|---|---|---|
| Primitivo de UI sin lógica de negocio | `components/ui/` | `GradientText`, `SectionTag`, `Tooltip` |
| Chrome de aplicación | `components/layout/` | `Nav`, `Footer`, `PortalSidebar` |
| Componente acoplado a una ruta o flujo | `features/<f>/components/` | `Hero` (marketing), `BrandTalentCard` (brand-portal) |
| Sub-componente privado de un composite | `features/<f>/components/<X>/<X>.parts.tsx` | `BrandsCrmManager.parts.tsx` |
| Handler de API >100 LOC | `features/<f>/api/<handler>.ts` invocado desde `app/api/.../route.ts` | |

### Reglas de archivo

1. **Un componente por archivo, named export, PascalCase.** Nombre archivo = nombre export.
2. **`'use client'` solo cuando sea estrictamente necesario** (state, events, browser APIs, motion, refs).
3. **Sin barrel `index.ts`** en subcarpetas de `components/` o `features/`. Imports completos: `@/features/admin/talents/components/InfluencerCardsView`.
4. **Props siempre `Readonly<...>`** + `type Props` (nunca `interface`).
5. **Archivos < 300 LOC** (objetivo) · **< 500 LOC** (hard limit). Splitear en `<X>.parts.tsx` o sub-carpeta.
6. **Imports cross-feature solo desde la "puerta pública"** (top-level `components/` de la feature destino). Nunca importar desde `features/foo/components/internal/...` desde otra feature.
7. **Páginas y route handlers son thin shells** (≤ 60 LOC). Toda lógica vive en la feature.

### TSDoc obligatorio en cada componente exportado

```ts
/**
 * Hero de la home con auras parallax y gradient typography.
 *
 * @kind client
 * @feature marketing-site
 * @route /
 *
 * @example
 * ```tsx
 * <Hero />
 * ```
 */
export function Hero() { ... }
```

Tags reconocidos:

- `@kind server | client` — obligatorio.
- `@feature <feature-slug>` — obligatorio para componentes en `features/`.
- `@route <pathname>` — opcional, indica dónde se renderiza.
- `@example` — obligatorio para componentes con props no triviales.
- `@deprecated <reason>` — opcional, marcar antes de borrar.

### TSDoc para queries (`lib/queries/`)

```ts
/**
 * Devuelve talents públicos ordenados por sortOrder ASC.
 *
 * @cache wrapped in React `cache()` for request dedupe.
 * @visibility public (filters `visibility = 'public'`).
 * @returns array (puede ser vacío). Nunca null.
 */
export const getTalents = cache(async (): Promise<TalentWithRelations[]> => { ... });
```

### Cómo añadir un componente nuevo

1. Identifica feature destino. Si no existe, **discutir antes de crear** una nueva.
2. Decide kind: server por defecto, client solo si necesita interactividad.
3. Crea el archivo en `features/<f>/components/<Nombre>.tsx` con TSDoc completo.
4. Si introduces sub-componentes privados, usa `<Nombre>/<Nombre>.tsx` + `<Nombre>.parts.tsx`.
5. Si excedes 300 LOC, plan de split antes de mergear.
6. Tests: client → `src/__tests__/client/<feature>/...`, server → `src/__tests__/server/<feature>/...`.
7. Tras crear/mover: `npm run catalog` (regenera `CATALOG.md`).

### Cómo descubrir componentes existentes (LLM)

1. Empieza por `src/components/CATALOG.md` (tabla con todos los componentes).
2. Lee el `README.md` de la feature relevante.
3. Lee el TSDoc del componente concreto.
4. Solo entonces abre el `.tsx`.
