---
name: socialpro-creator-targets
description: Discover and enrich gaming/iGaming/esports content creators on Twitch, YouTube, and Kick targeting Spanish-speaking markets (ES + LATAM) for SocialPro talent agency. Hybrid discovery via Firecrawl + native platform APIs; persists to the targets table via authenticated import endpoint. Use when the user runs /socialpro-creator-targets, asks to find streamers/pro players/content creators in CS2, iGaming, or esports verticals in Spanish, or wants to refresh follower metrics on existing creator targets.
---

# SocialPro Creator Targets

Skill agentic para descubrir creators (CS2, iGaming, esports, gaming generalista) en Twitch + YouTube + Kick — mercado hispano. Persiste cada run a la tabla `targets` del CRM con `status: 'pendiente'` para revisión manual en `/admin/targets`. Cero markdown intermedio.

## Quick start

```
/socialpro-creator-targets cs2 españa twitch         # vertical + región + plataforma sugerida
/socialpro-creator-targets iGaming Argentina kick    # vertical + país LATAM + plataforma
/socialpro-creator-targets esports                   # vertical libre, modelo decide región/plataforma
/socialpro-creator-targets --deep cs2 LATAM          # ~250 créditos Firecrawl
/socialpro-creator-targets --refresh                 # cero Firecrawl; re-enriquece DB existente
```

Default budget: ~80 créditos Firecrawl + cuota platform APIs. Cada run produce `runs/<batchId>.md` (gitignored) con auditoría: descubierto / filtrado / aceptado por endpoint / créditos consumidos.

## Setup

1. **Modo y destino**: resolver primero discovery default, `--deep` o `--refresh`, plataformas y entorno incluidos en la petición vigente. `SOCIALPRO_BASE_URL=http://localhost:3000` es el default; no cambiar a producción por suposición.
2. **Bearer token**: usar `TARGETS_IMPORT_TOKEN` existente desde la configuración segura autorizada. Si falta, identificar la dependencia al responsable actual de operaciones/configuración de SocialPro; no asumir una persona histórica ni pedir el valor por chat.
3. **Firecrawl key**: `FIRECRAWL_API_KEY` solo se necesita en discovery default/`--deep`; reutilizar la credencial ya autorizada. `--refresh` no consulta Firecrawl ni necesita su clave.
4. **Custodia**: no imprimir, copiar a ejemplos/argumentos visibles ni commitear secretos o archivos `.env`. La skill no autoriza crear, rotar o sustituir credenciales: tales cambios requieren alcance/autorización específicos y el mecanismo seguro correspondiente.

Pre-flight automático según modo, antes de descubrir/reenriquecer o importar el lote:

| Modo | Dependencias necesarias | Si falta una dependencia |
|---|---|---|
| Discovery default / `--deep` | Bearer CRM, Firecrawl y credenciales del proxy de las plataformas seleccionadas | Detener el modo afectado antes de consumir Firecrawl; describir solo el nombre/configuración faltante |
| `--refresh` | Bearer CRM y credenciales exigidas por los proxies de las plataformas seleccionadas | Detener la plataforma afectada; no exigir Firecrawl ni convertir refresh en discovery |

Comprobar presencia/configuración sin revelar valores. Los probes también pueden consumir cuota de plataforma: limitarlos al modo autorizado, no tratarlos como gratis. Un 401/403, o 503 `missing-config` / `missing-X-credentials`, es un gate real: detener la operación afectada y pedir al responsable actual que restablezca el acceso por vía segura. No declarar éxito del lote incompleto. Los requisitos y presupuestos vigentes siguen aplicando; el preflight no concede permisos adicionales.

## Workflow — discovery default

Modelo agentic. Tienes herramientas, tienes guardrails, decides pasos:

1. Parsea args: vertical (`cs2|igaming|esports|gaming`), región (ES/MX/AR/CL/CO/PE/UY/EC/VE/PY/BO o `LATAM`), plataforma (`twitch|youtube|kick`).
2. **Dedup pre-flight**: `GET /api/admin/targets/active?platform=<plat>&limit=500` con paginación cursor — construye `existingUsernames: Set<string>`.
3. Genera anchor queries Firecrawl (3–4 default, 8–10 con `--deep`) según [PROMPT.md](PROMPT.md) §Playbook por vertical. **No** uses queries genéricas — siempre con nombres reales de equipos/casters/tournaments + `OR` + `intitle:`/`site:`.
4. Por cada query → `POST https://api.firecrawl.dev/v2/search` con `country` ES o país LATAM, `excludeDomains` canónica (ver PROMPT.md §Filtros), `scrapeOptions` con `markdown` + `json` (schema en [FIRECRAWL.md](FIRECRAWL.md)).
5. **Extrae handles** del `markdown` con juicio (no regex hardcodeado): blogs usan `twitch.tv/X`, `@X`, `(su Twitch es X)`, listas numeradas. Si nombre sin handle, calcula via search proxy (paso 6).
6. **Resuelve handles canónicos** — para cada handle/nombre extraído llama `POST <BASE>/api/admin/discover/<plat>/search` con bearer. Devuelve preview con followers, idioma, último stream/upload, etc.
7. Aplica filtros (en orden, descarta al primer fallo):
   - **Idioma ES**: doble check según [PROMPT.md](PROMPT.md) §Idioma. Cross-check `language` de Firecrawl con `metadata.language`.
   - **Mínimo followers**: Twitch ≥ 1k, YouTube ≥ 3k, Kick ≥ 500. Override con `--min-followers-X`.
   - **Activity check**: último stream/upload < 60 días. `--no-activity-check` para skip.
   - **Vertical match (juicio LLM)**: ¿streamer real del vertical o variety? Lee bio + categorías recientes. Descarta variety si más del 50% del pool tras filtros pasa este corte.
   - **Dedup**: contra `existingUsernames` del paso 2.
