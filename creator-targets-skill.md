# Plan — Skill `socialpro-creator-targets`

Skill para que Zack descubra creators de contenido (CS2, iGaming ES/LATAM, esports) en Twitch + YouTube + Kick. Output persiste en la tabla `targets` vía endpoint nuevo. Project-scoped, paralelo a `socialpro-press-targets`.

## SKILL.md frontmatter description (locked)

> Discover and enrich gaming/iGaming/esports content creators on Twitch, YouTube, and Kick targeting Spanish-speaking markets (ES + LATAM) for SocialPro talent agency. Hybrid discovery via Firecrawl + native platform APIs; persists to the targets table via authenticated import endpoint. Use when the user runs /socialpro-creator-targets, asks to find streamers/pro players/content creators in CS2, iGaming, or esports verticals in Spanish, or wants to refresh follower metrics on existing creator targets.

(580 chars, third person, "Use when..." trigger explícito.)

## Decisiones (cerradas en grilling)

| # | Punto | Resolución |
|---|---|---|
| 1 | Discovery | Híbrido — Firecrawl (búsqueda web) + APIs nativas (enrichment) |
| 2 | Persistencia | DB vía endpoint nuevo `POST /api/admin/targets/import` |
| 3 | Auth | Bearer `TARGETS_IMPORT_TOKEN` con `timingSafeEqual` (mismo patrón que firmar tokens) |
| 4 | Plataformas v1 | Twitch + YouTube + Kick. Instagram fuera (sin scraper integrado). |
| 5 | Vertical encoding | Convención `importBatchId`: `^creator-\d{4}-\d{2}-\d{2}-(cs2\|igaming\|esports\|gaming)-(twitch\|youtube\|kick)$`. Sin migración. |
| 6 | Ciclo | End-to-end + audit log `runs/<batch>.md` (no staging markdown — DB con `status:'pendiente'` ES la cola) |
| 7 | Flow | Agentic con guardrails (no procedural). Modelo decide queries; SKILL.md fija reglas duras. |
| 8 | API plataformas | Proxy interno `/api/admin/discover/*` reusa `src/lib/services/{twitch,youtube,kick}.ts`. Firecrawl directo desde skill. |
| 9 | Conflict policy | `ON CONFLICT DO UPDATE` selectivo: actualiza `followers/following/posts/profilePicUrl/bio/enrichedAt`; respeta `status/brandUserId/notes/contactedAt`. Max 100 items/batch. |
| 10 | Quality gates | Medium followers (Twitch ≥1k, YouTube ≥3k, Kick ≥500) + activity check on (último stream/upload <60d) + idioma ES estricto + juicio LLM para vertical match |
| 11 | Refresh | Modo `--refresh` dedicado: lee DB activos, re-enriquece via APIs, POST. Cero Firecrawl. |
| 12 | Ubicación | `.claude/skills/socialpro-creator-targets/` (project-scoped). Slash `/socialpro-creator-targets`. |
| 13 | `runs/*.md` | Gitignored (`.claude/skills/socialpro-creator-targets/runs/*.md`). PII de tercero (bios, follower counts, contactos). `.gitkeep` queda fuera. |
| 14 | `--refresh` pagination | `GET /api/admin/targets/active` acepta `?cursor=<id>&limit=` (default 100). Skill itera páginas hasta `nextCursor: null`. |
| 15 | Health-check error shape | Endpoints `/discover/*` validan env keys upfront. Si falta: HTTP 503 + `{ ok: false, error: 'missing-twitch-credentials' \| 'missing-youtube-credentials' \| 'missing-kick-config' }`. No 500 genérico. |
| 16 | PII en logs | Audit log nunca incluye bearer token, ni emails extraídos de bios, ni cookies. SKILL.md y endpoints lo nombran explícito (regla TS #10). |
| 17 | Vertical `gaming` | Mantener como catch-all en el regex de `importBatchId` para variety streamers que no encajan claramente en CS2/iGaming/esports. |
| 18 | Extracción de handles | LLM extrae handles del markdown de Firecrawl con juicio (no regex hardcodeado). PROMPT.md lo documenta con ejemplos de formatos comunes. |

## Lecciones portadas de press skill (run-01/02)

- **Anchor queries** (nombres reales + `OR` + `intitle:`/`site:`) en lugar de plantillas genéricas.
- **Idioma ES doble check**: `json.language` Y `metadata.language` (`<html lang>`). Firecrawl alucina.
- **`includeDomains` con TLD prohibido por la API**. Solo `country` + `location` + `excludeDomains`.
- **Cross-check `json.category`** con keywords del markdown — Firecrawl etiqueta cualquier marca conocida con la primera categoría que reconoce.
- **Map step opcional** (`/v2/map` → `/v2/scrape`) cuando los 4 caminos de contacto vienen `null`.

## Feedback loops (6 + 2 pre-flight)

1. **Recall bajo** — <5 candidatos tras filtros → regen queries con ángulo nuevo. Tope 2 ciclos.
2. **Handle ambiguo** — sin URL clara → llamar Twitch/YouTube search con nombre para resolver canónico.
3. **Vertical mismatch** — >50% variety → regen con anchors estrechos (`pro player`, `caster`, equipos).
4. **DB saturada** — >80% dupes contra `existingUsernames` → abortar discovery, sugerir `--refresh`.
5. **Cost ceiling** — créditos Firecrawl > budget (default 80, `--deep` 250) → abortar mid-flow, POST lo que haya, audit log con `[INCOMPLETO: budget]`.
6. **POST parcial fallido** — `inserted < items.length` → audit log distingue inserted/skipped/rejected. Run no es success si rejected > 0.
7. **Pre-flight A** — `FIRECRAWL_API_KEY` o `TARGETS_IMPORT_TOKEN` faltan → abortar antes de cost.
8. **Pre-flight B** — health-check trivial al proxy (`POST /discover/twitch/search { query: "test", limit: 1 }`) — si 5xx, abortar con mensaje claro.

## Cambios en el repo (orden bottom-up estricto)

### 1. DB (verificar — no migrar)

`targets` ya cubre todos los campos. **Sin migración**. El vertical va en `importBatchId`.

### 2. Env

`src/lib/env.ts` — añadir:
```ts
TARGETS_IMPORT_TOKEN: z.string().min(32),  // generado con crypto.randomBytes(32).toString('hex')
```

### 3. Schemas

`src/lib/schemas/creatorTargetsImport.ts` — Zod para body del endpoint import (regex `batchId`, array items con platform/username/followers/etc., max 100).

`src/lib/schemas/creatorTargetsActive.ts` — Zod para response de `/active`.

### 4. Auth helper

`src/lib/auth-targets-import.ts` — `verifyTargetsImportToken(req: Request): boolean` con `timingSafeEqual`.

### 5. Service Kick (nuevo)

`src/lib/services/kick.ts` — cliente HTTP a `https://kick.com/api/v2/channels/<slug>`. Funciones: `getKickChannel(slug)`, `searchKickChannels(query)` (último puede no existir como API; fallback: pasar slugs ya conocidos). Tests en `__tests__/server/kick-service.test.ts`.

### 6. Endpoints (7 nuevos, todos POST salvo `/active` que es GET)

Todos auth con `verifyTargetsImportToken`:

- `POST /api/admin/discover/twitch/search` — `{ query, limit?, language? }` → `TwitchChannelPreview[]`. Si falta `TWITCH_CLIENT_ID`/`SECRET` → 503 `{ ok: false, error: 'missing-twitch-credentials' }`.
- `POST /api/admin/discover/twitch/enrich` — `{ logins: string[] }` → followers + game + last stream
- `POST /api/admin/discover/youtube/search` — `{ query, limit?, regionCode? }` → channels. Si falta `YOUTUBE_API_KEY` → 503 `{ ok: false, error: 'missing-youtube-credentials' }`.
- `POST /api/admin/discover/youtube/enrich` — `{ channelIds: string[] }` → subscriberCount + recent videos
- `POST /api/admin/discover/kick/channel` — `{ slug }` → channel info
- `GET /api/admin/targets/active` — query: `?platform=&since=&cursor=&limit=` (default `limit=100`) → `{ items, nextCursor }`. Filtro fijo `status ≠ 'descartado'`.
- `POST /api/admin/targets/import` — body validated by `creatorTargetsImport` schema → `{ inserted, skipped[], rejected[] }`. Logs nunca incluyen bearer ni PII (regla TS #10).

### 7. ADR 0005

`docs/adr/0005-bearer-auth-for-skill-driven-cli-endpoints.md` — por qué bearer y no Better Auth session para los 7 endpoints `/api/admin/{discover,targets/import,targets/active}` consumidos por skills CLI. Alineado con ADR 0004 (CSRF/Next defaults siguen aplicando al resto del admin).

## Skill files

`.claude/skills/socialpro-creator-targets/`:

- **`SKILL.md`** — frontmatter + quick start + setup (FIRECRAWL_API_KEY, TARGETS_IMPORT_TOKEN, SOCIALPRO_BASE_URL) + workflows (default, `--deep`, `--refresh`) + reglas duras + feedback loops mapeados a recovery actions.
- **`PROMPT.md`** — playbook por vertical (CS2 / iGaming / esports / gaming). Anchors reales (handles, equipos, tournaments) por vertical. Filtros 1-5 (dedup DB, idioma doble check, keyword match, vertical judgment LLM, threshold followers). Schema fila final.
- **`FIRECRAWL.md`** — referencia API. Schema JSON específico para discovery de creators (extrae `handle`, `platform_hint`, `name`, `language`, `country_hint`, `vertical_hint`, `followers_hint`, `summary`). Pricing + rate limits + error handling (mismas tablas que press skill).
- **`ENDPOINTS.md`** — contratos de los 7 endpoints proxy + import. Request/response shapes, ejemplos curl, error codes. Cómo el modelo los compone secuencialmente.
- **`.env.example`** — `FIRECRAWL_API_KEY=fc-...`, `TARGETS_IMPORT_TOKEN=...`, `SOCIALPRO_BASE_URL=http://localhost:3000` (override a producción cuando aplique).
- **`runs/.gitkeep`** — directorio para audit logs. Los `*.md` dentro están gitignored (PII).

## Verificación

Antes de declarar trabajo hecho (regla TS #15):
- `npx tsc --noEmit` verde
- `npm run lint` verde
- Tests nuevos (3 v1):
  1. `kick-service.test.ts` — happy path de `getKickChannel(slug)`
  2. `creator-targets-import-route.test.ts` — happy path con batch válido + 1 dupe
  3. `creator-targets-auth.test.ts` — bearer fail compartido (template para las otras rutas)
- Health check: levantar `npm run dev`, ejecutar dry-run de la skill con `--limit 1` para validar end-to-end + verificar que `runs/<batch>.md` se escribe correctamente y queda fuera de git status.

## Secuencia de commits sugerida

1. `chore(gitignore): exclude creator-targets skill runs/*.md`
2. `feat(env): add TARGETS_IMPORT_TOKEN`
3. `feat(services): add kick.ts client + tests`
4. `feat(schemas): add creatorTargetsImport zod schema`
5. `feat(auth): add bearer auth helper for skill-driven endpoints`
6. `feat(api): add discover proxy endpoints (twitch/youtube/kick) with structured 503 on missing creds`
7. `feat(api): add targets/active (paginated) + targets/import endpoints`
8. `docs(adr): add 0005 bearer auth for skill-driven CLI endpoints`
9. `feat(skills): add socialpro-creator-targets skill`

(Cada commit pasa `tsc --noEmit` + `lint`.)
