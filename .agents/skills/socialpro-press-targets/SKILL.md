---
name: socialpro-press-targets
description: Discover and curate Spanish-language press, news, and PR submission targets for SocialPro (gaming/esports/iGaming talent agency in ES + LATAM) using Firecrawl. Maintains targets.md split by category — gaming media, CS2/FPS, iGaming/skins, local digital press, forums, journalists. Use when the user runs /socialpro-press-targets, asks for press release targets, news outlets in Spanish, ES/LATAM PR contacts, gaming journalists for cold outreach, or wants to discover/refresh outlets where SocialPro can post a press release.
---

# SocialPro Press Targets

Lista híbrida (curados + discovery) de medios, blogs, foros, prensa digital local y periodistas hispanohablantes donde SocialPro puede postear notas de prensa o noticias. Verticales: gaming, esports, CS2/FPS, iGaming, skins.

## Quick start

```
/socialpro-press-targets                  # discovery default (~100 créditos search + ~30 map ≈ 130 total)
/socialpro-press-targets --deep           # discovery pesado (~500 créditos — agotaría free tier, pide confirmación)
/socialpro-press-targets --refresh        # sin discovery, revalida curados (~5 créditos × N)
/socialpro-press-targets iGaming Chile    # discovery sesgado al texto
```

Free tier = 500 créditos. **Default real consume ~130 créditos** (validado en run-01: 100 en search, +30 estimados de map para emails huérfanos). Caben ~3-4 invocaciones default en free tier.

Cada invocación actualiza `targets.md` (en esta carpeta) y devuelve resumen breve en chat — nunca imprime la lista entera.

## Setup

1. Genera key en https://firecrawl.dev → Dashboard → API Keys.
2. Copia `.env.example` a `.env` en esta carpeta y pega `FIRECRAWL_API_KEY=fc-...`.
3. **No** commitear `.env` (el `.gitignore` del repo ya lo excluye con `.env*`).

## Workflow — discovery default

1. Lee `targets.md`. Extrae dominios raíz de Curados + Pendientes + Rechazados → `seenDomains`.
2. Genera 4 queries en español según [PROMPT.md](PROMPT.md) §Plantillas semilla. Las queries deben usar **anchors específicos** (nombres de medios, comillas, OR) — no genéricas. Si hay texto libre del usuario, 3 lo usan + 1 explora otra categoría.
3. Por cada query → **una sola llamada** `POST /v2/search` con `country` (uno de ES/MX/AR/CL/CO/PE según rotación), `location` correspondiente, `excludeDomains` canónico (ver [PROMPT.md](PROMPT.md) §Constraints), `limit: 5`, y `scrapeOptions` con formato `markdown` + `json` (schema en [FIRECRAWL.md](FIRECRAWL.md)). **No mandar `includeDomains`** — la API rechaza la combinación con `excludeDomains` Y rechaza TLD sufijos. Esto devuelve hasta 5 candidatos YA scrapeados y con extracción estructurada.
4. Iterar `data.web[]`. Filtra cada item por [PROMPT.md](PROMPT.md) §Filtros (orden estricto):
   - **F1** dedup dominio raíz (vs `seenDomains`)
   - **F2** idioma ES con doble check (`json.language` ∈ `{es*, spanish, español, castellano}` Y `metadata.language` empieza por `es`)
   - **F3** keyword match en `markdown` contra lista nicho gaming/iGaming
   - **F4** `json.category` ≠ `"otro"` (mover a Rechazados con razón `categoria-otro` si lo es)
5. Para los supervivientes: construye la fila desde `json` directamente:
   - `Nombre` ← `json.name`
   - `URL` ← `metadata.sourceURL` (raíz del dominio)
   - `Región` ← `json.country_hint` mapeado a ISO 2-letter (`Spain→ES`, `Mexico→MX`, ...)
   - `Submission` ← `press_email` > `general_email` > `form: <contact_form_url>` > `dm: @<social_handle>` > `?`
   - `Notas` ← `json.summary` truncado a ≤80 chars
   - `Categoría` (extra de Pendientes) ← `json.category` mapeado a la sección
   - `Validado` / `Descubierto` ← fecha hoy + query origen

