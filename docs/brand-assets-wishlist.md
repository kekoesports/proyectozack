# Brand assets — wishlist de reemplazo

Inventario auditado el 2026-05-09. El sistema visual (`<BrandLogo>` con tratamiento monochrome premium) funciona con los assets actuales, pero subir mejores versiones eleva la calidad visual sin parches.

## Formato ideal estándar

- **Formato preferente:** SVG (vectorial, escala perfecta). Alternativa: PNG con canal alpha.
- **Resolución mínima PNG (si SVG no disponible):** 1200×300 px (4:1 landscape) o 1024×1024 (1:1 squarish). Cubrir retina @3x para chips de hasta 400px.
- **Fondo:** transparente. Sin fondos blancos/negros incrustados ni rectángulos sólidos.
- **Variantes ideales por marca:**
  - `<slug>.svg` o `<slug>.png` — versión color principal
  - `<slug>-mono.svg` o `<slug>-light.png` — versión clara/blanca para fondos oscuros (opcional, el filtro actual lo simula)
- **Origen:** brand kit oficial / press kit de la marca. **NO** capturas de pantalla, **NO** favicons (16-32px), **NO** logos extraídos de la home.

## Estado actual y reemplazos recomendados

Auditoría: dimensiones, formato, peso real (`/public/images/brands/`).

| Marca         | Archivo actual            | Dimensiones  | Formato | Problema visual                                                                 | Recomendado                          | Tamaño mín.   | Transparente | Prioridad |
|---------------|---------------------------|--------------|---------|---------------------------------------------------------------------------------|--------------------------------------|---------------|--------------|-----------|
| Clash.gg      | `clashgg.jpg`             | 240×60       | JPG     | **JPG con fondo incrustado** — no se integra con tratamiento monochrome         | SVG o PNG transparente               | 1200×300      | sí           | **ALTA**  |
| Skin.place    | `skinplace.png`           | 256×256      | PNG α   | Aspect 1:1 mientras el resto es 4:1 — rompe consistencia en sidebar/carrusel    | SVG o PNG horizontal alta-res        | 1200×300      | sí           | **ALTA**  |
| 1Win          | `1win.png`                | 1920×1031    | PNG α   | Sobredimensionado (74KB) — desperdicio de banda y aspect raro 1.86:1            | SVG o PNG 1200×300 horizontal        | 1200×300      | sí           | media     |
| SkinClub      | `skinclub.png`            | 240×60       | PNG α   | Solo 3.6KB → compresión agresiva, se ve sucio al filtrar monochrome             | SVG o PNG ≥1200×300                  | 1200×300      | sí           | media     |
| SkinsMonkey   | `skinsmonkey.png`         | 240×60       | PNG α   | Solo 3.6KB → mismo problema, ligero pixelado                                    | SVG o PNG ≥1200×300                  | 1200×300      | sí           | media     |
| Keydrop       | `keydrop.png`             | 240×60       | PNG α   | Resolución baja (5.2KB) — funciona pero nota pixelado en zoom retina            | SVG o PNG ≥1200×300                  | 1200×300      | sí           | media     |
| Pin-Up        | `pinup.png`               | 240×60       | PNG α   | Resolución baja                                                                 | SVG o PNG ≥1200×300                  | 1200×300      | sí           | media     |
| Hellcase      | `hellcase.png`            | 240×60       | PNG α   | Resolución baja                                                                 | SVG o PNG ≥1200×300                  | 1200×300      | sí           | baja      |
| GGDrop        | `ggdrop.png`              | 240×60       | PNG α   | Resolución baja                                                                 | SVG o PNG ≥1200×300                  | 1200×300      | sí           | baja      |
| Jugabet       | `jugabet.png`             | 240×60       | PNG α   | Resolución baja                                                                 | SVG o PNG ≥1200×300                  | 1200×300      | sí           | baja      |
| Melbet        | `melbet.png`              | 240×60       | PNG α   | Resolución baja                                                                 | SVG o PNG ≥1200×300                  | 1200×300      | sí           | baja      |
| GrandWin      | `grandwin.png`            | 240×60       | PNG α   | Resolución baja (decente a 19KB pero limitado a 60px alto)                      | SVG o PNG ≥1200×300                  | 1200×300      | sí           | baja      |
| Kick          | `kick.png`                | 240×60       | PNG α   | Resolución baja                                                                 | SVG (Kick tiene SVG público oficial) | 1200×300      | sí           | baja      |
| PcComponentes | `pccomponentes.png`       | 240×60       | PNG α   | Resolución baja                                                                 | SVG (tienen brandkit oficial)        | 1200×300      | sí           | baja      |
| Emma          | `emma.png`                | 240×60       | PNG α   | Resolución baja                                                                 | SVG o PNG ≥1200×300                  | 1200×300      | sí           | baja      |
| ZeroTwo       | `zerotwo.png`             | 240×60       | PNG α   | Resolución baja                                                                 | SVG o PNG ≥1200×300                  | 1200×300      | sí           | baja      |
| Razer         | `razer.png`               | 600×140      | PNG α   | OK — única con resolución decente (4.3:1, 14KB)                                 | Ideal: SVG (Razer tiene press kit)   | (ya OK)       | sí           | opcional  |

