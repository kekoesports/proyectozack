# Firecrawl API — referencia para esta skill

Base: `https://api.firecrawl.dev/v2/`. Auth: header `Authorization: Bearer $FIRECRAWL_API_KEY`. **v2 es la versión activa** (v1 ya no aparece en la doc).

Doc oficial: https://docs.firecrawl.dev/api-reference/v2-introduction.

## Cargar la API key

El agente lee el `.env` de la carpeta de la skill con la herramienta Read y pasa el valor inline en cada curl. **No** sourcear el archivo en el shell (Windows/PowerShell no lo soporta limpio).

Ruta: `~/.claude/skills/socialpro-press-targets/.env`. Formato: `FIRECRAWL_API_KEY=fc-...`.

Si la variable no aparece o el archivo no existe, abortar:

> Falta `FIRECRAWL_API_KEY`. Crea `~/.claude/skills/socialpro-press-targets/.env` con `FIRECRAWL_API_KEY=fc-...`.

## Llamada principal — `/v2/search` con `scrapeOptions`

**Una sola request** devuelve URLs candidatas YA scrapeadas con markdown + extracción estructurada JSON. Reemplaza el patrón antiguo "search → loop de scrape por URL".

```bash
curl -sS -X POST https://api.firecrawl.dev/v2/search \
  -H "Authorization: Bearer fc-XXX" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "medios gaming españa contacto prensa",
    "limit": 5,
    "country": "ES",
    "location": "Spain",
    "includeDomains": [".es", ".mx", ".ar", ".cl", ".co", ".pe", ".uy", ".ec", ".ve", ".com.mx", ".com.ar", ".com.co", ".com.pe"],
    "sources": [{ "type": "web" }],
    "scrapeOptions": {
      "formats": [
        "markdown",
        {
          "type": "json",
          "schema": {
            "type": "object",
            "properties": {
              "name":             { "type": "string", "description": "Nombre/marca del medio (sin sufijos como '| Sección')" },
              "language":         { "type": "string", "description": "Código ISO del idioma del sitio (es, en, pt, ...)" },
              "country_hint":     { "type": "string", "description": "País inferido del contenido (ES, MX, AR, CL, CO, PE, ES/LATAM)" },
              "category":         { "type": "string", "enum": ["gaming-generalista", "cs2-fps", "igaming-skins", "prensa-local", "foro", "periodista", "otro"] },
              "press_email":      { "type": ["string","null"], "description": "Email priorizando prensa@/redaccion@/editor@/noticias@; null si no hay" },
              "general_email":    { "type": ["string","null"], "description": "Otro email visible (info@, contact@) si no hay press_email" },
              "contact_form_url": { "type": ["string","null"], "description": "URL absoluta del form de contacto/prensa si existe" },
              "social_handle":    { "type": ["string","null"], "description": "Handle Twitter/X o LinkedIn si el target es perfil personal de periodista" },
              "summary":          { "type": "string", "description": "1-2 frases sobre qué cubre el sitio" }
            },
            "required": ["name", "language", "category", "summary"]
          }
        }
      ],
      "onlyMainContent": true
    }
  }'
```

### Response shape (`/v2/search`)

```json
{
  "success": true,
  "data": {
    "web": [
      {
        "title": "...",
        "description": "...",
        "url": "...",
        "category": "...",
        "markdown": "...",
        "json": {
          "name": "...",
          "language": "es",
          "country_hint": "ES",
          "category": "cs2-fps",
          "press_email": "prensa@x.com",
          "general_email": null,
          "contact_form_url": null,
          "social_handle": null,
          "summary": "..."
        },
        "metadata": {
          "title": "...",
          "language": "es",
          "sourceURL": "...",
          "url": "...",
          "statusCode": 200
        }
      }
    ]
  },
  "warning": null,
  "id": "...",
  "creditsUsed": 12
}
```

Iterar `data.web[]`. **Nota:** `metadata.title`/`description`/`language` pueden venir como `string | string[] | null`. Normaliza siempre a string (toma el primero del array si aplica). El bloque `json` es la extracción estructurada.

## Llamada secundaria — `/v2/scrape` (modo `--refresh`)

Para revalidar curados existentes. Una URL por request, sin search:

```bash
curl -sS -X POST https://api.firecrawl.dev/v2/scrape \
  -H "Authorization: Bearer fc-XXX" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://vandal.elespanol.com",
    "formats": [
      "markdown",
      { "type": "json", "schema": { /* mismo schema que arriba */ } }
    ],
    "onlyMainContent": true,
    "timeout": 60000,
    "location": { "country": "ES", "languages": ["es"] }
  }'
```

