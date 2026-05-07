# SocialPro

Web y back-office de **SocialPro**, una agencia gaming/esports que conecta creadores (streamers, YouTubers) con marcas. El repositorio contiene un único proyecto **Next.js 16** que sirve:

- El sitio público (`/`, `/talentos`, `/casos`, `/blog`, `/servicios`, `/contacto`, ...).
- El **admin dashboard** en `/admin/*` (gestión de talentos, casos, marcas, posts, giveaways).
- El **portal de marcas** en `/marcas/*` (catálogo de talentos, propuestas, comparador).
- Las **API routes** (`/api/*`): formulario de contacto, auth, propuestas, cron de snapshots.

Para el protocolo de trabajo con agentes/LLMs ver [`CLAUDE.md`](./CLAUDE.md) y [`AGENTS.md`](./AGENTS.md). Para el estado y las fases del proyecto, ver [`roadmap.md`](./roadmap.md).

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.1 (App Router, React 19.2, RSC + Server Actions) |
| Lenguaje | TypeScript strict (`verbatimModuleSyntax`, `type` sobre `interface`) |
| Estilos | Tailwind CSS v4 (tokens en `src/app/globals.css` vía `@theme`) |
| UI | shadcn, Base UI, `lucide-react`, `motion` v12 |
| DB | Neon Postgres + Drizzle ORM (schema en `src/db/schema/`) |
| Migraciones | Drizzle Kit (`drizzle/` con SQL versionado) |
| Auth | Better Auth (Drizzle adapter, roles `admin` y `brand`) |
| Validación | Zod v4 (siempre `safeParse`, nunca `parse`) |
| Email | Resend |
| Storage | Vercel Blob |
| Tests unit | Jest con tres proyectos (`client`, `server`, `fuzz`) |
| Fuzz | `fast-check` (property-based) |
| E2E | Playwright (Chromium) |
| Carga | k6 (scripts en `load-tests/`) |

---

## Estructura del repo

```
src/
  app/                       # Next.js App Router
    layout.tsx               # Root: metadata, JSON-LD, Nav, Footer
    page.tsx                 # Home (Server Component)
    api/                     # Route handlers (contact, auth, cron, ...)
    admin/                   # Admin dashboard (requireRole('admin'))
    marcas/                  # Brand portal (requireRole('brand'))
    blog/                    # Listado + [slug] + RSS feed.xml
    casos/                   # Listado + [slug]
    talentos/                # Listado + [slug]
    servicios/               # /servicios y /servicios/igaming
    contacto/, nosotros/, metodologia/, para-creadores/, creadores/, giveaways/
    robots.ts, sitemap.ts
  components/
    layout/                  # Nav, Footer, PublicChrome, PortalSidebar
    sections/                # Secciones de la home (Hero, Metrics, Cases, ...)
    ui/                      # Primitivas (SectionTag, GradientText, StatusBadge)
    brand/, admin/, creadores/
  db/schema/                 # Drizzle schemas (15 archivos)
  lib/
    db.ts                    # Singleton Neon + Drizzle
    env.ts                   # @t3-oss/env-nextjs + Zod
    auth.ts, auth-guard.ts   # Better Auth + requireRole()
    site-url.ts              # SITE_URL normalizado + absoluteUrl()
    queries/                 # Queries Drizzle (una por entidad)
    schemas/                 # Zod schemas para inputs de API/forms
    services/                # Integraciones externas (YouTube, Twitch)
    email.ts, breadcrumbs.ts
  middleware.ts              # Rate limiting + auth gating
  types/index.ts             # InferSelectModel re-exports
  __tests__/                 # client/, server/, fuzz/

drizzle/                     # Migraciones SQL generadas
e2e/                         # Specs Playwright
load-tests/                  # Scripts k6
scripts/                     # Utilidades (seed, sync-followers, committer, ...)
docs/                        # Notas técnicas internas
```

---

## Requisitos

- **Node.js 20+** (CI fija `NODE_VERSION: '20'`).
- **npm** (hay `package-lock.json`; no se usa yarn/pnpm).
- Acceso a una base de datos **Neon Postgres** (o cualquier Postgres compatible) para `DATABASE_URL`.
- Cuenta de **Resend** para el envío de emails transaccionales.
- Opcional: **k6** instalado localmente si quieres correr los load tests (`brew install k6`).

---

## Variables de entorno

