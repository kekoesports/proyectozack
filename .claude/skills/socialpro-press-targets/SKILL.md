---
name: socialpro-press-targets
description: Discover and curate Spanish-language press, news, and PR submission targets for SocialPro (gaming/esports/iGaming talent agency in ES + LATAM) using Firecrawl. Maintains targets.md split by category — gaming media, CS2/FPS, iGaming/skins, local digital press, forums, journalists. Use when the user runs /socialpro-press-targets, asks for press release targets, news outlets in Spanish, ES/LATAM PR contacts, gaming journalists for cold outreach, or wants to discover/refresh outlets where SocialPro can post a press release.
---

# SocialPro Press Targets

Lista híbrida (curados + discovery) de medios, blogs, foros, prensa digital local y periodistas hispanohablantes donde SocialPro puede postear notas de prensa o noticias. Verticales: gaming, esports, CS2/FPS, iGaming, skins.

## Quick start

```
/socialpro-press-targets                  # discovery ligero (~50 créditos Firecrawl)
/socialpro-press-targets --deep           # discovery pesado (~250 créditos)
/socialpro-press-targets --refresh        # sin discovery, revalida curados (~5 créditos × N)
/socialpro-press-targets iGaming Chile    # discovery sesgado al texto
```

Free tier = 500 créditos. Cada invocación actualiza `targets.md` (en esta carpeta) y devuelve resumen breve en chat — nunca imprime la lista entera.

## Setup

1. Genera key en https://firecrawl.dev → Dashboard → API Keys.
2. Copia `.env.example` a `.env` en esta carpeta y pega `FIRECRAWL_API_KEY=fc-...`.
3. **No** commitear `.env`.

## Workflow — discovery default

1. Lee `targets.md`. Extrae dominios raíz de Curados + Pendientes + Rechazados → `seenDomains`.
2. Genera 4 queries en español según [PROMPT.md](PROMPT.md). Si hay texto libre del usuario, 3 lo usan + 1 explora otra categoría.
3. Por cada query → **una sola llamada** `POST /v2/search` con `country: "ES"`, `includeDomains` ES/LATAM, `limit: 5`, y `scrapeOptions` con formato `markdown` + `json` (schema en [FIRECRAWL.md](FIRECRAWL.md)). Esto devuelve hasta 5 candidatos YA scrapeados y con extracción estructurada (`name`, `language`, `category`, `press_email`, `general_email`, `contact_form_url`, `social_handle`, `summary`).
4. Iterar `data.web[]`. Filtra cada item por [PROMPT.md](PROMPT.md) §Filtros: dedup dominio raíz, `json.language` empieza por `es`, keyword match en `markdown`.
5. Para los supervivientes: construye la fila desde `json` directamente:
   - `Nombre` ← `json.name`
   - `URL` ← `metadata.sourceURL` (raíz del dominio)
   - `Región` ← `json.country_hint`
   - `Submission` ← `press_email` > `general_email` > `form: <contact_form_url>` > `dm: @<social_handle>` > `?`
   - `Notas` ← `json.summary` truncado a ≤80 chars
   - `Categoría` (extra de Pendientes) ← `json.category` mapeado a la sección
   - `Validado` / `Descubierto` ← fecha hoy + query origen
6. **Append** a `## Pendientes de revisión` en `targets.md`. No borrar nada existente.
7. Imprime resumen: N añadidos, N descartados (idioma/keyword/dedup), categorías dominantes, créditos consumidos (`creditsUsed` sumado de cada response).

## Workflow — `--deep`

Igual pero 10 queries × `limit: 10`. **Avisa coste estimado (~250 créditos) y pide confirmación** antes de ejecutar.

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

- **Idioma**: solo Español. Anglo/portugués fuera de scope.
- **Regiones permitidas**: ES, MX, AR, CL, CO, PE, UY, EC, VE, PY, BO.
- **Nunca borrar entradas** de `targets.md` automáticamente. Solo añadir o anotar.
- **Dedup por dominio raíz** (eTLD+1).
- **Errores Firecrawl**: 429/5xx/408 → backoff exponencial con jitter (5s, 10s, 20s) máx 2 retries, luego skip y reportar. **402 → abortar** con mensaje claro (cuota agotada). 401 → abortar (key inválida). Detalles en [FIRECRAWL.md](FIRECRAWL.md).
- **Sin API key** → abortar con mensaje pidiendo crear `.env`.

## Files

- [PROMPT.md](PROMPT.md) — categorías, queries semilla, filtros, schema fila, anti-patterns.
- [FIRECRAWL.md](FIRECRAWL.md) — endpoints, auth, sample requests, error handling.
- `targets.md` — la lista. Editable a mano para promover/rechazar.
- `.env` — API key, no en git.
- `.env.example` — plantilla.