5b. **Map step para emails huérfanos** — para cada superviviente con `Submission === "?"` (los 4 candidatos null):
   - `POST /v2/map` con `{ url: <dominio>, search: "contacto" }` — coste 1 crédito.
   - Tomar primer link que matchee `/contacto`, `/prensa`, `/about` o `/staff` (en ese orden).
   - Si hay match: `POST /v2/scrape` sobre ese subpath con mismo schema JSON — coste ~5 créditos.
   - Si reextrae `press_email` o `general_email` → actualizar `Submission` con ese valor.
   - Si tampoco encuentra: dejar `?` con nota `[verificar contacto manualmente]`.
   - Saltar el map step si el item ya tiene cualquier contacto (email, form o handle).
6. **Append** a `## Pendientes de revisión` en `targets.md`. No borrar nada existente. Las filas con `category === "otro"` filtradas en F4 se **append** a `## Rechazados` con razón `categoria-otro` y fecha de hoy.
7. Imprime resumen: N añadidos, N descartados por filtro (F1/F2/F3/F4), N rescatados por map step, categorías dominantes, créditos totales consumidos (sumar `creditsUsed` de search + map + scrape).

## Workflow — `--deep`

Igual pero 10 queries × `limit: 10` + map step para huérfanos. **Coste real estimado ~500 créditos — agota free tier en 1 invocación**. Avisar y pedir confirmación explícita antes de ejecutar.

## Workflow — `--refresh`

1. No discovery. Solo lee filas de las 6 secciones `## Curados — ...`.
2. Por cada fila: `POST /v2/scrape` con `formats: ["markdown", { type: "json", schema: ... }]` y `location: { country: "ES", languages: ["es"] }`.
3. Si `metadata.statusCode` ≠ 200 o timeout 408 tras retry: marcar nota `[DEAD YYYY-MM-DD]` en columna Notas. **No borrar la fila.**
4. Si `json.press_email` o `json.contact_form_url` difiere del actual: actualiza `Submission`.
5. Actualiza `Validado` con fecha de hoy.
6. Resumen: N ok, N con cambio, N dead-links, créditos consumidos.

## Workflow — texto libre

Sesga query generation hacia ese término (ver [PROMPT.md](PROMPT.md)). Mismo flujo default.

## Reglas duras

- **Idioma**: solo Español. Anglo/portugués fuera de scope. Doble check: `json.language` Y `metadata.language` deben ser ES (Firecrawl alucina con `json.language` en ~10% de casos — validado run-01).
- **Regiones permitidas**: ES, MX, AR, CL, CO, PE, UY, EC, VE, PY, BO.
- **Nunca borrar entradas** de `targets.md` automáticamente. Solo añadir o anotar. Items con categoría `otro` van a Rechazados, no se descartan silenciosamente.
- **Dedup por dominio raíz** (eTLD+1).
- **No mandar `includeDomains`** en search requests — la API rechaza la combinación con `excludeDomains` y rechaza TLD sufijos. Solo `excludeDomains` con la lista canónica de [PROMPT.md](PROMPT.md) §Constraints.
- **Errores Firecrawl**: 429/5xx/408 → backoff exponencial con jitter (5s, 10s, 20s) máx 2 retries, luego skip y reportar. **402 → abortar** con mensaje claro (cuota agotada). **400 con `includeDomains` o `excludeDomains` mismatch** → abortar (bug de la skill, no del usuario; reportar). 401 → abortar (key inválida). Detalles en [FIRECRAWL.md](FIRECRAWL.md).
- **Sin API key** → abortar con mensaje pidiendo crear `.env`.

## Files

- [PROMPT.md](PROMPT.md) — categorías, queries semilla, filtros, schema fila, anti-patterns.
- [FIRECRAWL.md](FIRECRAWL.md) — endpoints, auth, sample requests, error handling.
- `targets.md` — la lista. Editable a mano para promover/rechazar.
- `.env` — API key, no en git.
- `.env.example` — plantilla.
