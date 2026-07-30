# Auditoría SEO técnica — 2026-07-30 (Fase 0 del sprint SEO+GEO)

**Alcance:** informe de estado previo al sprint. Read-only, sin cambios en código.

**Origen de la auditoría:** brief SEO+GEO 2026-07-30 (memoria: `project_seo_geo_sprint_jul2026`).

**Convención:** ✅ implementado y OK · ⚠ implementado con matiz o mejorable · ❌ no implementado · 🔍 requiere verificación fuera del repo.

---

## 1. Sitemap y robots

### 1.1 Sitemap (`src/app/sitemap.ts`)
- ✅ **Existe** y es dinámico (Next `MetadataRoute.Sitemap`). Se sirve en `/sitemap.xml`.
- ✅ Incluye rutas dinámicas: `getCaseSlugs`, `getTalentSlugs`, `getPostSlugs`, `getNewsSlugs`, `getBrandSlugs` (marcas SEO).
- ✅ Incluye landings del footer: `/agencia-gaming-latam`, `/guia-dgoj-igaming-influencers`, `/apuesta-segura-cs2`, todas las bilingual (`/influencers-cs2` ↔ `/cs2-influencer-marketing`, `/agencia-influencers-valorant` ↔ `/valorant-influencers-agency`, `/agencia-marketing-esports` ↔ `/esports-marketing-agency`, `/twitch-streamers-agency`, `/betting-influencers`).
- ✅ Multilingual pairs con `alternates.languages` correctos: `es`, `en`, `x-default → ES` (mercado principal).
- ✅ `/creadores/[slug]` y `/c/[slug]` intencionalmente excluidos (noindex).
- ⚠ **`lastModified` fijo en `BUILD_DATE`** para el 80% de las entradas — Google acepta pero es una señal débil de frescura. Correcto por ahora dado que muchas páginas son marketing estático. Mantener.
- ✅ **`/keko` sí está en el sitemap** (falsa alarma del audit inicial — línea 187 del sitemap.ts). En Fase 1 se refuerza su schema `Person`: se unifica el `@id` con el `founder` del layout (`absoluteUrl('/#founder-pablo')`) para que Google las trate como la misma entidad y se añade el episodio de Spotify (`https://open.spotify.com/episode/1NroRDxOt87HJsTEAYBVdt`) al array `subjectOf` (ya tenía el de Canal Sur MP3).
- ⚠ **No incluye `/faq`** aunque está en la lista de sitemap (línea 172 `{ url: absoluteUrl('/faq') }` — correcto, ✅).

### 1.2 Robots (`src/app/robots.ts`)
- ✅ **Existe** como Next.js `MetadataRoute.Robots` dinámico → `/robots.txt`.
- ✅ Disallow correcto: `/api/`, `/admin/`, `/auth/`, `/marcas/` (portal privado). Rutas `/marcas/keydrop|hellcase|skinplace|skinsmonkey` en allow explícito.
- ✅ Bloquea query params (`/*?*`, `/*&*`) evitando duplicados de búsqueda/paginación.
- ✅ Bots de IA con reglas específicas: **GPTBot, Google-Extended, ChatGPT-User, OAI-SearchBot, PerplexityBot, anthropic-ai, ClaudeBot, Amazonbot** — todos permitidos.
- ✅ Bloquea scrapers agresivos: **CCBot, Bytespider**.
- ✅ Bing/MSN con acceso correcto.
- ✅ Declara `sitemap: /sitemap.xml`.

**Fase 1 corregirá:** nada crítico en robots/sitemap. Añadir `/keko` al sitemap si se decide indexar (o dejar como está si es página personal secundaria).

---

## 2. JSON-LD por página

Detección exhaustiva vía grep de `application/ld+json` y `@type`.

### 2.1 Layout global (`src/app/layout.tsx`)
Emite un `@graph` con **4 nodos**:
- **Organization** (`#organization`):
  - name, url, logo (512×512), description completa, `foundingDate: '2012'` ✅, `foundingLocation: Córdoba, España`.
  - `areaServed`: ES, MX, AR, CO, CL, PE ✅.
  - `knowsAbout`: iGaming influencer marketing, CS2 esports, Valorant esports, DGOJ compliance, Hispanic gaming market, FTD tracking, Twitch streaming, YouTube gaming.
  - `contactPoint`: teléfono, email `marketing@socialpro.es`, contactType `sales`, availableLanguage ES+EN.
  - `founder`: **2 nodos** — Pablo "Keko" Camacho (`@id #founder-pablo`, url `https://kekoesports.es`, sameAs incluye kekoesports.es + LinkedIn + X + IG) ✅ y Alfonso "Zack" Arias.
  - `sameAs`: Instagram, X, Facebook, LinkedIn.
  - ⚠ **Falta TikTok** en `sameAs` (el brief lo pide explícitamente).