8. **Build `ImportItem[]`** según schema en [ENDPOINTS.md](ENDPOINTS.md) §POST /import.
9. **POST `<BASE>/api/admin/targets/import`** con `batchId: "creator-<YYYY-MM-DD>-<vertical>-<plat>"` (regex enforced en boundary). Max 100 items por batch — chunkea si necesario.
10. **Escribe audit log** `runs/<batchId>.md` (gitignored): qué se descubrió por query, qué filtró cada criterio, qué insertó/actualizó el endpoint, créditos Firecrawl consumidos.
11. Resumen en chat: `N descubiertos, M filtrados, K insertados, J actualizados, créditos: X`.

## Workflow — `--deep`

Igual con 8–10 queries × `limit: 10`. **Avisa coste estimado (~250 créditos) y pide confirmación** antes de ejecutar.

## Workflow — `--refresh`

1. Cero Firecrawl. Cero discovery. Ejecutar el preflight de `--refresh`; la ausencia de `FIRECRAWL_API_KEY` no lo bloquea.
2. Itera `GET <BASE>/api/admin/targets/active?platform=<plat>&cursor=<id>&limit=100` hasta `nextCursor: null`.
3. Para cada platform group, llama `/discover/<plat>/search` con username como query (resuelve a preview actualizado), o `/discover/kick/channel` directo con slug.
4. Build `ImportItem[]` con métricas frescas. `batchId: "creator-<YYYY-MM-DD>-refresh-<plat>"`.
5. POST a `/import`. Endpoint actualiza solo campos métricos (status / brandUserId / notes / contactedAt intactos por diseño del UPSERT).
6. Audit log en `runs/refresh-<batchId>.md`.

## Reglas duras (no-negociables)

- **Idioma**: solo Español. Anglo / portugués fuera de scope (excepto modo `--allow-pt` para LATAM).
- **Regiones permitidas**: ES, MX, AR, CL, CO, PE, UY, EC, VE, PY, BO.
- **Plataformas v1**: `twitch | youtube | kick`. Instagram fuera (sin scraper integrado).
- **Vertical en `importBatchId`**: regex `^creator-\d{4}-\d{2}-\d{2}-(cs2|igaming|esports|gaming)-(twitch|youtube|kick)$` enforced server-side.
- **Cost ceiling**: default 80 créditos Firecrawl, `--deep` 250. Si se alcanza mid-flow → POST lo descubierto hasta ese momento, audit log con `[INCOMPLETO: budget]`.
- **PII en logs**: jamás emails extraídos, bearer token, ni cookies. Regla TS #10 del repo aplica a esta skill.
- **Dedup por `(platform, username)`** antes de POST. La unique key del DB lo enforza igual, pero hacer dedup client-side reduce ruido en audit log.
- **Errores de Firecrawl**: 429/5xx/408 → backoff exponencial 5s/10s/20s, máx 2 retries. **402 → abortar** (cuota agotada). 401 → abortar (key inválida). Detalles en [FIRECRAWL.md](FIRECRAWL.md).
- **Credencial necesaria ausente o inválida** → detener el modo/plataforma afectado según el preflight y señalar la dependencia al responsable actual, sin revelar ni crear secretos. Firecrawl es obligatorio solo para discovery; no para `--refresh`.

## Feedback loops (recovery actions)

| Síntoma | Acción |
|---|---|
| Tras filtros < 5 candidatos | Regenerar queries con ángulo nuevo. Tope 2 ciclos antes de devolver lo que haya con nota `[recall bajo]` |
| Handle ambiguo (blog dice "Westcol" sin URL) | Llamar `/discover/<plat>/search` con el nombre. Si > 3 matches o ninguno con vertical reciente → descartar y anotar |
| > 50% del pool pre-filtrado son variety streamers | Regenerar query con anchors estrechos (`pro player`, `caster`, equipos: `KOI`, `Movistar Riders`, `Heretics`) |
| > 80% dupes contra `existingUsernames` | Abortar discovery. Mensaje: "el nicho está saturado en DB; usa `/socialpro-creator-targets --refresh` o ajusta el vertical" |
| Cost ceiling reached mid-flow | POST lo que haya, audit log `[INCOMPLETO: budget]` |
| Endpoint POST devuelve `inserted < items.length` | Audit log distingue inserted/updated/rejected. No declarar success si rejected > 0 |

## Files

- [PROMPT.md](PROMPT.md) — playbook por vertical, anchor queries, filtros, schema fila.
- [FIRECRAWL.md](FIRECRAWL.md) — endpoints Firecrawl, schema JSON específico para creators, pricing, errores.
- [ENDPOINTS.md](ENDPOINTS.md) — los 5 endpoints internos `/discover/*` + `/targets/{active,import}`. Request/response shapes, ejemplos curl.
- `.env` — `FIRECRAWL_API_KEY`, `TARGETS_IMPORT_TOKEN`, `SOCIALPRO_BASE_URL`. No en git.
- `.env.example` — plantilla.
- `runs/` — audit logs por batch (gitignored).
