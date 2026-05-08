# Sistema visual de covers — Blog SocialPro

Guía única para mantener un look editorial gaming premium consistente en blog, OG y social sharing.

---

## Arquitectura

3 niveles de imagen, en orden de preferencia:

```
1. coverUrl real         (foto editorial, captura de campaña, AI cover aprobado)
2. CategoryThumbnail     (fallback editorial — gradiente + patrón SVG por categoría)
3. og-socialpro.png      (último recurso solo para hub pages, NO para posts)
```

`BlogCover` (`src/features/blog/components/BlogCover.tsx`) decide cuál usar y aplica el overlay correcto según `variant`.

### Componentes

| Archivo | Rol |
|---|---|
| `BlogCover.tsx` | Wrapper que decide imagen vs fallback + overlay cinematográfico |
| `CategoryThumbnail.tsx` | Fallback editorial: gradiente multicapa + patrón SVG + tipografía fantasma |
| `BlogCard.tsx` | Card del listado (`aspect-[3/2]`, variant `card`) |
| `FeaturedBlogCard.tsx` | Card destacada split horizontal (variant `featured`) |
| `app/blog/[slug]/page.tsx` | Hero del post individual (variant `hero`) |

---

## Variants

```ts
variant: 'card' | 'featured' | 'hero'
```

| Variant | Aspect | Overlay | Uso |
|---|---|---|---|
| `card` | 3:2 | bottom→top denso | Grid del listado |
| `featured` | flexible | left→right | Card destacada, side-by-side |
| `hero` | full width | bottom→top suave | Cabecera del post |

---

## Tamaños recomendados

### coverUrl real (subir a `/public/images/blog/covers/[slug].jpg` o Vercel Blob)

| Uso | Resolución mínima | Aspect ratio | Notas |
|---|---|---|---|
| Card grid | 1200×800 | 3:2 | También sirve para 4:3 si hace falta |
| Featured | 1600×900 | 16:9 | Necesita más anchura para el split |
| Hero post | 1920×1080 | 16:9 | Full bleed top |
| OG dynamic (auto) | 1200×630 | 1.91:1 | La ruta `/api/og-image/blog` lo genera |

**Formato:** JPG calidad 85% o WebP. PNG solo si tiene transparencia real.
**Peso:** <250 KB ideal, <400 KB máximo.

---

## Paletas premium por categoría

Definidas en `CategoryThumbnail.tsx` (`CATEGORY_STYLES`). NO improvisar — usar los hex registrados.

| Categoría | Accent | Patrón SVG | Tono |
|---|---|---|---|
| `caso-exito` | `#f5632a` naranja | `lines` (diagonal stripes) | Energía / resultado |
| `igaming` | `#a855f7` púrpura | `hex` (hexágonos) | Premium / precisión |
| `guia` | `#60a5fa` azul | `grid` (cuadrícula técnica) | Educativo / claro |
| `tendencias` | `#34d399` verde | `wave` (curvas) | Movimiento / futuro |
| `youtube` | `#f87171` rojo | `play` (icono opaco) | Directo / contenido |
| `esports` | `#60a5fa` azul frío | `dots` (puntos) | Competitivo / técnico |
| `noticias` | `#e03070` rosa | `minimal` (sin patrón) | Urgente / actualidad |

Cada paleta tiene: gradiente multicapa de fondo, glow radial, accent, accentSoft, color del patrón SVG.

---

## Reglas de branding

**Sí:**
- Gradiente firma: `linear-gradient(135deg, #f5632a 0%, #e03070 35%, #c42880 62%, #8b3aad 100%)`. Usar con restraint.
- Barlow Condensed para títulos (uppercase, tight tracking).
- Inter para body, métricas, meta.
- Categorías como pills con dot pulse → consistencia entre card y artículo.
- Overlays cinematográficos (oscuro→transparente). Nunca sólido sin difuminar.

**No:**
- Neon-on-black gamer aesthetic. Anti-brand.
- Más de 1 gradiente firma por composición.
- Tipografías sans no-Barlow para títulos.
- Iconos genéricos (emojis solo en estados vacíos o stats secundarias).
- Stickers / efectos "Twitch chat" / glow saturado.

