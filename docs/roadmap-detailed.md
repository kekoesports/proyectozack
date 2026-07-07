# Roadmap técnico detallado — SocialPro

Generado 07-05-2026. Basado en análisis de código, conversaciones de sesión y análisis de deuda técnica.

> **Nota 2026-07-07:** Los Quick Wins QW-1..QW-5 listados más abajo YA se cerraron el 2026-05-08 (fuente: `docs/estado-fase-estabilidad.md`). El único gap residual — OG explícita para `/sorteos` y `/sorteos/[creatorSlug]` — se cerró el 2026-07-07 en la PR de mini-QW. Consultar `docs/estado-fase-estabilidad.md` como fuente de verdad para el estado real de cada quick win.

---

## Estado actual — qué está hecho

### Funcionalidades completas (no tocar sin motivo)

| Módulo | Estado | Notas |
|--------|--------|-------|
| CRM completo (Fases 1-6) | ✅ Producción | Roles, campañas, tareas, finanzas, alertas, buscador |
| Panel live `/admin/live` | ✅ Producción | Toggles featuredLive, fallback, excluir |
| Streamers en directo (home) | ✅ Producción | Twitch + YouTube, polling, fallback grid |
| OG images dinámicas (talentos) | ✅ Producción | `/api/og-image/talent-img?slug=` con foto real |
| Giveaways hub `/giveaways` | ✅ Producción | Códigos, sorteos, WinnersList, filtros |
| Página ganadores `/ganadores` | ✅ Producción | Filtros, paginación, JSON-LD |
| Blog `/blog` | ✅ Producción | Posts, covers, SEO |
| Sprint GEO (Score 58→76) | ✅ Producción | REC-01 a REC-09, YouTube schemas |
| Toggles live en perfil talent | ✅ Hoy | featuredLive, fallback, excluir desde /admin/talents/[id] |
| Analytics clicks códigos | ✅ Hoy | Sección en /admin/analytics con ventana 7/30/90d |
| AboutSection condensada | ✅ Hoy | Bullets + accordion SEO + cards dark |

---

## Tier 1 — Quick wins (sin migration, sin riesgo)

### QW-1 · Skeleton en LiveSection ← SIGUIENTE
**Archivo:** `src/features/live/components/LiveSection.tsx`
**Cambio:** Reemplazar `if (loading) return null` por un skeleton de altura fija.
**Impacto:** Elimina CLS en home (penaliza Core Web Vitals y SEO).
**Código propuesto:**
```tsx
if (loading) return (
  <section className="bg-sp-black py-16 px-4 sm:px-6 border-t border-white/[0.06]">
    <div className="max-w-5xl mx-auto h-48 rounded-xl bg-white/[0.02] animate-pulse" />
  </section>
);
```
**Esfuerzo:** 10 min. **Riesgo:** Ninguno.

### QW-2 · OG image para `/giveaways`
**Archivo:** `src/app/giveaways/page.tsx`
**Cambio:** Añadir `openGraph.images` con imagen estática de giveaways.
**Esfuerzo:** 10 min. **Riesgo:** Ninguno.

### QW-3 · Metadata propia para home
**Archivo:** `src/app/page.tsx`
**Cambio:** Añadir `export const metadata: Metadata = { title: 'SocialPro | ...', openGraph: { ... } }`.
**Nota:** El layout ya tiene buenos defaults. Esto es un refinamiento.
**Esfuerzo:** 15 min. **Riesgo:** Ninguno.

### QW-4 · Limpiar rutas huérfanas
**Archivos:** `/api/og/talent/[slug]/route.ts`, `/api/og-image/test/route.tsx`
**Cambio:** Eliminar ambas rutas (sin referencias activas confirmado).
**Esfuerzo:** 5 min. **Riesgo:** Bajo — confirmar con grep antes de borrar.

### QW-5 · Fix `process.env` directo en pdfAi.ts
**Archivos:** `src/lib/parsers/pdfAi.ts`, `src/app/admin/(dashboard)/facturacion/import/import-actions.ts`
**Cambio:** Añadir `GEMINI_API_KEY` y `GEMINI_MODEL` a `lib/env.ts`.
**Esfuerzo:** 20 min. **Riesgo:** Bajo — solo cambio de cómo se accede al valor.

---

## Tier 2 — Mejoras críticas (con migration)

