# Brand assets — wishlist de reemplazo

Auditoría re-actualizada 2026-05-09. El sistema visual ahora renderiza logos con sus colores nativos sobre plates (claro/oscuro/none) — sin filtros monochrome. Hay assets que funcionan perfectos y assets con problemas concretos que documentamos abajo para reemplazar.

## Cómo funciona el sistema actual (resumen técnico)

- `<BrandLogo>` (`src/components/ui/BrandLogo.tsx`): plate altura-fija + padding adaptativo. El logo se sirve `unoptimized` (next/image) para preservar el aspect ratio nativo del archivo.
- `getBrandBg(name)` (`src/components/ui/brand-bg-map.ts`): decide plate `light` / `dark` por marca. Default: `light`. Override `dark` para artwork blanco/claro (KEYDROP, SKINSMONKEY, MELBET, KICK).
- SVG soportado nativamente. Sin filtros CSS sobre logos.

## Formato ideal estándar

- **Formato preferente:** SVG vectorial con `viewBox` ajustado al **bounding box** del logo (sin whitespace alrededor). Alternativa: PNG con canal alpha y crop tight.
- **Aspect ratio horizontal:** 3:1 a 6:1 ideal (logos tipo wordmark). Square (1:1) acepta solo si el logo en sí es cuadrado (ej: SkinClub icon-only).
- **Resolución mínima PNG:** 1200×300 (4:1) o 1024×1024 (1:1). Cubrir retina @3x.
- **Fondo:** **transparente**. Sin rectángulos sólidos, sin marcas de agua, sin padding incrustado.
- **Origen:** brand kit oficial / press kit de la marca. **NO** capturas, **NO** favicons (16-32px).

## Assets actuales — estado individual

Auditoría visual contra QA en `/casos`, `/sorteos`, home carousel + mobile.

### ✅ OK — no requieren reemplazo

| Marca         | Archivo                | Estado                                                         |
|---------------|------------------------|----------------------------------------------------------------|
| Razer         | `razer.png` (600×140)  | Verde sobre plate blanco — premium                             |
| 1Win          | `1win.png` (256×137)   | Logo circular, plate blanco — limpio                           |
| Hellcase      | `hellcase.png`         | Naranja sobre plate blanco                                     |
| Pin-Up        | `pinup.png`            | Rojo sobre plate blanco                                        |
| GGDrop        | `ggdrop.png`           | Naranja icon + wordmark                                        |
| SkinClub      | `skinclub.png`         | Icon morado-cyan sobre plate blanco                            |
| Skin.place    | `skinplace.png`        | Renderiza correctamente                                        |
| Clash.gg      | `clashgg.webp`         | Logo limpio sobre plate blanco                                 |
| 1xbet         | `1xbet.png`            | Plate blanco — color azul institucional                        |
| Empiredrop    | `empiredrop.svg`       | SVG vectorial                                                  |
| Evoplay       | `evoplay.png`          | OK                                                             |
| EnMa          | `enma.png`             | OK                                                             |
| PcComponentes | `pccomponentes.png`    | Naranja institucional sobre plate blanco                       |
| Kick          | `kick.png`             | Verde lima sobre plate **dark** — vibrante                     |

### ⚠️ Problemas concretos — REEMPLAZAR

| Marca       | Archivo            | Problema                                                                                                     | Recomendado                                                              | Prioridad |
|-------------|--------------------|--------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|-----------|
| **Melbet**  | `melbet.png` 1200×900 | **Asset corrupto/recortado**: solo contiene "ELBE" — la "M" inicial y la "T" final están **cortadas** del archivo. No es un problema de render, es el archivo en sí. | PNG transparente con logo MELBET completo (1200×300, fondo transparente) | **CRÍTICA** |
| **KeyDrop** | `keydrop.png` 3840×2160 | El asset tiene **fondo negro sólido incrustado** en vez de transparente. En el plate `dark` se nota un rectángulo negro más oscuro dentro del plate frosted. Rompe el premium. | PNG transparente o SVG con bg transparente (mismo logo, sin rectángulo)  | **ALTA**    |
| **Jugabet** | `jugabet.svg` (450×82 viewBox tras fix) | Asset SVG entregado con canvas 500×500 pero logo en strip horizontal — fix manual de viewBox aplicado en commit. Si se reemplaza, asegurar viewBox correcto al bounding box. | SVG con viewBox tight, o PNG ≥1200×300 horizontal                        | media     |
| **SkinsMonkey** | `skinsmonkey.png` | Texto "skinsmonkey" en blanco se ve pero plate dark frosted lo deja sutil. Render aceptable pero no destaca como Razer/PinUp. | Variante con outline o version más bold; o aceptar como está              | baja      |

### 🚫 Sin asset — NULL en DB

Los siguientes brands existían en seed pero NO tienen asset y **se han NULL-eado** en `brands.logoUrl` (carousel renderiza fallback de texto):

| Marca     | Estado                                                       |
|-----------|--------------------------------------------------------------|
| GrandWin  | NULL en DB. Si se quiere logo, subir `grandwin.png/.svg`     |
| ZeroTwo   | NULL en DB. Si se quiere logo, subir `zerotwo.png/.svg`      |

Si se suben los assets, re-ejecutar:

```bash
npx tsx scripts/seeds/backfill-giveaway-brand-logos.ts
# Y para revertir el NULL en brands:
# UPDATE brands SET logo_url='/images/brands/grandwin.png' WHERE slug='grandwin';
```

## Logos de creator codes (URLs externas, frágiles)

Tabla `creator_codes` — siguen apuntando a URLs externas. Migrar al registry local cuando haya asset bueno:

| Marca       | Origen actual                         | Acción                                               | Prioridad |
|-------------|---------------------------------------|------------------------------------------------------|-----------|
| Hellcase    | `gstatic faviconV2` (~32px)           | Reusar `/public/images/brands/hellcase.png` mejorado | media     |
| SkinsMonkey | `gstatic faviconV2` (~32px)           | Reusar `/public/images/brands/skinsmonkey.png`       | media     |
| Keydrop     | `imgur.com/<id>`                      | Reusar `/public/images/brands/keydrop.png` (cuando se reemplace por transparente) | media     |
| Skinplace   | `imgur.com/<id>`                      | Reusar `/public/images/brands/skinplace.png`         | media     |

## Cómo entregar assets nuevos

1. Asset por marca en `/public/images/brands/<slug>.{svg,png,webp}` (lowercase, sin espacios). **Una sola variante por marca.** El sistema decide plate light/dark vía `brand-bg-map.ts`.
2. Si el logo es blanco/claro y necesita plate oscuro: añadir entrada en `BRAND_BG_OVERRIDES` (`brand-bg-map.ts`).
3. Si cambia el filename/extensión: actualizar `BRAND_LOGO_MAP` en `scripts/seeds/backfill-giveaway-brand-logos.ts` y `BRAND_REGISTRY` si aplica.
4. Validar local con `npm run dev` → home, `/casos`, `/sorteos`, mobile.
5. Si se sube logo para GRANDWIN/ZEROTWO: revertir el NULL con UPDATE manual o re-ejecutar seeder.

## Vercel/Linux — case sensitivity

Filenames **siempre en lowercase**. El filesystem de Windows en dev no distingue mayúsculas, pero Linux (Vercel) sí — un asset llamado `ClashGG.webp` rompe en producción.
