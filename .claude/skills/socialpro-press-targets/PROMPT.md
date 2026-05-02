# Discovery Prompt — SocialPro Press Targets

Detalle de cómo el agente genera queries, filtra candidatos y rellena filas. SKILL.md referencia este archivo.

## Contexto del negocio

SocialPro es una agencia de representación de creadores de contenido gaming/esports/iGaming en el mercado hispanohablante (España + LATAM). Foco fuerte en **CS2** por la conexión con el ecosistema de skins/gambling. Partners actuales con sitios de skins: SkinsMonkey, KeyDrop, SkinClub, SkinPlace, CSGOBIG, HellCase, CSGOFast, CSGOSkin (estos **no** son targets de prensa, son clientes).

El objetivo de la skill es construir un listado de **dónde postear** notas de prensa o noticias sobre SocialPro y sus creadores.

## Constraints

- **Idioma del sitio: Español únicamente.** Doble enforcement: (a) `country: "ES"` en la request a `/v2/search` sesga el ranking, (b) post-filter rechaza items con `json.language` ≠ `es*`.
- **Regiones permitidas**: ES, MX, AR, CL, CO, PE, UY, EC, VE, PY, BO. Forzado vía `includeDomains: [".es", ".mx", ".ar", ".cl", ".co", ".pe", ".uy", ".ec", ".ve", ".com.mx", ".com.ar", ".com.co", ".com.pe"]` en la request.
- **Excluir granjas SEO**: `excludeDomains: ["prnewswire.com", "openpr.com", "prlog.org", "pressrelease.com", "facebook.com", "instagram.com", "tiktok.com", "wikipedia.org"]` en cada request.
- **Verticales relevantes**: gaming generalista, esports, CS2/FPS competitivo, iGaming/casinos online, skins/CSGO drops, periodismo digital local con sección gaming/tecnología, foros gaming hispanos, periodistas individuales con beat gaming/iGaming.

## Categorías destino

| Categoría | Ejemplos | Dónde van en `targets.md` |
|---|---|---|
| Gaming Generalista | Vandal, MeriStation, 3DJuegos, AS Esports, IGN España | `## Curados — Gaming Generalista` |
| CS2 / FPS Hispano | secciones CS de medios + verticales pequeños en castellano | `## Curados — CS2 / FPS Hispano` |
| iGaming / Skins | comparadores, blogs casino, regulación de juego online en español | `## Curados — iGaming / Skins / Gambling` |
| Prensa Digital Local | ABC, El Mundo, El País Tecnología, Clarín, La Nación AR, El Universal MX | `## Curados — Prensa Digital Local` |
| Foros y Comunidades | Mediavida, Forocoches gaming, ChileComparte, ForosPerú | `## Curados — Foros y Comunidades` |
| Periodistas Individuales | Twitter/X o LinkedIn de redactores con beat gaming/iGaming hispano | `## Curados — Periodistas Individuales` |

Los descubrimientos siempre van primero a `## Pendientes de revisión` con un campo extra `Categoría` (best guess). El usuario los promueve manualmente moviendo la fila a la sección correcta.

## Generación de queries

Default: **4 queries**. `--deep`: **10 queries**. Distribuir entre categorías para diversificar (no más de 2 queries de la misma categoría).

Si el usuario pasa texto libre (`/socialpro-press-targets iGaming Chile`):
- 3 queries incorporan el texto en distintas variantes.
- 1 query libre para no perder cobertura del resto.

### Plantillas semilla (rotar país y categoría)

```
medios gaming españa contacto prensa
enviar nota de prensa esports {país}
sitio noticias CS2 español
cobertura counter-strike castellano
blog iGaming español
noticias casino online {país}
periódico digital sección videojuegos {país}
foro gaming hispano comunidad
subforo videojuegos {país}
periodista esports twitter España
redactor gaming LinkedIn México
noticias skins counter-strike español
agencia prensa esports hispano
```

`{país}` rotando entre: España, México, Argentina, Chile, Colombia, Perú.

### Anti-patterns (no generar queries hacia)

- Sitios anglosajones (HLTV, Dexerto, Esports Insider, EGR Global, SBC News).
- Granjas SEO genéricas: `prnewswire`, `openpr`, `prlog`, `pressrelease.com`. Saturados, descartados como categoría.
- Wikipedia, Facebook, Instagram, TikTok, motores de búsqueda.
- Foros sin nicho (drama, política).
- Sitios de PR de pago (fuera de scope, decidido en grilling).

## Filtros de calidad

