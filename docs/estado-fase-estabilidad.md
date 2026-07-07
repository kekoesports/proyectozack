# Estado fase estabilidad — SocialPro

Cerrado: 2026-05-08. Esta fase cubre quick wins, polish inicial y mobile UX básico.

---

## ✅ Completado y en producción

### OG / Social sharing
- OG dinámica talentos: `/api/og-image/talent-img?slug=` con foto real, nodejs runtime
- OG dinámica giveaways: `/api/og-image/giveaway?id=X` con título, valor, marca, creador
- OG estática `/giveaways`: OpenGraph + Twitter card correctos (hoy es `/codigos` — redirect 301)
- OG estática `/sorteos` y `/sorteos/[creatorSlug]`: OpenGraph + Twitter card con `/og-socialpro.png` (2026-07-07)
- Metadata propia home: título, description, OG, Twitter, canonical
- Schema JSON-LD sorteos: `Event.image` apunta a OG dinámica
- Redirect 301 en ruta antigua `/api/og-image/talent/[slug]`

### Mobile UX
- Brand chips redundantes eliminados en `/giveaways` mobile (−80px de filtros)
- Skeleton en LiveSection: elimina CLS en home
- Cards giveaway con expand hover (panel deslizante con descripción y creador)

### Admin / CRM
- Toggles live en perfil de talento: featuredLive, fallback, excluir
- Analytics clicks códigos: sección en `/admin/analytics`, ventana 7/30/90d
- isFeatured + badge en giveaways: toggle admin + badge visual público
- isFeatured toggle en códigos: ordenación featured primero
- `loading.tsx` en `/admin/analytics` y `/admin/brands/[id]`

### Calidad / Arquitectura
- Rutas huérfanas eliminadas: `/api/og/talent/[slug]` y `/api/og-image/test`
- `process.env.GEMINI_API_KEY` movido a `lib/env.ts`
- Skeleton LiveSection: elimina CLS en home (Core Web Vitals)
- Espaciado landing reducido: py-24 → py-12/py-16 en secciones
- AboutSection compacta: franja con pills + accordion SEO
- LiveSection fallback mejorado: mensaje más claro cuando nadie está en directo

---

## 🔄 Pendiente — sin migration

| Item | Descripción | Esfuerzo |
|------|-------------|----------|
| QW-3 metadata home | ✅ Hecho en esta sesión | — |
| HI-5 loading admin | ✅ Hecho en esta sesión | — |
| HI-3 cards expand | ✅ Hecho en esta sesión | — |

---

## ⏳ Pendiente — requiere migration

| Item | Descripción | Riesgo | Esfuerzo |
|------|-------------|--------|----------|
| CR-3 imageUrls giveaways | `imageUrls jsonb` para múltiples skins por sorteo | Bajo | 2h |
| HI-4 analytics giveaways | Tabla `giveaway_views` + panel admin | Bajo | 4-5h |
| CR-1 ownership staff | `assignedToUserId` en campaigns/deliverables | Medio | 2-3h |

**Flujo obligatorio para cualquier migration:**
```
editar schema → npx drizzle-kit generate → npm run migrate → commit SQL → deploy
```
El build de Vercel ejecuta `npm run migrate` automáticamente en cada deploy.

---

## ⚠️ Requiere deploy especial

Ninguno actualmente. Las migrations pendientes son `ALTER TABLE ADD COLUMN` con defaults — no rompen prod.

---

## 🔮 Quick wins futuros (sin migration, bajo riesgo)

| Item | Descripción | Tiempo |
|------|-------------|--------|
| OG home dinámica | Generar OG de home con stats en tiempo real (talentos activos, sorteos live) | 2h |
| Metadata `/ganadores` | OpenGraph propio con número de premios y valor total | 15 min |
| `loading.tsx` talents/[id] | Skeleton en perfil de talento admin | 20 min |
| Sticky CTA /giveaways | Barra fija bottom en mobile con counter de sorteos activos | 1h |

---

## 🚫 Decisiones de arquitectura vigentes

- **Higgsfield**: uso manual exclusivamente. Sin pipeline automático.
- **DALL-E**: integración futura documentada en `docs/ai-content-pipeline.md`
- **drizzle-kit push**: prohibido en producción. Siempre generate → migrate.
- **Edge runtime**: prohibido para rutas con DB queries. Usar nodejs runtime.
- **Redux**: prohibido. Estado: URL params > Context > React Query.

---

## 📋 Prioridad siguiente fase

1. Analytics giveaways (HI-4) — tracking de clicks/vistas en sorteos
2. Múltiples imágenes giveaways (CR-3) — más visual, marketplace feel
3. Mobile CTA sticky en /giveaways
4. Ownership staff en campañas (CR-1) — solo cuando haya usuarios staff reales
5. Pipeline DALL-E para OG images automáticas

---

## 🏗️ Stack actual

Next.js 16 · React 19 · TypeScript strict · Tailwind v4 · Drizzle ORM · Neon Postgres (neon-http) · Better Auth · Resend · shadcn/ui · Zod v4 · react-hook-form · @vercel/blob · motion/react

**Entornos:** `.env.local` para dev · Vercel env vars para prod/preview  
**Deploy:** `vercel --prod` con build que incluye `npm run migrate`  
**Repo:** kekoesports/proyectozack · rama master
