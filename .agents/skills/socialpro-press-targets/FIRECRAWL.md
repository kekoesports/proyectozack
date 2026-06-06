# Firecrawl API — referencia para esta skill

Base: `https://api.firecrawl.dev/v2/`. Auth: header `Authorization: Bearer $FIRECRAWL_API_KEY`. **v2 es la versión activa** (v1 ya no aparece en la doc).

Doc oficial: https://docs.firecrawl.dev/api-reference/v2-introduction.

## Cargar la API key

El agente lee el `.env` de la carpeta de la skill con la herramienta Read y pasa el valor inline en cada curl. **No** sourcear el archivo en el shell (Windows/PowerShell no lo soporta limpio).

Ruta: `<repo>/.claude/skills/socialpro-press-targets/.env`. Formato: `FIRECRAWL_API_KEY=fc-...`.

Si la variable no aparece o el archivo no existe, abortar:

> Falta `FIRECRAWL_API_KEY`. Crea `.claude/skills/socialpro-press-targets/.env` con `FIRECRAWL_API_KEY=fc-...`.

## Llamada principal — `/v2/search` con `scrapeOptions`

**Una sola request** devuelve URLs candidatas YA scrapeadas con markdown + extracción estructurada JSON. Reemplaza el patrón antiguo "search → loop de scrape por URL".

### Reglas de la API (validadas en run-01, 2026-05-02)

- **`includeDomains` requiere hostnames completos** (ej. `vandal.elespanol.com`). Sufijos TLD como `.es`, `.mx` → HTTP 400 `Domain must be a valid hostname without protocol or path`.
- **`includeDomains` + `excludeDomains` son mutuamente excluyentes** → HTTP 400 `includeDomains and excludeDomains cannot both be specified`. **Esta skill solo usa `excludeDomains`** (filtro negativo). El sesgo geográfico se logra con `country` + `location`, no con `includeDomains`.

```bash
curl -sS -X POST https://api.firecrawl.dev/v2/search \
  -H "Authorization: Bearer fc-XXX" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "medios gaming españa contacto prensa",
    "limit": 5,
    "country": "ES",
    "location": "Spain",
    "excludeDomains": [
      "prnewswire.com", "openpr.com", "prlog.org", "pressrelease.com",
      "facebook.com", "instagram.com", "tiktok.com", "wikipedia.org",
      "discord.com", "discadia.com", "disboard.org",
      "steamcommunity.com", "counter-strike.net",
      "reddit.com", "bitdefender.com",
      "deadspin.com", "gamblinginsider.com", "igamingexpert.com",
      "hltv.org", "dexerto.com", "egr.global", "sbcnews.co.uk"
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
              "name":             { "type": "string", "description": "Nombre/marca del medio (sin sufijos como ''| Sección'')" },
              "language":         { "type": "string", "description": "Idioma principal del sitio. Aceptamos código ISO 639-1 (''es'', ''en'') o nombre en inglés (''Spanish'', ''English''). Filtramos ambos formatos en post-proceso." },
              "country_hint":     { "type": "string", "description": "País del contenido. Aceptamos código ISO 3166-1 alfa-2 (''ES'', ''MX'', ''AR'') o nombre en inglés (''Spain'', ''Mexico'', ''Argentina''). Mapeamos en post-proceso." },
              "category":         { "type": "string", "enum": ["gaming-generalista", "cs2-fps", "igaming-skins", "prensa-local", "foro", "periodista", "otro"], "description": "Si el sitio es plataforma oficial (Discord, Steam, web del juego), holding empresarial, asociación o cluster, devolver ''otro''. Solo medios/periodistas/foros con contenido editorial entran en las otras 6 categorías." },
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

## Llamada terciaria — `/v2/map` + `/v2/scrape` para emails huérfanos

**Validado en run-01:** la homepage casi nunca expone email. 0 de 20 items tenían `press_email` y solo 1 tenía `general_email`. Para items útiles sin contacto, hacer un follow-up de 2 pasos:

### Paso 1: `/v2/map` para encontrar la página de contacto

```bash
curl -sS -X POST https://api.firecrawl.dev/v2/map \
  -H "Authorization: Bearer fc-XXX" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://vandal.elespanol.com",
    "search": "contacto"
  }'
```

Response: `{ success, links: ["https://vandal.elespanol.com/contacto", ...] }`. Tomar el primer link que matchee `/contacto` o `/prensa` o `/about` o `/staff` (en ese orden de prioridad).

### Paso 2: `/v2/scrape` sobre el subpath con schema de extracción de email

Mismo schema que la principal pero apuntando al subpath. Si `press_email` o `general_email` aparece, actualizar la fila. Si tampoco aparece, dejar `Submission: ?` con nota `[verificar contacto manualmente]`.

### Coste

`/v2/map`: 1 crédito por request. `/v2/scrape` con extract: ~5 créditos. Total por item huérfano: **~6 créditos**. Activar solo cuando `press_email===null && general_email===null && contact_form_url===null` Y el item NO está categorizado como `otro`.

## Pricing (en créditos)

Source: https://firecrawl.dev/pricing.

| Operación | Créditos |
|---|---|
| `/scrape` simple (1 URL, markdown) | 1 |
| `/search` | 2 cada 10 resultados |
| `/search` + `scrapeOptions` | 2 (search) + 1 por URL devuelta + tokens del JSON extract |
| Format `json`/extract | basado en tokens (1 crédito = 15 tokens) |
| Modo enhanced proxy / lockdown | hasta 5 créditos por request |

**Estimación por modo** (validada en run-01, 2026-05-02 — los estimados anteriores subestimaban en 2x):

| Modo | Llamadas | Créditos reales |
|---|---|---|
| Default (4 search × 5 results, con scrape+JSON) | 4 | **~100 créditos** (22-27 por query observado) |
| `--deep` (10 × 10 results) | 10 | **~500 créditos** (agotaría free tier en 1 invocación, **pedir confirmación**) |
| `--refresh` (N curados) | N | N × ~5 créditos |
| Email-followup (`/v2/map` + `/v2/scrape` por item huérfano) | 2 × M | M × ~6 créditos |

Free tier = 500 créditos one-time. Hobby = 3.000/mes ($16). Standard = 100.000/mes ($83).

**Presupuesto real por invocación:**
- Default + email-followup para ~5 items útiles: 100 + 30 = **~130 créditos**.
- Free tier soporta ~3-4 invocaciones default. Hobby ~20/mes.

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

- `country` — código ISO. Default `"US"`. Para esta skill **siempre uno de** `"ES"`, `"MX"`, `"AR"`, `"CL"`, `"CO"`, `"PE"` según la query (sesga el ranking de resultados al país objetivo).
- `location` — string libre. Útil para LATAM: `"Mexico"`, `"Argentina"`, `"Chile"` cuando se rota país en queries.
- `excludeDomains` — útil para excluir granjas SEO conocidas + plataformas + sitios anglo. Ver lista canónica en el bloque del request principal arriba.
- `tbs` — recencia: `qdr:y` (últ. año), `qdr:m` (últ. mes). Útil si quieres descubrir solo sitios activos.

**No usar `includeDomains`** — ya documentado arriba que es incompatible con `excludeDomains` y rechaza TLD sufijos.

`/v2/scrape` acepta `location: { country: "ES", languages: ["es"] }` para que el sitio responda con su versión española si tiene multi-idioma.
