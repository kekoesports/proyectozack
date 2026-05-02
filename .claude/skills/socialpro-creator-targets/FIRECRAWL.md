# Firecrawl — referencia para esta skill

Base: `https://api.firecrawl.dev/v2/`. Auth: header `Authorization: Bearer $FIRECRAWL_API_KEY`. **v2 es la versión activa.**

Doc oficial: https://docs.firecrawl.dev/api-reference/v2-introduction.

## Cargar la API key

El agente lee el `.env` de la carpeta de la skill con la herramienta Read y pasa el valor inline en cada curl. **No** sourcear el archivo en el shell (Windows/PowerShell no lo soporta limpio).

Ruta: `.claude/skills/socialpro-creator-targets/.env`. Formato: `FIRECRAWL_API_KEY=fc-...`.

Si la variable no aparece, abortar: `Falta FIRECRAWL_API_KEY. Crea .claude/skills/socialpro-creator-targets/.env.`

## Llamada principal — `/v2/search` con `scrapeOptions`

Una sola request devuelve URLs candidatas YA scrapeadas con markdown + extracción JSON estructurada.

```bash
curl -sS -X POST https://api.firecrawl.dev/v2/search \
  -H "Authorization: Bearer fc-XXX" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "\"westcol\" OR \"roberto cein\" streamer slots Kick",
    "limit": 5,
    "country": "ES",
    "location": "Spain",
    "excludeDomains": [
      "hltv.org", "dexerto.com", "esportsinsider.com", "egr.global", "sbcnews.co.uk",
      "prnewswire.com", "openpr.com", "prlog.org", "pressrelease.com",
      "wikipedia.org", "reddit.com", "discord.com", "steamcommunity.com", "counter-strike.net",
      "skinsmonkey.com", "keydrop.com", "skinclub.com", "skinplace.com",
      "csgobig.com", "hellcase.com", "csgofast.com", "csgoskin.com"
    ],
    "sources": [{ "type": "web" }],
    "scrapeOptions": {
      "formats": [
        "markdown",
        {
          "type": "json",
          "schema": {
            "type": "object",
            "properties": {
              "creators": {
                "type": "array",
                "description": "Lista de creators mencionados con sus handles por plataforma (Twitch, YouTube, Kick). Si la página es un blog post o ranking, extraer hasta 20 entradas.",
                "items": {
                  "type": "object",
                  "properties": {
                    "name":         { "type": "string", "description": "Nombre o display name del creator" },
                    "twitch":       { "type": ["string","null"], "description": "Handle Twitch (sin URL, ej. \"westcol\") si se menciona" },
                    "youtube":      { "type": ["string","null"], "description": "Handle o canal YouTube si se menciona" },
                    "kick":         { "type": ["string","null"], "description": "Slug Kick si se menciona" },
                    "vertical_hint":{ "type": "string", "enum": ["cs2", "igaming", "esports", "gaming", "otro"] },
                    "country_hint": { "type": ["string","null"], "description": "ES, MX, AR, CL, CO, PE, etc. — null si no inferible" },
                    "summary":      { "type": "string", "description": "1-2 frases sobre el creator" }
                  },
                  "required": ["name", "vertical_hint"]
                }
              },
              "language":      { "type": "string", "description": "Código ISO del idioma del sitio (es, en, pt, ...)" },
              "page_summary":  { "type": "string", "description": "Qué es esta página (blog post, ranking, perfil oficial, etc.) en 1 frase" }
            },
            "required": ["creators", "language", "page_summary"]
          }
        }
      ],
      "onlyMainContent": true
    }
  }'
```

### Response shape `/v2/search`

```json
{
  "success": true,
  "data": {
    "web": [
      {
        "title": "...",
        "description": "...",
        "url": "...",
        "markdown": "...",
        "json": {
          "creators": [
            { "name": "Westcol", "twitch": null, "youtube": null, "kick": "westcol", "vertical_hint": "igaming", "country_hint": "CO", "summary": "Streamer de slots colombiano migrado a Kick." }
          ],
          "language": "es",
          "page_summary": "Blog post sobre top streamers de slots hispanos en 2026."
        },
        "metadata": {
          "title": "...",
          "language": "es",
          "sourceURL": "...",
          "statusCode": 200
        }
      }
    ]
  },
  "creditsUsed": 12
}
```