Todas las vars están validadas en `src/lib/env.ts` con `@t3-oss/env-nextjs` y Zod. El build falla si falta alguna o no cumple el schema.

| Variable | Lado | Tipo | Descripción |
|---|---|---|---|
| `DATABASE_URL` | server | URL Postgres | Connection string de Neon (o Postgres). |
| `RESEND_API_KEY` | server | string (≥ 1) | API key de Resend para emails transaccionales. |
| `BETTER_AUTH_SECRET` | server | string (≥ 32) | Secret para firmar sesiones de Better Auth. |
| `NEXT_PUBLIC_SITE_URL` | client | URL | URL pública (metadata, sitemap, robots, JSON-LD, CORS de auth). |

Crea un `.env.local` en la raíz con las cuatro vars. **No commits**: `.env*` está en `.gitignore`. Los tests de Jest inyectan stubs de estas vars en `jest.setup.ts`, así que los unit tests no requieren un `.env.local` real.

---

## Arranque en local

```bash
npm ci                          # instala dependencias
# crea .env.local con las 4 vars de arriba
npx drizzle-kit migrate         # aplica migraciones contra DATABASE_URL
npx tsx scripts/seed.ts         # (opcional) seed de datos
npm run dev                     # dev server en :3000
```

La URL es `http://localhost:3000`. Si tienes otro proyecto ocupando el puerto 3000, levanta el dev con `PORT=3010 npm run dev` (Playwright soporta `PLAYWRIGHT_BASE_URL=http://localhost:3010`).

---
## Higgsfield: setup y workflow de generación

Esta sección documenta el flujo mínimo para inicializar Higgsfield en este repo y verificar generación de imagen y video desde CLI.

### 1) Instalar CLI global

```bash
npm install -g @higgsfield/cli
```

Verificar versión instalada:

```bash
npm list -g @higgsfield/cli
```

### 2) Inicializar skills de Higgsfield en el proyecto

```bash
npx skills add higgsfield-ai/skills
```

Esto instala las skills oficiales (`higgsfield-generate`, `higgsfield-soul-id`, `higgsfield-product-photoshoot`, `higgsfield-marketplace-cards`) y actualiza la config local del repo.

### 3) Autenticar CLI

```bash
higgsfield auth login
```

La CLI abre login por navegador con device flow y guarda el token local.

### 4) Verificar autenticación y config del proyecto

Comprobar sesión activa:

```bash
higgsfield account status
```

Comprobar artefactos de configuración en el repo:

- Carpeta `.agents/skills/` con las skills de Higgsfield.
- Entradas correspondientes en `skills-lock.json`.

### 5) Generar asset de imagen de prueba (workflow `higgsfield-generate`)

```bash
higgsfield generate create nano_banana_2 --prompt "Minimalist product shot of a matte black gaming mouse on a clean white studio background, soft shadows, high detail" --aspect_ratio 1:1 --resolution 1k --wait
```

Salida esperada: URL pública `.png` (job en estado `completed`).

### 6) Generar asset de video de prueba (Seedance 2.0)

```bash
higgsfield generate create seedance_2_0 --prompt "Cinematic slow dolly shot through a neon-lit esports arena with atmospheric haze and dramatic lighting" --aspect_ratio 16:9 --duration 5 --resolution 720p --mode std --wait
```

Salida esperada: URL pública `.mp4` (job en estado `completed`).

Nota: si una ejecución devuelve `ip_detected`, reintenta el mismo comando; el flujo puede completarse correctamente en el segundo intento.

### Troubleshooting

- **`Session expired` / `Not authenticated`**
  - Ejecuta: `higgsfield auth login`
  - Verifica sesión: `higgsfield account status`

- **Modelo no reconocido (`unknown model`)**
  - Lista catálogo actualizado: `higgsfield model list`
  - Reintenta con un `job_set_type` válido (por ejemplo, `nano_banana_2` o `seedance_2_0`).

- **Job termina en `ip_detected`**
  - Reintenta exactamente el mismo comando.
  - Si persiste, espera unos minutos y vuelve a ejecutar.

- **No aparecen skills en el proyecto**
  - Reinstala: `npx skills add higgsfield-ai/skills`
  - Confirma que existen `.agents/skills/` y entradas en `skills-lock.json`.

---

## Scripts de `package.json`

### Desarrollo y build

