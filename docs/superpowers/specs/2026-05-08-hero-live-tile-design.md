# Hero asimétrico con live tile — Design

**Fecha:** 2026-05-08
**Owner:** rechedev
**Status:** Approved (awaiting plan)
**Componente afectado:** `src/features/marketing-site/components/Hero.tsx` + nuevo `HeroLiveTile.tsx`

## Contexto

El hero actual es type-driven puro: logo X grande centrado, eyebrow, H1 masivo (`CONECTAMOS / CREADORES / CON MARCAS`), subhead, dos CTAs. Funciona estéticamente pero:

- **Above the fold no aparece producto.** Los creadores son lo que vendemos y no se ven hasta scroll. Viola el principio "Creators are the product" del propio `.impeccable.md`.
- **Stats viven 20rem por debajo del fold** (mt-20 al final del Hero), por lo que `13+ años · 15M views · 340 FTDs` no aporta proof a quien aterriza.
- **No hay señal operativa:** la agencia tiene infraestructura `/api/live` con featured streamer, viewer counts y roster en tiempo real, pero esa señal sólo aparece en `LiveSection`, varios scrolls abajo.

## Objetivo

Convertir el hero en un panel **asimétrico** con prueba operativa visible: tipografía + CTAs en la columna izquierda, **live tile** dinámico en la columna derecha que muestra quién está en directo ahora (o el roster cuando nadie está live).

Sin contenido nuevo de backend ni assets de imagen generados.

## Layout

### Desktop (≥lg)

Grid de dos columnas dentro del contenedor `max-w-7xl`:

```
columna izquierda (≈60%, ~1fr)         columna derecha (~360px fijo)
+------------------------------------+ +-------------------------------+
| eyebrow GAMING & ESPORTS ·…       | |  ● LIVE  12.4K          [CS2] |
|                                    | |  +-------------------------+ |
| CONECTAMOS                         | |  |                         | |
| CREADORES   (gradient)             | |  |   thumbnail 16:9        | |
| CON MARCAS                         | |  |                         | |
|                                    | |  +-------------------------+ |
| Subhead 1–2 líneas                 | |  Andreachini                  |
|                                    | |  Rumbo a la final · CS2       |
| 13+ AÑOS · 15M VIEWS/MES · 340 FTDS| |  ─────────────────────────────|
|                                    | |  +3 más en directo →          |
| [Tengo marca →]   [Soy creador →]  | +-------------------------------+
| Respuesta en 24h · Sin compromiso  |
+------------------------------------+
```

Breakpoints:
- `<sm`: stack vertical (single column).
- `sm` y `md`: stack vertical (single column) — el tile irá debajo del bloque type.
- `≥lg`: split asimétrico real con `lg:grid-cols-[1fr_360px] lg:gap-12`.

### Mobile / tablet (<lg)

Type primero a ancho completo, tile live debajo. El tile colapsa a un layout horizontal compacto:

- Estado A: card horizontal con thumbnail a la izquierda y nombre/viewer/juego a la derecha.
- Estado B: mosaico `3×2` de fotos del roster.

## Cambios sobre la columna izquierda

1. **Quitar logo X grande centrado.** Ya está en el header, repetirlo es ruido. La tipografía es la identidad.
2. **Eyebrow conservado.** `GAMING & ESPORTS · ESPAÑA · LATAM · EUROPA`, mismo estilo (`text-[10px] tracking-[0.4em] text-sp-muted2`).
3. **H1 reescalado** para encajar en columna 60%:
   - Mobile: `text-[2.75rem]` (sin cambio).
   - sm: `text-[3.5rem]` (sin cambio).
   - md: `text-[5rem]` (sin cambio).
   - lg: `text-[6rem]` (antes `text-[10rem]`).
   - xl/2xl: `text-[7rem]`.
   - `leading-[0.85]` y motion slide-in actual conservados. Gradient en `CREADORES` conservado.
4. **Stats inline** — fila nueva entre subhead y CTAs:
   ```
   13+ AÑOS  ·  15M VIEWS/MES  ·  340 FTDS
   ```
   Tipografía: `font-display text-sm font-bold uppercase tracking-[0.25em]`, separadores `·` con `text-sp-muted2`. Los valores en `text-white`, los labels en `text-sp-muted2/80`. Animación `opacity 0→1` con delay 0.7 (entre subhead y CTAs).
5. **Eliminar** el bloque `mt-20 flex gap-12 sm:gap-24` con `HERO_STATS` actual (los stats pasan a inline).
6. CTAs y footnote sin cambios estructurales.