### Logos de creator codes (tabla `creator_codes`, no en `/public/images/brands/`)

Estos viven en URLs externas y son frágiles. Conviene migrarlos al registry local cuando se reemplacen los assets de marca:

| Marca       | Origen actual                         | Problema                                    | Acción                                               | Prioridad |
|-------------|---------------------------------------|---------------------------------------------|------------------------------------------------------|-----------|
| Hellcase    | `gstatic faviconV2` (~32px)           | Favicon, no logo. Calidad pésima            | Reusar `/public/images/brands/hellcase.png` mejorado | media     |
| SkinsMonkey | `gstatic faviconV2` (~32px)           | Favicon                                     | Reusar `/public/images/brands/skinsmonkey.png`       | media     |
| Keydrop     | `imgur.com/<id>`                      | URL externa frágil, puede caerse            | Reusar `/public/images/brands/keydrop.png`           | media     |
| Skinplace   | `imgur.com/<id>`                      | URL externa frágil                          | Reusar `/public/images/brands/skinplace.png`         | media     |

Tras subir los assets mejorados, ejecutar:
```bash
npx tsx scripts/seeds/backfill-giveaway-brand-logos.ts
```
para hidratar `giveaways.brand_logo` con los paths locales.

## Cómo entregar los assets nuevos

1. **Por marca, una carpeta** con los archivos disponibles del press kit oficial:
   - `<marca>/<slug>.svg` (preferente)
   - `<marca>/<slug>.png` (fallback transparente, ≥1200×300)
   - `<marca>/<slug>-light.png` (opcional, versión blanca/clara)
2. **Subirlos a `/public/images/brands/`** sobreescribiendo los existentes (mantener nombre slug en lower-case sin espacios).
3. **Si el formato cambia** (PNG → SVG), actualizar `BRAND_LOGO_MAP` en `scripts/seeds/backfill-giveaway-brand-logos.ts` y `BRAND_REGISTRY` (si aplica).
4. Validar localmente con `npm run dev` → revisar `/`, `/casos`, `/sorteos` y mobile.

## Notas sobre SVG en el stack actual

- `<BrandLogo>` usa `next/image`. SVG funciona con `unoptimized` o vía direct `<img>` con `loader` custom — actualmente render como raster. Si se decide migrar a SVG, hay un mini-refactor de ~30 LOC en `src/components/ui/BrandLogo.tsx`.
- **Workaround sin refactor:** subir SVG y también un PNG @2x (`<slug>.png` 1200×300) — el componente sirve el PNG y el SVG queda disponible para casos futuros (favicon, OG images, etc.).