| Script | Qué hace |
|---|---|
| `npm run dev` | Dev server (Next) en `:3000`. |
| `npm run build` | Build de producción (`next build`). |
| `npm run start` | Sirve el build (`next start`). |
| `npm run lint` | ESLint (config en `eslint.config.mjs`). |
| `npx tsc --noEmit` | Typecheck estricto — usa `tsconfig.json`. |

### Tests

| Script | Qué hace |
|---|---|
| `npm test` | Todos los Jest projects (client + server + fuzz). |
| `npm run test:watch` | Jest en watch mode. |
| `npm run test:coverage` | Jest con cobertura (salida en `coverage/`). |
| `npm run test:ci` | Modo CI: `--ci --coverage --passWithNoTests`. |
| `npm run test:fuzz` | Sólo proyectos fuzz (`fast-check`). |
| `npm run test:e2e` | Playwright (arranca dev si no hay uno escuchando en `:3000`). |
| `npm run test:e2e:ui` | Playwright en modo UI. |
| `npm run test:e2e:headed` | Playwright con navegador visible. |
| `npm run test:e2e:report` | Abre el último report. |

La primera vez tras instalar deps: `npx playwright install chromium` para descargar el binario.

### Load testing (k6)

Requieren k6 instalado en el sistema y el dev server arriba.

| Script | Qué hace |
|---|---|
| `npm run load:smoke` | Smoke test mínimo. |
| `npm run load:pages` | Load test de las rutas públicas. |
| `npm run load:api` | Load test de `/api/contact`. |
| `npm run load:spike` | Spike test de la API. |
| `npm run load:rate-limit` | Estrés del rate limiter. |
| `npm run load:bots` | Simulación de tráfico bot. |
| `npm run load:soak` | Soak test de larga duración. |

### Base de datos

No hay scripts npm para migraciones — se usa el CLI de Drizzle Kit directamente:

```bash
npx drizzle-kit generate        # genera SQL a partir de cambios en src/db/schema/
npx drizzle-kit migrate         # aplica migraciones pendientes a DATABASE_URL
npx drizzle-kit studio          # UI local para explorar la DB
```

**Drizzle es la única fuente de verdad de la base de datos.** No modifiques tablas desde la consola de Neon ni con SQL suelto — cualquier cambio va por `schema/` → `generate` → `migrate`.

### Utilidades en `scripts/`

| Script | Qué hace |
|---|---|
| `npx tsx scripts/seed.ts` | Seed de datos iniciales. |
| `node scripts/extract-images.mjs` | Extrae imágenes base64 del HTML a `public/images/`. |
| `npx tsx scripts/sync-followers.ts` | Sincroniza contadores de followers contra APIs reales de YouTube/Twitch. `followers_display` en la DB viene de aquí — nunca hardcodees. |
| `npx tsx scripts/create-admin.ts` | Crea un usuario admin. |

---

## Arquitectura (lo imprescindible)

### Server vs Client Components

- **Server por defecto**: cualquier sección sin interacción (`TalentSection`, `CasesSection`, `Footer`, etc.) es Server Component y lee de la DB directamente.
- **Client sólo cuando es necesario**: `'use client'` se reserva para onClick/useState/useEffect/scroll (p.ej. `Nav`, `TalentGrid`, `ContactSection`, `FilterChips`).
- **Data flow**: el Server Component padre hace `Promise.all(...)` de queries, pasa el array completo como prop al hijo client, el cliente filtra localmente. **Nunca** se llama a la DB desde un Client Component.

### Orden estricto de cambios

**DB schema → query/API → frontend.** Nunca al revés. Violarlo rompe tipos o produce errores silentes en runtime. Detalles en `CLAUDE.md`.

### Queries y API routes

- `src/lib/queries/*`: queries públicas filtran `visibility = 'public'`; las variantes admin (`getAll*`) no. Siempre `orderBy: sortOrder ASC` cuando existe.
- `src/app/api/*/route.ts`: patrón fijo — parse JSON → `safeParse` Zod → DB → side effects (email) en try/catch aislado → respuesta JSON. Los errores de side effects nunca bloquean la respuesta.

### URLs absolutas

Toda URL pública (metadata, sitemap, robots, JSON-LD, RSS, emails) pasa por `src/lib/site-url.ts`:

- `SITE_URL`: base normalizada (sin whitespace ni trailing slash).
- `absoluteUrl(path)`: construye URLs absolutas sin dobles slashes.