## `HeroLiveTile.tsx` — nuevo componente

**Ubicación:** `src/features/marketing-site/components/HeroLiveTile.tsx`
**Tipo:** client component (`'use client'`).
**Footprint visual:** aspect aproximado 4:5, ancho fijo 360px en lg, full-width en stack mobile.

### Estados

#### Loading (skeleton)

Hasta que llega la primera respuesta de `/api/live`. Skeleton oscuro: header `● —— · cargando` (gray pulse) y un bloque `bg-white/[0.03] animate-pulse` ocupando el área del thumbnail.

**Importante:** el hero entero no debe esperar al fetch. El H1 (LCP) renderiza con SSR; el tile se hidrata client-side y muestra skeleton hasta tener datos.

#### Estado A — alguien live (`total > 0 && featured != null`)

```
┌─────────────────────────────────────────┐
│ ● LIVE   12.4K viewers          [CS2]  │   ← header strip
├─────────────────────────────────────────┤
│                                         │
│   [stream thumbnail 16:9]               │   ← preview Twitch
│                                         │
├─────────────────────────────────────────┤
│ Andreachini                             │
│ Rumbo a la final del torneo · CS2       │
├─────────────────────────────────────────┤
│ +3 más en directo →                     │   ← link a #en-directo
└─────────────────────────────────────────┘
```

**Thumbnail source:**
- Primario: `https://static-cdn.jtvnw.net/previews-ttv/live_user_<handle>-440x248.jpg?_=<timestamp>` (Twitch CDN, refresca con timestamp).
- Fallback: `featured.photoUrl` con object-cover.
- YouTube live: si `featured.platform === 'youtube'`, usar `https://i.ytimg.com/vi/<videoId>/hqdefault_live.jpg` (la API ya devuelve videoId del stream).
- Manejar error de carga con `onError` → fallback a photoUrl.

**Header strip:**
- `● LIVE` red-500 con pulse animation (igual al de `LiveSection`).
- Viewer count formateado con `formatViewers` (reusable, ya existe en `LiveSection.tsx` — mover a `lib/format.ts` para compartir).
- Badge de juego derivado con `gameBadge` (también reusable, mover al mismo módulo).

**`+N más en directo →`:** sólo si `others.length > 0`. Anchor `#en-directo` apuntando al `<section>` de `LiveSection` (añadir `id="en-directo"` al section).

**Click en el thumbnail:** abre `featured.streamUrl` (target `_blank`, `rel="noopener noreferrer"`). Track `cta_click` con `cta_id: 'hero_live_tile_featured'`.

#### Estado B — nadie live (`total === 0`)

```
┌─────────────────────────────────────────┐
│ ● ROSTER   0 EN DIRECTO                 │
├─────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐                    │
│ │ ph │ │ ph │ │ ph │   (3 cols)         │
│ │ A  │ │ B  │ │ C  │                    │
│ └────┘ └────┘ └────┘                    │
│ ┌────┐ ┌────┐ ┌────┐                    │
│ │ ph │ │ ph │ │ ph │                    │
│ │ D  │ │ E  │ │ F  │                    │
│ └────┘ └────┘ └────┘                    │
├─────────────────────────────────────────┤
│ Síguelos en Twitch →                    │
└─────────────────────────────────────────┘
```

**Selección de los 6:** primero `roster.filter(featuredFallback)`, luego completar con los primeros del roster hasta llegar a 6.

**Mosaic cells:** square aspect, foto del creador, nombre en overlay con gradient bottom (`from-black/80 to-transparent`). Click → `streamUrl` o `https://www.twitch.tv/<handle>`.

**`● ROSTER` pulse:** color gris (`bg-white/30`), pulse animation suave para indicar que la sección está viva pero nadie está live ahora mismo.

**Footer link:** ancla a `#en-directo` (mismo destino que el estado A).

#### Estado C — error / no data

Si `/api/live` falla o devuelve roster vacío, `HeroLiveTile` retorna `null` y la columna izquierda se expande a full width vía `lg:grid-cols-1` condicional. No mostrar skeleton infinito ni mensajes de error en el hero.

### Fetch & refresh

Reusa el endpoint actual `/api/live`. Patrón idéntico al de `LiveSection.tsx`:

```ts
const REFRESH_MS = 120_000;
useEffect(() => {
  void fetchLive();
  const interval = setInterval(() => void fetchLive(), REFRESH_MS);
  return () => clearInterval(interval);
}, []);
```

