# Discovery Prompt — SocialPro Press Targets

Detalle de cómo el agente genera queries, filtra candidatos y rellena filas. SKILL.md referencia este archivo.

## Contexto del negocio

SocialPro es una agencia de representación de creadores de contenido gaming/esports/iGaming en el mercado hispanohablante (España + LATAM). Foco fuerte en **CS2** por la conexión con el ecosistema de skins/gambling. Partners actuales con sitios de skins: SkinsMonkey, KeyDrop, SkinClub, SkinPlace, CSGOBIG, HellCase, CSGOFast, CSGOSkin (estos **no** son targets de prensa, son clientes).

El objetivo de la skill es construir un listado de **dónde postear** notas de prensa o noticias sobre SocialPro y sus creadores.

## Constraints

- **Idioma del sitio: Español únicamente.** Doble enforcement: (a) `country` en la request a `/v2/search` sesga el ranking al país objetivo, (b) post-filter rechaza items que no son español. **Ojo:** Firecrawl puede devolver `json.language` como `"es"` o `"Spanish"` o `"español"`, y a veces alucina (`language: "es"` para sitios en inglés). El filtro debe aceptar todas las variantes Y cross-check con `metadata.language` (que viene del `<html lang>`, más fiable). Ver §Filtros §2.
- **Regiones permitidas**: ES, MX, AR, CL, CO, PE, UY, EC, VE, PY, BO. **Forzado solo vía `country` + `location`** en la request — `includeDomains` con TLD sufijos (`.es`, `.mx`) está prohibido por la API y es mutuamente excluyente con `excludeDomains`.
- **`excludeDomains` canónico** (lista mínima en cada request — granjas SEO, plataformas, sitios anglo, falsos positivos detectados):
  - Granjas: `prnewswire.com`, `openpr.com`, `prlog.org`, `pressrelease.com`
  - Redes sociales: `facebook.com`, `instagram.com`, `tiktok.com`, `wikipedia.org`
  - Plataformas/oficiales: `discord.com`, `discadia.com`, `disboard.org`, `steamcommunity.com`, `counter-strike.net`, `reddit.com`, `bitdefender.com`
  - Anglo gaming/iGaming: `hltv.org`, `dexerto.com`, `egr.global`, `sbcnews.co.uk`, `deadspin.com`, `gamblinginsider.com`, `igamingexpert.com`
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

**Lección de run-01 (2026-05-02):** queries genéricas trajeron 80% ruido (sitios oficiales, plataformas, holdings, asociaciones). Usar **queries con anchors específicos** — nombres de medios reales, marcas conocidas, modificadores SEO-fu como `intitle:`, `site:`, comillas — multiplica la señal.

```
"vandal" OR "meristation" OR "3djuegos" contacto prensa
revista videojuegos ".es" intitle:contacto
"movistar esports" OR "as esports" CS2 redactor
"counter-strike" "noticias" intitle:redacción {país}
"iGamingMexico" OR "casino online" México noticias
"apuestas online" OR "iGaming" español redacción {país}
"el país" OR "la nación" OR "clarín" videojuegos sección tecnología
"mediavida" OR "forocoches" subforo videojuegos
"chilecomparte" OR "forosperu" OR "argentina warez" gaming
"redactor esports" OR "periodista gaming" twitter site:twitter.com
"linkedin.com/in/" redactor videojuegos {país}
"skinsmonkey" OR "keydrop" reseña español -site:redes
"agencia comunicación" OR "PR esports" "hispano" OR "español"
```

`{país}` rotando entre: España, México, Argentina, Chile, Colombia, Perú.

**Tip de SEO-fu**: usar comillas para forzar literal, `OR` para alternativas, `intitle:`/`site:` cuando la API lo soporte (Firecrawl pasa la query a su backend de search; los modificadores de Google funcionan parcialmente).

### Anti-patterns (no generar queries hacia)

- Sitios anglosajones (HLTV, Dexerto, Esports Insider, EGR Global, SBC News).
- Granjas SEO genéricas: `prnewswire`, `openpr`, `prlog`, `pressrelease.com`. Saturados, descartados como categoría.
- Wikipedia, Facebook, Instagram, TikTok, motores de búsqueda.
- Foros sin nicho (drama, política).
- Sitios de PR de pago (fuera de scope, decidido en grilling).

## Filtros de calidad

Aplicados a cada item de `data.web[]` devuelto por `/v2/search` (o `data` de `/v2/scrape` en `--refresh`). El bloque `json` (extracción estructurada de Firecrawl) reemplaza el parseo manual de markdown — schema completo en [FIRECRAWL.md](FIRECRAWL.md).

Aplicar **en orden**, descartar al primer fallo (excepto el filtro 4 que solo anota; el filtro 5 dispara el step opcional `/v2/map`).

### 1. Dedup dominio raíz

Extraer eTLD+1 desde `metadata.sourceURL`:
- `noticias.vandal.elespanol.com` → `elespanol.com`
- `gaming.clarin.com.ar` → `clarin.com.ar`
- Twitter/X → guardar como `twitter.com/<handle>` (handle único, no solo dominio).
- LinkedIn → guardar como `linkedin.com/in/<handle>`.

Si el identificador ya está en Curados, Pendientes o Rechazados → descartar.

### 2. Idioma ES (doble check, Firecrawl alucina)

Aceptar el item solo si **ambas** condiciones se cumplen:

**(a) `json.language` indica español** — match case-insensitive contra cualquiera de:
`es`, `es-es`, `es-mx`, `es-ar`, `es-cl`, `es-co`, `es-pe`, `spanish`, `español`, `castellano`.