Aplicados a cada item de `data.web[]` devuelto por `/v2/search` (o `data` de `/v2/scrape` en `--refresh`). El bloque `json` (extracción estructurada de Firecrawl) reemplaza el parseo manual de markdown — schema completo en [FIRECRAWL.md](FIRECRAWL.md).

Aplicar **en orden**, descartar al primer fallo (excepto el filtro 4 que solo anota):

### 1. Dedup dominio raíz

Extraer eTLD+1 desde `metadata.sourceURL`:
- `noticias.vandal.elespanol.com` → `elespanol.com`
- `gaming.clarin.com.ar` → `clarin.com.ar`
- Twitter/X → guardar como `twitter.com/<handle>` (handle único, no solo dominio).
- LinkedIn → guardar como `linkedin.com/in/<handle>`.

Si el identificador ya está en Curados, Pendientes o Rechazados → descartar.

### 2. Idioma ES

`json.language` debe empezar por `es` (acepta `es`, `es-ES`, `es-MX`, `es-AR`, etc.). Si Firecrawl no extrajo `language`, fallback a `metadata.language` (puede venir como string o array — tomar primero). Si nada lo identifica como español, descartar.

### 3. Keyword match en markdown

El `markdown` devuelto debe contener al menos una (case-insensitive):
`gaming`, `gamer`, `videojuego`, `videojuegos`, `esports`, `e-sports`, `cs2`, `csgo`, `counter-strike`, `gambling`, `casino`, `skins`, `apuestas`, `iGaming`, `streamer`, `creador de contenido`, `Twitch`, `YouTube Gaming`.

Si no hay match, descartar (evita prensa generalista sin nicho relevante).

### 4. Contacto detectable (warn, no descarte)

Firecrawl ya intentó extraer el contacto en el bloque `json`. Construir `Submission` siguiendo prioridad:

1. `json.press_email` (si existe)
2. `json.general_email`
3. `form: <json.contact_form_url>`
4. `dm: @<json.social_handle>`
5. `?` + nota `[verificar contacto manualmente]` en Notas

**No descartar** la entrada aunque sea `?`. El usuario puede investigarlo a mano.

## Schema de fila

```
| Nombre | URL | Región | Submission | Notas | Validado |
```

Casi todo viene del bloque `json` de Firecrawl (extracción estructurada). El agente solo orquesta.

| Columna | Cómo construir |
|---|---|
| **Nombre** | `json.name`. Si `null`, fallback a `metadata.title` recortado (quitar sufijos `\| Categoría`, `- Home`, etc.). Para periodistas: nombre real si está, si no `@handle`. |
| **URL** | Raíz del dominio (eTLD+1) extraída de `metadata.sourceURL`. Para periodistas: URL del perfil completa (`twitter.com/handle`). |
| **Región** | `json.country_hint`. Fallback a TLD (`.es`→ES, `.mx`→MX, `.ar`→AR, `.cl`→CL, `.co`→CO, `.pe`→PE). Si imposible, `ES/LATAM`. |
| **Submission** | Prioridad: `json.press_email` > `json.general_email` > `form: <json.contact_form_url>` > `dm: @<json.social_handle>` > `?`. |
| **Notas** | `json.summary` truncado a ≤80 chars. Si filtro 4 falló, prefijar `[verificar contacto manualmente] `. |
| **Validado** | Fecha ISO `YYYY-MM-DD` de la invocación actual. |

## Pendientes — campos extra

La sección `## Pendientes de revisión` tiene una columna extra:

```
| Nombre | URL | Región | Submission | Notas | Categoría | Descubierto |
```

- **Categoría** — best guess entre las 6 categorías curadas.
- **Descubierto** — fecha ISO + query que lo encontró (`2026-05-02 [foro gaming hispano comunidad]`).

Cuando el usuario promueve una fila, copia las 6 columnas estándar a la sección curada correspondiente y borra la fila de Pendientes.

## Categorización automática

Firecrawl ya devuelve `json.category` con uno de los enum: `gaming-generalista`, `cs2-fps`, `igaming-skins`, `prensa-local`, `foro`, `periodista`, `otro`.

Mapeo a sección de `targets.md` (columna `Categoría` de Pendientes):

| `json.category` | Sección destino |
|---|---|
| `gaming-generalista` | Gaming Generalista |
| `cs2-fps` | CS2 / FPS Hispano |
| `igaming-skins` | iGaming / Skins / Gambling |
| `prensa-local` | Prensa Digital Local |
| `foro` | Foros y Comunidades |
| `periodista` | Periodistas Individuales |
| `otro` | dejar la fila en Pendientes con `Categoría: ?` para revisión manual |

Si `json.category` viene vacío o no es uno del enum (Firecrawl alucinó), tratarlo como `otro`.