No uses `process.env.NEXT_PUBLIC_SITE_URL` directamente.

### Auth

Better Auth + Drizzle adapter. Dos roles: `admin` y `brand`. El gate se aplica con `requireRole(role, loginPath)` desde `src/lib/auth-guard.ts`, típicamente en el `layout.tsx` del segmento protegido (`/admin`, `/marcas`). En `NODE_ENV === 'development'` existe un bypass con sesión mock — **testea siempre auth real antes de producción**.

### Tailwind v4

Los design tokens viven en `src/app/globals.css` dentro de `@theme { ... }`, **no** en un `tailwind.config.ts` (no existe). CSS complejo (marquee, gradient text, modals) también queda en `globals.css`. El branding son tokens `sp-*` (`sp-black`, `sp-orange`, `sp-grad`, `sp-muted`, ...).

---

## Tests

### Unit + fuzz (Jest)

Tres proyectos en `jest.config.ts`:

- `client` — `jest-environment-jsdom`, matchea `src/**/__tests__/client/**/*.test.ts(x)`.
- `server` — `node`, matchea `src/**/__tests__/server/**/*.test.ts`.
- `fuzz` — `node`, matchea `src/**/__tests__/fuzz/**/*.fuzz.ts`.

Todos comparten `jest.setup.ts`, que inyecta stubs de env vars y mocks de `next/navigation`, `next/headers`, `next/cache`. Módulos ESM de `@t3-oss/env-nextjs` o `drizzle-orm` se cargan vía `transformIgnorePatterns` — en tests server suele ser más limpio **mockear** `@/lib/env` y `@/lib/db` explícitamente (ver `src/__tests__/server/contact-route.test.ts` como referencia).

### E2E (Playwright)

Specs en `e2e/`. Config en `playwright.config.ts`:

- Base URL: `process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'`.
- `webServer.command: 'npm run dev'` con `reuseExistingServer: !CI` — en local reutiliza cualquier servidor que ya esté escuchando en `:3000`, en CI siempre arranca uno nuevo.
- Sólo chromium, screenshots on failure, traces on first retry.

Comandos:

```bash
npm run test:e2e                                                 # todo
npx playwright test e2e/public-routes.spec.ts                    # un archivo
PLAYWRIGHT_BASE_URL=http://localhost:3010 npm run test:e2e       # contra otro puerto
```

---

## CI

GitHub Actions, tres workflows:

- **`.github/workflows/ci.yml`** (push + PR a `master`): lint + typecheck, unit/fuzz tests, build. Node 20.
- **`.github/workflows/e2e.yml`** (PR a `master`): instala Playwright con deps y corre `npm run test:e2e`. Sube report y traces como artefactos si falla.

Las cuatro env vars de runtime vienen de `secrets.*` en los jobs.

---

## Despliegue

El repo está configurado para **Vercel**:

- `vercel.json` declara un cron diario (`0 6 * * *`) sobre `/api/cron/snapshot-metrics`.
- Se usa `@vercel/blob` como storage.
- `next.config.ts` es estándar Next 16.

El flujo es `push a master` → pipeline de Vercel → producción. No hay pasos manuales de deploy documentados en el repo.

Las variables de entorno de producción se gestionan en el dashboard de Vercel (no en este repo).

---

## Convenciones rápidas

- **Commits**: Conventional Commits estrictos — `type(scope): imperative summary`. Usa `scripts/committer "type(scope): msg" file1 file2`.
- **TypeScript**: strict, sin `any`, sin `@ts-ignore`, sin non-null assertions (`!.`). Return types explícitos en funciones exportadas. `type` en vez de `interface`. `readonly` por defecto.
- **Archivos** bajo ~500 LOC; split cuando se excedan.
- **Named exports** salvo en pages/layouts.
- **Imports** en 4 tramos separados por línea en blanco (ver `AGENTS.md`).

---

## Más documentación

| Archivo | Contenido |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Protocolo de trabajo con agentes LLM, reglas del repo, gotchas. |
| [`AGENTS.md`](./AGENTS.md) | Estilo de código, convenciones, patrones y anti-patrones. |
| [`roadmap.md`](./roadmap.md) | Estado de fases, pendiente, arquitectura. |
| [`seo-roadmap.md`](./seo-roadmap.md) | Plan SEO. |
| [`docs/`](./docs/) | Notas técnicas internas (better-auth, etc.). |