**No introducir un segundo fetch independiente al de `LiveSection`.** Para evitar duplicación, factorizar el fetch en `src/features/live/hooks/useLiveData.ts` (nuevo) y consumirlo desde ambos componentes. React deduplica fetches naturales si están bien cacheados, pero un hook compartido es más limpio.

```ts
// useLiveData.ts
export function useLiveData(): { data: LiveData | null; loading: boolean }
```

## Refactors necesarios

1. **`src/lib/live-format.ts`** (nuevo) — funciones puras `formatViewers`, `gameBadge` extraídas de `LiveSection.tsx`. `LiveSection` y `HeroLiveTile` las importan.
2. **`src/features/live/hooks/useLiveData.ts`** (nuevo) — hook compartido para fetchear `/api/live` con refresh interval.
3. **`LiveSection.tsx`** — refactor light: importar formatters y hook desde los módulos nuevos. Sin cambios funcionales.
4. **`Hero.tsx`** — refactor de layout (grid asimétrico), stats inline, eliminar logo X y el footer stats actual, integrar `<HeroLiveTile />`.
5. **Añadir `id="en-directo"`** a `<section>` raíz de `LiveSection` para que el ancla del tile funcione.

## Performance

- **LCP intacto:** el H1 sigue siendo SSR-rendered y es lo primero pintado. El tile carga con skeleton client-side; aunque tarde 1s en hidratar no impacta LCP del H1.
- **Thumbnail Twitch:** la URL `previews-ttv` se sirve desde el CDN de Twitch, ya está en CSP `img-src https:`. Cargar `loading="lazy"` no porque es above-the-fold; usar `<Image priority={false}>` por defecto y dejar Next decidir, o `<img>` directo (preview-ttv refresca cada minuto vía timestamp y Next/Image cachearía la imagen vieja).
- **Mosaic photos (Estado B):** las primeras 2 con `priority`, el resto lazy.
- **Auras existentes:** el componente actual tiene 2 auras pink/orange con parallax. Las desplazo para que la pink quede detrás de la columna izquierda y la orange detrás de la derecha — sin cambios al motion code.

## Telemetry

`trackEvent('cta_click', ...)` con dos nuevos `cta_id`:
- `hero_live_tile_featured` (click en thumbnail/featured live).
- `hero_live_tile_roster_card` (click en una card del mosaico estado B).

Los CTAs principales (`hero_home_primary`, `hero_home_creators`) conservan sus IDs.

## Accesibilidad

- Header `● LIVE` y `● ROSTER` con `aria-label="En directo ahora"` / `aria-label="Roster offline"`.
- Pulse animation respeta `prefers-reduced-motion` (mismo guard que las auras existentes).
- Mosaic cells son links nativos `<a>`, navegables con teclado.
- Skeleton tiene `aria-hidden="true"`.

## Out of scope (no se toca)

- `LiveSection.tsx` — sigue ahí completa. El usuario que llega y ve el tile pulsando puede hacer scroll/clic y entrar a la sección expandida.
- Datos: el endpoint `/api/live` no cambia.
- Mobile nav, footer, otras secciones.
- Generación de assets — se confirmó en brainstorm que no hacen falta.

## Riesgos / open questions

- **Tile Estado B se ve "vacío" si todas las fotos del roster son del mismo nicho** (ej. todos CS2). Mitigación: ordenar el roster con shuffle estable o priorizar diversidad de juego en `getLiveTalents` query. Lo dejo como follow-up — no bloquea el spec.
- **Ratio de tiempo Estado A vs Estado B:** si los streamers conectan ~3-6h/día y el horario está distribuido, Estado A aparecerá durante una fracción del día. Aceptado como diseño consciente — ambos estados son útiles.
- **Si Twitch CDN cae**, el `onError` debe cubrir bien con la photoUrl. Probar manualmente cortando red en devtools.

## Aceptación

- [ ] Desktop ≥lg: hero muestra grid 60/40 con type a la izquierda y tile live a la derecha.
- [ ] Cuando hay live → tile muestra featured con thumb + viewers + game.
- [ ] Cuando nadie live → tile muestra mosaico 3×2 del roster.
- [ ] Mobile <lg: stack vertical, type primero, tile compacto debajo.
- [ ] Stats `13+ AÑOS · 15M VIEWS · 340 FTDS` arriba de los CTAs (no abajo).
- [ ] Logo X grande centrado eliminado del hero.
- [ ] Sin regresión de LCP (medir con Lighthouse antes/después; objetivo ≤2.5s).
- [ ] `LiveSection` sigue funcionando con `id="en-directo"` y links del tile anclan correctamente.
- [ ] `npx tsc --noEmit` y `npm run lint` verdes.