- **WebSite** (`#website`): url, name, publisher, `inLanguage: 'es'`, `SearchAction` con potentialAction apuntando a `/blog?q=`.
- **LocalBusiness** (`#localbusiness`): teléfono, email, priceRange, address completa (Córdoba), `areaServed` extendido (incluye Turquía y Continent Europa), `makesOffer` con 3 services.
- **SiteNavigationElement** (`#navigation`): 8 páginas del menú principal.

**Cross-reference Pablo ↔ kekoesports.es**: ya está resuelto el lado socialpro.es → kekoesports.es (founder.url + sameAs). El lado inverso queda como TODO en el repo kekoesports.es (memoria: `project_kekoesports_crossref`).

### 2.2 Páginas de detalle
- **`/talentos/[slug]`**: emite `ProfilePage` + `Person` + `FAQPage` + `BreadcrumbList` + `Event` (por cada giveaway activo). ✅ Completo.
- **`/casos/[slug]`**: `Article` con `author` y `publisher` como Organization, `mainEntityOfPage`, `Person` mentions. ✅
- **`/blog/[slug]`**: `BlogPosting` + `PodcastEpisode` (si aplica) + author (Person o Org) + publisher + mentions.
- **`/news/[slug]`**: `NewsArticle` completo con logo publisher, author, `mainEntityOfPage`, `Person` mentions.
- **Sorteos** (`lib/schema.ts`): `Event`, `Offer`, `ItemList`.

### 2.3 Otros @types en uso (grep exhaustivo)
`AboutPage`, `Answer`, `Article`, `Blog`, `BlogPosting`, `BreadcrumbList`, `CollectionPage`, `ContactPage`, `ContactPoint`, `Continent`, `Country`, `Event`, `FAQPage`, `HowTo`, `HowToStep`, `ImageObject`, `ItemList`, `ListItem`, `LocalBusiness`, `NewsArticle`, `Offer`, `OfferCatalog`, `Organization`, `Person`, `Place`, `PodcastEpisode`, `PodcastSeries`, `PostalAddress`, `ProfessionalService`, `ProfilePage`, `Question`, `Service`, `SiteNavigationElement`, `Thing`, `VirtualLocation`, `WebPage`, `WebSite`.

### 2.4 Gaps para Fase 1
- ✅ **`FAQPage` en home**: el `FaqSection` (`src/features/marketing-site/components/FaqSection.tsx`) YA emite el JSON-LD (líneas 49-60 + 75-78). Falsa alarma en la auditoría inicial — la home sí tiene FAQPage schema, solo que dentro del componente y no directamente en `page.tsx`. **Nada que hacer aquí.**
- ⚠ **`FAQPage` en `/apuesta-segura-cs2`**: su bloque `Faq.tsx` no emitía schema (verificado en Fase 1). Corregido en el commit de JSON-LD (Fase 1, commit 3).
- ⚠ **`Organization.sameAs` no incluye TikTok** — corregido en el mismo commit.
- ✅ `Person` en fichas de talento — ya está.
- ✅ `Article` con author + datePublished — ya está en blog/news/casos.
- ✅ Resto de landings con FAQ (`/cs2-influencer-marketing`, `/betting-influencers`, `/guia-dgoj-igaming-influencers`, `/talentos/[slug]`) ya emiten `FAQPage` schema.

---

## 3. Canonical

- ✅ **Root layout** define `metadataBase: new URL(SITE_URL)` + `alternates.canonical: '/'`.
- ✅ Páginas principales con canonical explícito propio: `/`, `/talentos`, `/casos`, `/blog`, `/news`, `/servicios`, `/servicios/igaming`, `/contacto`, `/nosotros`, `/keko`, `/faq`, `/codigos`, y las 40+ páginas que exportan `metadata`.
- ❌ **`/apuesta-segura-cs2/page.tsx` no exporta `metadata`** — sin title propio, sin description, sin canonical. Hereda solo del layout. Fase 1 debe añadirlo (metadata + canonical + OG).
- ⚠ **`/unsubscribe` sin canonical** — es utility para email, probablemente debe ir `noindex`. Marcar en Fase 1.
- ✅ Rutas indexables no deseadas — **ninguna encontrada**: `/creadores/[slug]`, `/c/[slug]`, `/[creatorSlug]`, `/estadisticas`, `/stats/[token]`, `/sorteos/(legal)/*`, `/sorteos/perfil`, `/sorteos/preview/*`, `/sorteos/plataforma/*` — todas con `noindex` correcto.
- ✅ `/api/`, `/admin/`, `/auth/`, `/marcas/(portal)/` bloqueadas por robots.