Helper conceptual: `String(json.language).toLowerCase().match(/^(es([-_].*)?|spanish|español|castellano)$/)`.

**(b) Cross-check con `metadata.language`** — viene del atributo `<html lang>` del sitio, más fiable. Normaliza array→primer elemento, lowercase, debe empezar por `es`.

**Si (a) sí pero (b) dice `en`/`pt`/etc → descartar** (Firecrawl está alucinando, el sitio es anglo). Validado en run-01: deadspin.com y gamblinginsider.com pasaron (a) con `language: "es"` pero su `<html lang>` es `en`.

Si Firecrawl no extrajo `json.language` y `metadata.language` empieza por `es`, aceptar (suele ser fiable).

### 3. Keyword match en markdown

El `markdown` devuelto debe contener al menos una (case-insensitive):
`gaming`, `gamer`, `videojuego`, `videojuegos`, `esports`, `e-sports`, `cs2`, `csgo`, `counter-strike`, `gambling`, `casino`, `skins`, `apuestas`, `iGaming`, `streamer`, `creador de contenido`, `Twitch`, `YouTube Gaming`.

Si no hay match, descartar (evita prensa generalista sin nicho relevante).

### 4. Categoría editorial (descartar `otro`)

`json.category` debe ser uno de los 6 enum editoriales: `gaming-generalista`, `cs2-fps`, `igaming-skins`, `prensa-local`, `foro`, `periodista`.

**Si `json.category === "otro"`** → mover el dominio a `## Rechazados` con razón `categoria-otro` y descartar.

Esto descarta plataformas oficiales (Discord, Steam, web del juego), holdings empresariales (Webedia), asociaciones (AEVI), clusters (Madrid In Game) y artículos aislados (Bitdefender) — todos identificados como falsos positivos en run-01.

**Excepción manual**: si el dominio aparece en una whitelist de medios conocidos (mantener en este archivo si surge la necesidad), se acepta aunque sea `otro`. Por ahora no hay whitelist.

### 5. Contacto detectable (no descarte; dispara map opcional)

Firecrawl ya intentó extraer el contacto en el bloque `json`. Construir `Submission` siguiendo prioridad:

1. `json.press_email` (si existe)
2. `json.general_email`
3. `form: <json.contact_form_url>`
4. `dm: @<json.social_handle>`
5. `?` + nota `[verificar contacto manualmente]` en Notas

**Si los 4 primeros vienen `null`**, disparar el step de map en `SKILL.md` §Workflow §Step 5b (`/v2/map` + `/v2/scrape`) — solo cuando el item ya pasó filtros 1-4. Coste extra ~6 créditos por item.

**No descartar** la entrada aunque sea `?` después del map. El usuario puede investigarlo a mano.

## Schema de fila

```
| Nombre | URL | Región | Submission | Notas | Validado |
```

Casi todo viene del bloque `json` de Firecrawl (extracción estructurada). El agente solo orquesta.

| Columna | Cómo construir |
|---|---|
| **Nombre** | `json.name`. Si `null`, fallback a `metadata.title` recortado (quitar sufijos `\| Categoría`, `- Home`, etc.). Para periodistas: nombre real si está, si no `@handle`. |
| **URL** | Raíz del dominio (eTLD+1) extraída de `metadata.sourceURL`. Para periodistas: URL del perfil completa (`twitter.com/handle`). |
| **Región** | `json.country_hint` mapeado a código ISO 2-letter. Firecrawl puede devolver nombre en inglés (`"Spain"`, `"Mexico"`, `"Argentina"`) — convertir: `Spain→ES`, `Mexico→MX`, `Argentina→AR`, `Chile→CL`, `Colombia→CO`, `Peru→PE`, `Uruguay→UY`, `Ecuador→EC`, `Venezuela→VE`. Si ya viene como ISO 2-letter, usar tal cual. Fallback a TLD (`.es`→ES, `.mx`→MX, ...). Si imposible, `ES/LATAM`. |
| **Submission** | Prioridad: `json.press_email` > `json.general_email` > `form: <json.contact_form_url>` > `dm: @<json.social_handle>` > `?`. Si los 4 vienen `null` y el item pasó filtros 1-4, disparar map step (ver SKILL.md §Step 5b) y reintentar. |
| **Notas** | `json.summary` truncado a ≤80 chars. Si filtro 5 sigue sin contacto tras el map, prefijar `[verificar contacto manualmente] `. |
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

**Limitación validada en run-02 (2026-05-02):** Firecrawl asigna `prensa-local` a casi todo cuando reconoce una marca conocida (3DJuegos, Vandal, MERISTATION → todos `prensa-local`, debería ser `gaming-generalista`). La categoría sirve como filtro contra `otro` (F4) pero **no es fiable para asignar la sección destino**. Workaround:

- Cross-check con keywords del `markdown` antes de aceptar la categoría:
  - Markdown contiene `cs2`/`csgo`/`counter-strike` y dominio no es generalista → `cs2-fps`
  - Markdown contiene `casino`/`apuestas`/`igaming` → `igaming-skins`
  - Markdown contiene `videojuegos`/`gaming`/`gamer` → `gaming-generalista` (anula `prensa-local`)
  - Hostname termina en `linkedin.com` o `twitter.com` → `periodista`
  - URL incluye `/foro/` o subdominio `foro.` → `foro`
- Si el cross-check no aclara, dejar como vino y que el usuario promueva manualmente.