### CR-1 · Ownership en campañas para staff ← MÁS URGENTE DE ESTE TIER
**Por qué:** Un usuario con rol `staff` puede ver campañas de todos. Si en algún momento se da acceso a staff externos, esto es un problema de privacidad.
**Archivos afectados:**
- `src/db/schema/campaigns.ts` — añadir `assignedToUserId`, `createdByUserId`
- `src/db/schema/deliverables.ts` — idem
- `src/lib/queries/campaigns.ts` — aplicar `needsVisibilityFilter`
- `src/lib/queries/deliverables.ts` — idem
- Migration SQL generada

**Flujo:**
1. Editar schemas → `npx drizzle-kit generate` → `npm run migrate`
2. Actualizar queries con `or(eq(col, userId), eq(col2, userId))` cuando `needsVisibilityFilter`
3. Backfill: asignar campañas existentes al usuario que las creó (o dejar null = visible para todos)

**Esfuerzo:** 2-3h. **Riesgo:** Medio (migration en producción, backfill manual).

### CR-2 · Featured + badge en giveaways
**Por qué:** Permite destacar sorteos manualmente desde el admin. Actualmente solo `sortOrder`.
**Archivos afectados:**
- `src/db/schema/giveaways.ts` — añadir `isFeatured boolean default false`, `badge varchar(50)`
- `src/lib/queries/giveawaysHub.ts` — devolver featured primero
- `src/app/admin/(dashboard)/giveaways/page.tsx` — UI con toggle
- `src/features/giveaways/components/GiveawayHubCard.tsx` — mostrar badge
- Migration SQL

**Esfuerzo:** 3-4h. **Riesgo:** Bajo (columnas con default, no rompe nada).

### CR-3 · Múltiples imágenes en giveaways
**Por qué:** Actualmente solo `imageUrl` (una imagen). Para mostrar varios items/skins del premio.
**Opción recomendada:** Añadir `imageUrls jsonb` (string[]) en `giveaways`.
**Archivos afectados:**
- `src/db/schema/giveaways.ts`
- `src/lib/queries/giveawaysHub.ts`
- `src/features/giveaways/components/GiveawayHubCard.tsx` — galería simple
- Migration SQL

**Esfuerzo:** 2h. **Riesgo:** Bajo.

---

## Tier 3 — Mejoras high-impact (arquitectura / UX)

### HI-1 · Reducir home de 15 a ~9 secciones
**Por qué:** Home demasiado larga. Reduce conversión y claridad.
**Secciones a mover a `/nosotros`:**
- `CollabsSection` → `/nosotros` (logos de colaboraciones)
- `PortfolioSection` → ya existe `/casos`
- `TeamGrid` → `/nosotros`

**Secciones a mantener en home:**
Hero, Marquee, BrandsCarousel, TalentSection, LiveSection, MetricsSection, CasesSection (preview 3), AboutSection, CtaSection, FaqSection, ContactSection

**Importante:** Mover el JSON-LD de FAQ si se mueve el componente.
**Esfuerzo:** 3-4h. **Riesgo:** Medio (SEO — verificar que el contenido de las secciones movidas siga siendo crawlable).

### HI-2 · OG images dinámicas para giveaways
**Por qué:** Compartir en Discord/WhatsApp usa el OG genérico. Una imagen dinámica con el premio y creador tiene mucho más impacto.
**Ruta propuesta:** `/api/og-image/giveaway?id=X`
**Implementación:** Mismo patrón que `talent-img` — nodejs runtime, `ImageResponse`, DB query.
**Datos necesarios:** `title`, `imageUrl`, `value`, `brandName`, `talent.name`, `talent.gradientC1/C2`.
**Esfuerzo:** 2-3h. **Riesgo:** Bajo.

### HI-3 · Cards giveaway con expand hover/tap
**Por qué:** El hub de giveaways tiene muchos items pero poca información visible. Un expand suave (tipo marketplace gaming) mejora el engagement.
**Componentes afectados:**
- `src/features/giveaways/components/GiveawayHubCard.tsx`
- `src/features/giveaways/components/SorteoCard.tsx`
**Implementación:** `motion/react` con `layout` + `AnimatePresence`. Estado local `hovered`. En mobile: tap.
**Esfuerzo:** 3-4h. **Riesgo:** Bajo (solo CSS/motion). Vigilar CLS durante expand.

### HI-4 · Analytics de giveaways (vistas + clicks)
**Por qué:** `codeClicks` ya trackea códigos. Falta tracking de sorteos.
**Schema propuesto:**
```sql
giveaway_views (
  id serial,
  giveaway_id int → giveaways.id,
  talent_id int,
  action varchar(20), -- 'view' | 'click'
  created_at timestamptz
)
```
**Implementación:** Fire-and-forget en `GiveawayHubCard` al hacer click (similar a `CodeCard`).
**Panel:** Añadir sección en `/admin/analytics` similar a la de códigos que se hizo hoy.
**Esfuerzo:** 4-5h (migration + endpoint + UI). **Riesgo:** Bajo.