---

## 4. Redirects

### 4.1 En `next.config.ts` (redirects internos)
- ✅ `/gaming/cs2 → /influencers-cs2` (301)
- ✅ `/gaming/betting → /servicios/igaming` (301, directo, sin cadena)
- ✅ `/influencers-betting → /servicios/igaming` (301, consolidación)
- ✅ `/talento/... → /talentos/...` (con y sin trailing slash)
- ✅ `/en/services|contact|cases|talents → /services|...` (dedup)
- ✅ `/marcas/login → /admin/login`
- ✅ `/giveaways → /codigos`
- ✅ `/talentos/tiger → /talentos/tigerr` (slug corregido)
- ✅ `/sorteos/juego-responsable → /sorteos/participacion-responsable`

### 4.2 Redirects legacy pedidos en Fase 1.3
- ❌ **`/quienes-somos → /nosotros`** — NO existe. Añadir.
- ⚠ **`/servicios/` trailing slash** — Next.js con default `trailingSlash: false` redirige automáticamente. No hay override en config → correcto por defecto. Verificable con `curl -I`.
- ⚠ **`/contacto/` trailing slash** — igual, comportamiento por defecto de Next.

### 4.3 Dominios legacy (socialpro.online, .info, .cloud)
- 🔍 **No se gestionan en código** (grep exhaustivo vacío) — la política vive a nivel de Vercel Dashboard → proyecto proyectozack → Settings → Domains.
- ⚠ **Estado en 2026-07-30 (verificado por el usuario):** `socialpro.online` NO redirigía — servía la web completa con **HTTP 200** como alias, con canonical correcto pero insuficiente (Google indexaría duplicados hasta consolidar). Los otros dos (`.info`, `.cloud`) están por comprobar del mismo modo.
- ✅ **Resuelto en dashboard (2026-07-30, acción del usuario):** los 3 dominios se configuran como `Redirect to socialpro.es` con **308 Permanent** desde Vercel Domains. No requiere cambio de código.
- **Verificación post-propagación** (~5-10 min tras el cambio):
  ```
  curl -I https://socialpro.online/nosotros
  curl -I https://socialpro.info/nosotros
  curl -I https://socialpro.cloud/nosotros
  ```
  Los 3 deben devolver `HTTP/2 308` con `location: https://socialpro.es/nosotros` (preserva el path).

---

## 5. llms.txt

- ✅ **Existe** en `public/llms.txt`, 87 líneas, `rev 4` fechado 2026-06-11.
- ⚠ **Excede el objetivo de ~60 líneas** del brief (Fase 1.4). Contenido actual es bueno pero verboso.
- Contenido actual: About, Key statistics (con fuentes), Services, Key pages, Compliance, Contact, Roster, Testimonials.
- Verticales cubiertas en texto: CS2, iGaming, esports. ❌ **Faltan menciones explícitas** a **skins, Kick, Valorant** como pide el brief para Fase 1.4.
- Refactor Fase 1.4: reducir a ~60 líneas, añadir skins/Kick/Valorant explícitos, endurecer URLs clave.

---

## 6. IndexNow

- ❌ **No configurado**. Grep no encuentra `IndexNow`, ni endpoint de ping, ni key file `public/*.txt` (solo `llms.txt`), ni env var referenciada en código.
- Fase 1.5 lo implementa desde cero — generar key hex ≥32 chars, servir en `public/<key>.txt`, guardar como `INDEXNOW_KEY` en Vercel env, y añadir ping post-deploy. Decisión de arquitectura para la Fase 1: **hook post-build** (script que se ejecuta al final de `npm run build`), no route on-demand — evita depender del cliente y garantiza ping en cada release.

---

## 7. Core Web Vitals / Lighthouse

- 🔍 **No ejecutable desde este entorno** (Lighthouse requiere Chrome headless + deployment vivo). Enfoque estructural en lugar de field data:
  - ✅ Home ya en "dieta" (memoria `project_roadmap_audit_jun2026`, Fase 9 completada en commit 52973e3).
  - ✅ `next/image` con `fill` + `sizes` en avatares (verificado en `WorkedWithSection` y otros componentes marketing).
  - ✅ CSP correcta, sin `'unsafe-eval'` (solo `'wasm-unsafe-eval'` para OCR cliente).
  - ✅ HSTS `max-age=63072000; includeSubDomains; preload`.
  - ✅ `serverExternalPackages: ['pdfjs-dist', 'mupdf', 'tesseract.js']` — no se bundlean.
  - ⚠ `img-src` en CSP incluye `https:` genérico como fallback — funcional pero laxo. No bloqueante.