---

## Cómo añadir un cover real

1. **Subir la imagen** a:
   - Local: `public/images/blog/covers/[post-slug].jpg`
   - Producción (recomendado): Vercel Blob via dashboard o `@vercel/blob` SDK
2. **Actualizar la BD:**
   ```sql
   UPDATE posts SET cover_url = '/images/blog/covers/socialpro-razer.jpg' WHERE slug = 'socialpro-razer-activacion-creadores-gaming';
   -- o con URL Blob:
   UPDATE posts SET cover_url = 'https://blob.vercel-storage.com/socialpro-razer-xyz.jpg' WHERE slug = '...';
   ```
3. **Verificar:**
   - `/blog` → la card debe mostrar la imagen real
   - `/blog/[slug]` → hero con la imagen
   - `/api/og-image/blog?slug=[slug]` → la imagen aparece como fondo desvanecido al 14%

No hace falta tocar código.

---

## Prompts útiles para covers IA (DALL-E 3 / Flux Pro)

Mantener estética editorial gaming premium — cinematográfico, oscuro, con buen contraste para CTR social.

### Plantilla base

```
[Subject], cinematic editorial photography, dark moody lighting, gaming culture, premium magazine aesthetic, dramatic side-light, 16:9 composition with negative space on the right for text overlay, ultra-detailed, photorealistic, no text in image, no logos, color palette: [accent color] highlights on dark background
```

### Casos de éxito

- **Razer:** `Studio gaming setup with Razer-style green RGB peripherals, blurred streamer silhouette, premium product photography, dark editorial mood, orange light accents, 16:9, negative space right side`
- **1WIN:** `Esports tournament arena from the back rows, blue stage lights cutting through atmospheric haze, players silhouettes, cinematic wide shot, orange and red accent lighting, editorial sport photography`
- **SkinsMonkey:** `Macro close-up of CS2-inspired metallic textured surfaces, premium product still-life, neutral grey backdrop with single warm spotlight, editorial commerce photography, no text`

### iGaming

```
Premium online casino interface elements (no real branding), purple and gold lighting, deep neon glow on dark background, editorial finance/tech aesthetic, abstract composition, 16:9
```

### Guías

```
Minimalist studio shot of gaming hardware (controller, headphones, keys) on matte dark surface, blue rim light, technical editorial photography, isometric-ish angle, clean composition
```

### Tendencias

```
Abstract motion blur of gaming streamers' screens overlaid, green light leaks, futurist editorial composition, sense of speed and direction, cinematic, 16:9
```

### Esports

```
Wide stadium shot during a live esports match, blue and white stage lighting, players in focus mid-action, editorial sports photography aesthetic, dark background with dramatic side light
```

---

## Workflow recomendado para covers prioritarios

3 posts urgentes por valor de marca:

1. **`socialpro-razer-activacion-creadores-gaming`** → caso de éxito Razer
2. **`socialpro-1win-cs2-tournament`** → caso de éxito 1WIN (8M+ reach)
3. **`socialpro-skinsmonkey-200k`** → caso de éxito SkinsMonkey (200K€)

Para cada uno:
1. Generar 3 variantes con DALL-E usando los prompts arriba
2. Elegir la mejor — priorizar contraste lado izquierdo (donde va el texto en featured + OG)
3. Editar en Photoshop/Figma:
   - Crop a 1600×900 (16:9)
   - Aplicar curva de contraste si necesario
   - NO añadir logos ni texto — el overlay del componente lo hace
4. Exportar JPG calidad 85%, ~200 KB
5. Subir a Vercel Blob → actualizar `cover_url`

---

## Notas técnicas

- `BlogCover` ya usa `next/image` con `fill` y `sizes` correctos por variant — no hace falta tocar nada al añadir un cover real.
- El overlay cinematográfico oscuro asegura que el título sea legible sobre cualquier imagen.
- Las paletas de `CategoryThumbnail` están alineadas con los colores hex de la ruta OG dinámica (`/api/og-image/blog`) → consistencia entre fallback HTML y fallback OG.
- NO modificar las firmas SVG ni los gradientes sin actualizar también la ruta OG, para mantener consistencia visual cross-channel.