### HI-5 · Skeleton/loading states en admin
**Por qué:** Las páginas admin más lentas (campañas, facturación) no tienen loading state. Aparece pantalla en blanco durante la carga SSR.
**Archivos:** Crear `loading.tsx` en:
- `/admin/(dashboard)/campanas/[id]/` (ya existe en campañas)
- `/admin/(dashboard)/brands/[id]/`
- `/admin/(dashboard)/analytics/`
**Esfuerzo:** 30 min por loading.tsx. **Riesgo:** Ninguno.

---

## Tier 4 — Futuro / Requiere decisión

### F-1 · Sistema de contenido automático (Higgsfield / DALL-E)
**Decisión pendiente:** ¿Higgsfield (video) o DALL-E (imagen)? Son pipelines distintos.
- DALL-E 3 / Flux → OG images, banners, thumbnails de blog
- Higgsfield → clips promocionales de creadores en vídeo
**Pipeline recomendado:** Admin trigger → API → generate → Vercel Blob → update DB → revalidate.
**Blocker:** Necesitas API keys de Higgsfield/OpenAI configuradas en Vercel.

### F-2 · Mobile experience premium
**Mejoras concretas identificadas:**
- CTA sticky bottom en `/giveaways` y `/talentos/[slug]`
- Cards sorteos con tap-to-expand (en lugar de hover)
- Hero above-fold verificado en 375px (potencial scroll issue)
- `LiveSection` skeleton (ya en QW-1)
**Esfuerzo estimado:** 1 día completo de trabajo mobile-first.

### F-3 · kekoesports.es cross-reference completo
**Pendiente de Pablo (no técnico):** Añadir link/mención a `socialpro.es` en `kekoesports.es` para completar el entity cross-reference bidireccional CEO↔agencia (GEO sprint).

### F-4 · Prensa (REC-10 del sprint GEO)
**Pendiente:** Identificar y contactar a 5 medios gaming/esports para conseguir menciones externas con link. Acción de marketing, no técnica.

---

## Orden de implementación recomendado

```
INMEDIATO (próxima sesión):
├── QW-1: Skeleton LiveSection (10 min, CLS fix)
├── QW-4: Borrar rutas huérfanas (5 min)
├── QW-2: OG giveaways (10 min)
└── QW-3: Metadata home (15 min)

ESTA SEMANA:
├── QW-5: Fix process.env en pdfAi (20 min)
├── CR-1: Ownership staff en campañas (si hay usuarios staff reales)
└── HI-5: loading.tsx en admin pages pesadas (30 min c/u)

PRÓXIMAS 2 SEMANAS:
├── CR-2: Featured + badge giveaways
├── HI-1: Reducir home a 9 secciones
└── HI-2: OG dinámicas giveaways

BACKLOG:
├── CR-3: Múltiples imágenes giveaways
├── HI-3: Cards expand giveaways
├── HI-4: Analytics giveaways
└── F-1: Pipeline contenido automático
```

---

## Notas de arquitectura

### Patrón de rutas para perfiles de creador

La duplicación de rutas es intencional y tiene una razón de funnel:

```
socialpro.es/naow          → /app/[creatorSlug]  → vista giveaways del creador (landing pública)
socialpro.es/creadores/naow → /app/creadores/[slug] → vista con hero diferente
socialpro.es/c/naow         → 301 redirect → /talentos/naow
socialpro.es/talentos/naow  → perfil completo canónico
```

Todas tienen `alternates.canonical` apuntando a `/talentos/[slug]`. Esto es correcto para SEO. El crawl budget no es preocupante para el tamaño actual del sitio.

### Patrón Server Action desde features

Los imports de `@/app/admin/(dashboard)/...` en componentes de `src/features/admin/` son Server Actions. Este es el patrón correcto en Next.js App Router — las Server Actions viven cerca de la ruta que las usa, no en `lib/`. Es arquitecturalmente aceptable.

### Cache strategy

- Páginas públicas: `revalidate = 3600` (ISR horario) — consistente en todo el sitio ✅
- Admin: `force-dynamic` donde necesario ✅
- API live: `s-maxage=60, stale-while-revalidate=120` + `after()` para poll ✅
- OG images: sin cache-control explícito → Vercel aplica defaults