- **Acción manual sugerida (no dentro de esta fase):** ejecutar `pnpm dlx unlighthouse --site https://socialpro.es --sampling 15` una vez y me pasas el HTML — obtengo CWV real por página y priorizo si aparece algo urgente. Si prefieres, hago un script `npm run seo:audit` en Fase 6.

---

## 8. Resumen accionable para Fase 1 (aprobado por usuario 2026-07-30)

Ordenado por impacto en el sprint:

1. **JSON-LD**
   - ~~Añadir `FAQPage` en home~~ — falsa alarma: el `FaqSection` YA emite el schema. Sin acción.
   - Añadir `FAQPage` en `/apuesta-segura-cs2` (su `Faq.tsx` no emitía schema).
   - Añadir TikTok a `Organization.sameAs`: `https://www.tiktok.com/@socialproes`.
   - `sameAs` de founder Pablo ya está completo (LinkedIn, X, IG, kekoesports.es) — no tocar.
2. **Redirects**
   - Añadir `/quienes-somos → /nosotros` (**301**, **con y sin trailing slash** — dos entradas en `next.config.ts`).
3. **Metadata**
   - Añadir bloque `metadata` completo a `/apuesta-segura-cs2` (title, description, `alternates.canonical`, OG con imagen propia si existe o fallback global).
   - Marcar `/unsubscribe` como `noindex` explícito (`robots: { index: false, follow: false }`).
4. **H1 home**
   - Cambiar a "Agencia de Influencers Gaming e iGaming en España y LATAM". El claim actual ("Conectamos creadores con marcas") pasa a subtítulo. **Cuidado**: no romper el hero visual — revisión en Preview antes de PR.
5. **llms.txt**
   - Recortar a **~60 líneas** manteniendo lo esencial (About + Key stats + Services + Contact + Roster mini).
   - **Añadir verticales explícitas**: CS2 skins / case opening, Kick, Valorant, poker. Hoy solo aparecen CS2 / iGaming / esports en el bloque de servicios.
6. **IndexNow (subfase 1.5)**
   - Generar key hex (yo, con `crypto.randomUUID().replace(/-/g,'')`).
   - Servirla como `public/<key>.txt` con el propio valor de la key como contenido.
   - Guardar la key como env var `INDEXNOW_KEY` en Vercel (tú añades en Dashboard después de que te la pase por canal seguro, **NO en chat**).
   - `scripts/ping-indexnow.ts` como hook post-build (invocado desde `package.json` `"build": "tsx scripts/migrate.ts && next build && tsx scripts/ping-indexnow.ts"` — o mecanismo equivalente). Ping inicial con lista estática de URLs core; en fases siguientes se enriquece con las nuevas landings.
7. **Sitemap y /keko**
   - `/keko` ya está en el sitemap (§1.1 corregido). Refuerzo del schema: unificar `@id` del `Person` de `/keko` con el del `founder` en el layout + añadir el episodio Spotify al array `subjectOf`.
   - Las URLs de las Fases 2-5 se añadirán en cada PR correspondiente al `sitemap.ts`.

**No requieren cambios de código:**
- Dominios legacy → resuelto en Vercel Dashboard (§4.3), verificable con `curl -I` tras propagación.
- Lighthouse → lo ejecuta el usuario en Preview.

---

## 9. Notas para siguientes fases

- **Fase 2 (landings de ataque):** el sitemap ya contempla el patrón bilingual — cada landing nueva se añade al array `bilingualLandings` o directamente al `return` con `lastModified: BUILD_DATE`.
- **Fase 3 (glosario):** ruta `/recursos/glosario` y `/recursos/glosario/[slug]`. Añadir al sitemap. Schema `DefinedTerm` no está en el uso actual (será nuevo).
- **Fase 4 (EN):** `/en` ya existe con hreflang correcto en las 10+ páginas bilingual. Por tanto la Fase 4 **NO es "crear la versión EN"** sino **"completar cobertura EN de las páginas nuevas de Fase 2 + traducir 2 casos"** (1WIN y SkinsMonkey según brief). El patrón `bilingualLandings` en `sitemap.ts` es el mismo, replicable sin cambios estructurales.
- **Fase 5 (autoridad):** geo-landings LATAM y comparativa siguen la misma plantilla que Fase 2. Placeholder benchmark con `noindex` respetando la arquitectura.
- **Fase 6 (medición):** GSC ya recibe sitemap (verificable). Bing WT necesita `BING_WEBMASTER_API_KEY` en Vercel env si vamos a hacer submit programático — evaluar en su momento si aporta versus panel manual.