Iterar `data.web[]`. Cada item puede contener un **array de creators** (no uno por item, como pasaba en el press skill). Esto es porque las URLs útiles son típicamente blogs/rankings con múltiples menciones.

**Nota**: `metadata.title`/`description`/`language` pueden venir como `string | string[] | null`. Normalizar siempre a string.

## Geographic targeting

`/v2/search` acepta:

- **`country`** (ISO 2-letter) — sesga ranking. Default `"US"`. **Para esta skill siempre** rotar entre `"ES"`, `"MX"`, `"AR"`, `"CL"`, `"CO"`, `"PE"`, etc.
- **`location`** (string libre) — útil para LATAM: `"Mexico"`, `"Argentina"`, `"Chile"`.
- **`excludeDomains`** — granjas SEO, plataformas, anglo, partners de skins. Lista canónica en PROMPT.md §Anti-patterns.
- **`includeDomains` con TLD sufijos NO ES VÁLIDO** — la API rechaza `.es`, `.mx`, etc. Solo nombres de dominio completos. Lección heredada del press skill.
- **`tbs`** — recencia: `qdr:y` (últ. año), `qdr:m` (últ. mes). Útil para descartar listas viejas.

## Pricing

| Operación | Créditos |
|---|---|
| `/scrape` simple (1 URL, markdown) | 1 |
| `/search` | 2 cada 10 resultados |
| `/search` + `scrapeOptions` con json schema | ≈ 2 + 5/result + tokens del extract |
| Format `json`/extract | basado en tokens (1 crédito = 15 tokens) |

**Estimación por modo** (para esta skill):

| Modo | Llamadas | Créditos aprox |
|---|---|---|
| Default (3–4 search × 5 results) | 3–4 | ~50–80 créditos |
| `--deep` (8–10 × 10) | 8–10 | ~200–280 créditos |
| `--refresh` | 0 | 0 (cero Firecrawl) |

Free tier = 500 créditos one-time. Hobby = 3.000/mes ($16). Standard = 100.000/mes ($83).

## Rate limits

Por team (todas las API keys comparten contador).

| Plan | /search (rpm) | /scrape (rpm) |
|---|---|---|
| Free | 5 | 10 |
| Hobby | 50 | 100 |
| Standard | 250 | 500 |

Default no toca el límite ni en Free. `--deep` (10 calls) tampoco si se hace secuencial.

## Manejo de errores

| Código | Significado | Acción |
|---|---|---|
| 200 | OK | Procesar normal |
| 400 | Params inválidos | Abortar invocación, log el error response, no reintentar |
| 401 | API key ausente/inválida | Abortar con mensaje claro |
| 402 | **Cuota agotada** | Abortar invocación, mensaje claro, no reintentar |
| 408 | Page timeout | Skip esa URL, anotar en audit log |
| 429 | Rate limit | Backoff exponencial 5s/10s/20s, máx 2 retries |
| 5xx | Error servidor | Backoff exponencial 5s/10s, máx 2 retries |

**No hay header `Retry-After` fiable**. Backoff manual.

**Timeout default** del endpoint scrape: 60s (configurable 1.000–300.000 ms). Para sitios lentos, subir a 90.000 ms si reaparecen 408.

## Endpoints futuros (no usados en v1)

- **`/v2/scrape`** — para revisitar una URL específica si Firecrawl no extrajo bien con search.
- **`/v2/map`** — dado un dominio, devuelve URLs internas filtradas por keyword. Útil si un blog tiene un perfil de creator en una subpágina (`/streamers/westcol`) que no apareció en search.

## Diferencias con el press skill (heredadas)

| Punto | Press | Creator |
|---|---|---|
| Output del search | Item = 1 medio | Item = 1 página, contiene array de hasta 20 creators |
| JSON schema | Extrae `name`/`category`/`press_email`/etc. | Extrae `creators[]` con handles por plataforma |
| Filtros | Idioma + categoría editorial + contacto | Idioma + handle resoluble + vertical match (juicio LLM) + followers + actividad |
| Output final | Markdown (`targets.md`) | DB (POST `/api/admin/targets/import`) |
| `--refresh` | Re-scrape de markdown | Re-enrich via APIs de plataforma (cero Firecrawl) |