Response: `{ success, data: { markdown, json, metadata } }` (sin envoltorio `web`).

## Pricing (en créditos)

Source: https://firecrawl.dev/pricing.

| Operación | Créditos |
|---|---|
| `/scrape` simple (1 URL, markdown) | 1 |
| `/search` | 2 cada 10 resultados |
| `/search` + `scrapeOptions` | 2 (search) + 1 por URL devuelta + tokens del JSON extract |
| Format `json`/extract | basado en tokens (1 crédito = 15 tokens) |
| Modo enhanced proxy / lockdown | hasta 5 créditos por request |

**Estimación por modo** (para esta skill):

| Modo | Llamadas | Créditos aprox |
|---|---|---|
| Default (4 search × 5 results, con scrape+JSON) | 4 | 4 × (2 + 5 + ~5 tokens) ≈ **~50 créditos** |
| `--deep` (10 × 10) | 10 | ~250 créditos |
| `--refresh` (N curados) | N | N × ~5 créditos |

Free tier = 500 créditos one-time. Hobby = 3.000/mes ($16). Standard = 100.000/mes ($83). Con default ligero entran ~10 invocaciones gratis o ~60 al mes con Hobby.

## Rate limits

Por team (todas las API keys comparten contador). Source: https://docs.firecrawl.dev/rate-limits.

| Plan | /search (rpm) | /scrape (rpm) | /map (rpm) | /crawl (rpm) |
|---|---|---|---|---|
| Free | 5 | 10 | 10 | 1 |
| Hobby | 50 | 100 | 100 | 15 |
| Standard | 250 | 500 | 500 | 50 |

Para el modo default (4 calls) no toca el límite ni en Free. `--deep` (10 calls) tampoco.

## Manejo de errores

Source: https://docs.firecrawl.dev/api-reference/v2-introduction.

| Código | Significado | Acción |
|---|---|---|
| 200 | OK | Procesar normal. |
| 400 | Params inválidos | Abortar invocación, log el error response, no reintentar. |
| 401 | API key ausente/inválida | Abortar con mensaje claro al usuario. |
| 402 | **Cuota agotada** | Abortar invocación, mensaje claro, **no reintentar**. |
| 408 | Page timeout (la URL no respondió a tiempo) | Skip esa URL, anotar en resumen. |
| 429 | Rate limit | Backoff exponencial con jitter (5s, 10s, 20s), reintentar máx 2 veces. |
| 5xx | Error servidor | Backoff exponencial con jitter (5s, 10s), reintentar máx 2 veces. |

Códigos granulares en body: `SCRAPE_TIMEOUT`, `SCRAPE_SSL_ERROR`, `SCRAPE_NO_CACHED_DATA`, `UNKNOWN_ERROR`.

**No hay header `Retry-After` fiable** (issue abierto en GitHub firecrawl/firecrawl#819). Usa backoff manual.

**Timeout default** del endpoint scrape: 60s (configurable 1.000-300.000 ms). Para sitios lentos, subir a 90.000 ms si reaparecen 408.

## Geographic targeting (clave para esta skill)

`/v2/search` acepta:

- `country` — código ISO. Default `"US"`. Para esta skill **siempre `"ES"`** (sesga el ranking de resultados a sitios españoles).
- `location` — string libre. Útil para LATAM: `"Mexico"`, `"Argentina"`, `"Chile"` cuando se rota país en queries.
- `includeDomains` — lista de TLD/dominios. Filtra por sufijo. Para hispanohablante: `[".es", ".mx", ".ar", ".cl", ".co", ".pe", ".uy", ".ec", ".ve", ".com.mx", ".com.ar", ".com.co", ".com.pe"]`.
- `excludeDomains` — útil para excluir granjas SEO conocidas: `["prnewswire.com", "openpr.com", "prlog.org", "pressrelease.com"]`.
- `tbs` — recencia: `qdr:y` (últ. año), `qdr:m` (últ. mes). Útil si quieres descubrir solo sitios activos.

`/v2/scrape` acepta `location: { country: "ES", languages: ["es"] }` para que el sitio responda con su versión española si tiene multi-idioma.

## Mapping endpoint (futuro / opcional)

`/v2/map` — dado un dominio, devuelve URLs internas filtradas por keyword. Útil como **fallback v2** si un candidato bueno no expone email obvio: `POST /v2/map` con `{ "url": "https://medio.com", "search": "contacto" }` para encontrar `/contacto`, `/prensa`, `/about`. No usado en v1 de la skill.
