# AI Content Pipeline — Arquitectura futura

Decisión tomada: 2026-05-08. No hay automatización todavía.

---

## Contexto y decisión

**Higgsfield** → uso MANUAL por ahora. Hero vídeos, reels, TikToks, cinematic promos.
No habrá pipeline automático hasta que estén estables: analytics, mobile UX, featured systems, performance, SEO y dashboards.

**DALL-E / OpenAI Images API** → integración futura para assets estáticos:
OG images dinámicas, banners, placeholders, backgrounds de creadores, promos de sorteos.

---

## Dónde guardar assets

### Producción — Vercel Blob (ya instalado)

`@vercel/blob` ya está en el stack con `BLOB_READ_WRITE_TOKEN`. Es el destino correcto.
Sirve con CDN automático + `stale-while-revalidate`. No necesitas Cloudflare adicional.

```
Prefijos de ruta en Blob:
  /og/{slug}-{hash8}.png          → OG images dinámicas por talento/sorteo
  /banners/{talentId}-{yyyymmdd}.jpg   → banners de creador
  /promo/{giveawayId}-{yyyymmdd}.png   → promos de sorteo
  /bg/{talentId}-{variant}.jpg         → backgrounds creator (para OG, embeds)
  /campaigns/{campaignId}/{asset}.{ext} → assets de campaña
  /higgsfield/{type}/{talentId}-{date}.mp4 → vídeos manuales subidos
```

### Desarrollo — carpeta local o Blob staging

En dev, apuntar al mismo Blob con un prefijo `/dev/` para evitar colisiones con prod.

---

## Naming convention

```
{tipo}-{id-o-slug}-{variant}-{timestamp-o-hash}.{ext}

Ejemplos:
  og-talent-naow-default-abc12345.png
  og-giveaway-1042-hot-xyz98765.png
  banner-talent-todocs2-v2-20260508.jpg
  promo-giveaway-1042-featured-20260508.png
  bg-talent-naow-dark-abc12345.jpg
  video-spotlight-naow-20260508.mp4
```

**Reglas:**
- Siempre minúsculas, separado por guiones
- Nunca espacios ni caracteres especiales
- El timestamp/hash al final permite versionar sin borrar el anterior
- La extensión es la real del contenido (`webp` > `jpg` > `png` para imágenes)

---

## Cache strategy

### Imágenes estáticas generadas (OG, banners)

```
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```
— 1 día fresco, 1 semana stale. Se invalida manualmente vía Vercel Blob o revalidatePath.

### Imágenes dinámicas (como las OG actuales de /api/og-image/*)

Las rutas de ImageResponse actuales no tienen Cache-Control explícito → Vercel aplica defaults.
Cuando se conecte DALL-E, el flujo correcto es:

```
1. Request → check DB (¿existe asset generado y es reciente?)
2. Si sí → redirect 301 a Blob URL (CDN directo, no pasa por función)
3. Si no → generar con DALL-E → guardar en Blob → actualizar DB → redirect
```

Esto evita regenerar en cada request y mantiene el coste bajo.

### Vídeos Higgsfield (manual)

Subida manual desde el admin → Blob → URL guardada en DB.
No hay caché especial — es un asset estático estable.

---

## Tablas DB futuras (cuando se automatice)

### Tabla `generated_assets` (cuando llegue el momento)

```sql
CREATE TABLE generated_assets (
  id          serial PRIMARY KEY,
  entity_type varchar(30) NOT NULL,  -- 'talent' | 'giveaway' | 'campaign' | 'brand'
  entity_id   integer NOT NULL,
  asset_type  varchar(30) NOT NULL,  -- 'og_image' | 'banner' | 'promo' | 'bg' | 'video'
  variant     varchar(50),           -- 'default' | 'hot' | 'dark' | 'featured'
  provider    varchar(30) NOT NULL,  -- 'dalle3' | 'flux' | 'higgsfield' | 'manual'
  blob_url    text NOT NULL,
  prompt      text,                  -- el prompt usado (auditoría + reproducibilidad)
  cost_cents  integer,               -- coste en céntimos USD (control de gasto)
  approved    boolean NOT NULL DEFAULT false, -- revisión humana antes de publicar
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text REFERENCES "user"(id)
);

-- Índice para lookup rápido entity → asset
CREATE INDEX gen_assets_entity_idx ON generated_assets(entity_type, entity_id, asset_type, variant);
```

**Por qué `approved`:** nunca publicar automáticamente sin revisión humana. El flujo es:
Admin genera → asset queda en `approved = false` → admin revisa en panel → aprueba → se publica.

**Por qué `prompt`:** permite reproducir, auditar y mejorar los assets sin perder contexto.

**Por qué `cost_cents`:** control de gasto real. La API de OpenAI cobra por imagen — sin tracking te sorprendes a fin de mes.

---

## Cómo evitar vendor lock-in

### Abstracción de proveedor

Nunca llamar directamente a la API de OpenAI desde las rutas. Siempre a través de un servicio interno:

```
src/lib/services/imageGen.ts
  → generateImage(prompt, options): Promise<{ url: string, costCents: number }>
    → internamente: proveedor configurable via env var IMAGE_GEN_PROVIDER='dalle3'|'flux'|'ideogram'
```

Cambiando `IMAGE_GEN_PROVIDER` en Vercel env vars cambias de proveedor sin tocar código.

### Storage agnóstico

`@vercel/blob` es el almacenamiento. Si algún día migras a Cloudflare R2 o S3, solo cambias la implementación de `src/lib/services/storage.ts` — la interfaz es la misma:

```ts
interface StorageService {
  upload(path: string, data: Buffer, contentType: string): Promise<string>; // returns URL
  delete(url: string): Promise<void>;
}
```

### No hardcodear URLs de Blob

Guardar siempre el path relativo en DB y resolver la URL base desde env var `BLOB_BASE_URL`. Si migras de Blob a R2, solo actualizas la env var.

---

## Integración DALL-E cuando llegue el momento

### Pasos en orden

1. Añadir `OPENAI_API_KEY` a `lib/env.ts` (optional)
2. Crear `src/lib/services/imageGen.ts` con la abstracción
3. Crear tabla `generated_assets` con migration
4. Crear ruta admin `/admin/assets` con:
   - Generador manual (formulario: tipo, entidad, prompt override)
   - Cola de revisión (assets pendientes de aprobación)
   - Historial de coste
5. Conectar al panel de talento `/admin/talents/[id]` con botón "Generar OG" que:
   - Llama a imageGen con prompt auto-construido del talento
   - Guarda en Blob + DB con `approved = false`
   - Muestra preview en el panel para aprobación

### Prompt base para OG de talento (referencia futura)

```
Gaming streamer promotional image for {name}, {game} content creator.
Dark gaming aesthetic. Brand colors: {c1} to {c2} gradient.
Ultra premium, cinematic, sharp. Spanish gaming market.
No text. 1200x630px landscape.
```

---

## Prioridad real — qué hacer ANTES de content pipeline

En este orden, según la decisión de hoy:

1. **Estabilidad** — tests, error boundaries, loading states admin
2. **Mobile UX** — CTA sticky, tap-to-expand, hero 375px
3. **Homepage live streams** — mejoras al sistema existente
4. **Featured systems** — isFeatured en codes (ya hecho en giveaways)
5. **Analytics** — vistas/clicks sorteos, panel más completo
6. **Performance** — bundle size, LCP, CLS residual
7. **SEO/social sharing** — schemas, canonicals, OG restantes

El content pipeline automático viene cuando los 7 puntos anteriores estén sólidos.
