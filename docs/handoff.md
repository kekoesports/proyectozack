---
summary: "Session handoff template. Dump state so the next session can resume fast."
read_when:
  - Ending a work session
  - Switching context
  - Handing off to another agent
---

# Handoff — 2026-05-10 (Apuesta Segura CS2 — Sprint 1)

## 1. Scope / Status

**Task:** Construir landing `/apuesta-segura-cs2` como división editorial del ecosistema SocialPro y conectarla con el resto del sitio. **COMPLETE** — production live · 0 errores TS · build estático limpio.

Hitos cubiertos hoy:
- Landing dark + identidad SocialPro (gradient orange/pink/purple, no verde casino)
- Hero split (texto + KPIs / mockup Telegram + card flotante Blogabet)
- Trust block editorial (perfil ArkeroZ + chips cobertura competiciones)
- Metodología 4 pasos con números gigantes en gradient
- TelegramSection con mockup auténtico (3 picks reales: equipos, mapas, cuotas, scores)
- BlogabetValidation con datos REALES (109 picks · +27% yield · 67% winrate · +223u · curva May'25→May'26)
- MonthlyResults con beneficios netos EUR 2026 del Excel (Ene–Abr 14.534€)
- FAQ compacto en 2 columnas
- FinalCta sin reflejo casino
- Capa de attribution global `?creator=...&utm_*` con sessionStorage + auto-enriquecimiento de `trackEvent`
- Funnel Telegram: hero × 2 · trust · telegram-section · results × 2 · monthly · final-cta · floating desktop · sticky mobile (16 ctaIds únicos)
- Cross-links al ecosistema: home · perfiles CS2 (condicional) · /sorteos · /servicios/igaming · Footer ES+EN
- Wording purificado: "CS2 Competitive Lab · análisis competitivo" en cross-links externos (sin betting/casino)
- Mobile: KPIs adaptativos, motion-safe, sticky correcto, WhatsApp widget oculto en la landing para evitar clash
- SEO: title sin duplicación, canonical, OG, Twitter, JSON-LD (Person ArkeroZ + WebPage + FAQPage), sitemap

**Blockers:** None

## 2. Working Tree

- Branch: `master`, up to date with `origin/master`
- Clean — no uncommitted changes
- 7 commits pushed hoy:
  ```
  29d0cb9 chore(landing-cs2): fix title duplicado + docs operativas
  c1e7057 polish(landing-cs2): mobile, motion-safe, fix whatsapp/floating-cta clash
  d8a0088 feat(cs2-lab): cross-links elegantes desde home/talentos/sorteos
  70d874a feat(landing-cs2): utm/creator attribution + sticky/floating telegram
  f2f627f fix(landing-cs2): faq compacto, final-cta sin reflejo, telegram url real
  b00b06b feat(landing): apuesta-segura-cs2 ecosistema SocialPro
  ```

## 3. Production

- Live: https://socialpro.es/apuesta-segura-cs2
- Cs2LabCard live en home, /sorteos, /servicios/igaming, perfiles talentos CS2
- Footer ES+EN con entrada en Especialidades / Specialties
- Status edge cache propagado: ✅

## 4. Dev / Build

- Dev server local en http://localhost:3000 (proceso del usuario, no mío)
- `npx next build` con env cargado: ✓ 142 páginas estáticas, `/apuesta-segura-cs2` prerenderizada como Static
- `npx tsc --noEmit`: 0 errores
- `npm run lint`: 0 errores nuevos (73 warnings preexistentes del codebase)

## 5. Decisiones diferidas (necesitan input del usuario antes de tocar código)

| # | Tema | Estado actual | Decisión pendiente |
|---|---|---|---|
| 1 | Sync Blogabet automático | Manual en `tokens.ts` con last-sync date | (a) seguir manual, (b) Playwright cron — coste/riesgo alto |
| 2 | Tracking sin consent | GTM-gated · `trackEvent` no-op si no aceptan cookies | Si se quiere fallback server-side `/api/track-cta` privacy-friendly |
| 3 | Attribution → DB fase 2 | sessionStorage + dataLayer (cliente) | Persistir clicks Telegram a `creator_codes` + `code_clicks` resolviendo `creator` → `talent_id` |
| 4 | Discord / VIP / afiliados / Twitter | No tocados | Priorizar antes de abrir |

## 6. Foco para mañana

El usuario señaló estos focos para la próxima sesión, en orden:

### A) SEO real de la landing (foco principal)

Lo que YA está hecho hoy:
- Metadata: title.absolute, description, canonical
- OpenGraph + Twitter card
- JSON-LD: WebPage + Person (ArkeroZ) + FAQPage
- Sitemap incluye la ruta
- Build estático (TTFB óptimo)
- Una sola H1, jerarquía de H2/H3 ordenada

Lo que toca trabajar mañana:
- **Keywords**: investigar volumen real para `apuestas CS2`, `picks CS2`, `tipster CS2`, `pronósticos CS2`, `análisis CS2 ESEA`, `comunidad apuestas CS2`. Decidir keyword principal vs long-tail.
- **Metadata avanzada**: rotar entre clusters (apuestas vs análisis vs comunidad) según keyword target. Considerar variantes regionales (ES vs LATAM).
- **Contenido indexable**: la landing actual tiene mucho copy estático pero pocos hooks de keyword density. Sumar bloque de FAQ extendido SEO-oriented (más allá de las 7 preguntas actuales) o sección "Glosario CS2" / "Términos competitivos".
- **Estructura semántica**: revisar `<article>`, `<section>`, `<aside>` por bloque. Hoy hay mezcla.
- **Interlinking interno**: la landing apunta a `/influencers-cs2` desde Cs2LabCard. ¿Recíproco desde la landing hacia `/influencers-cs2`, `/blog`, talentos CS2 específicos? Los cross-links inversos suben autoridad.
- **Performance SEO**: ya estática. CWV concretos a medir mañana con CrUX o PageSpeed Insights API. Imágenes en Cs2LabCard usan logo `/images/logos/2.png` (16KB optimizado).
- **OpenGraph imagen específica**: ahora usa `/og-socialpro.png` genérico. Generar `opengraph-image.tsx` propio para esta ruta sería ganancia.
- **Contenido dinámico**: ¿añadir un componente que muestre las últimas 3 picks publicadas (datos manuales en `tokens.ts`) para tener "freshness signal"?
- **Captación orgánica gaming/esports**: estrategia de blog posts ancla — "Análisis ESEA Advanced semana X", "Roster moves tier 2 europeo", etc. — que linkeen a la landing como hub.

Skills útiles ya instalados que pueden ayudar:
- `claude-seo:seo-audit`, `claude-seo:seo-page` — full audit / single page
- `claude-seo:seo-cluster` — semantic clustering para keyword strategy
- `claude-seo:seo-content` — E-E-A-T y AI citation readiness
- `claude-seo:seo-geo` — visibilidad en AI Overviews / ChatGPT / Perplexity

### B) Funnels y conversión

- Datos disponibles: 16 ctaIds únicos en GTM dataLayer. Hoy van a `cta_click` events.
- Mañana: configurar GTM tags → GA4 conversion events. Mapear qué slot convierte mejor.
- Heatmap / scroll depth para detectar dónde abandonan.
- A/B testing copy del hero (decisión).

### C) Estrategia de adquisición

- Channels: orgánico (SEO), referral (creators con `?creator=X` UTMs), social (X / TikTok / YouTube SocialPro).
- Discord / VIP / afiliados quedan aplazados explícitamente — decidir si entran en este sprint o el siguiente.

### D) UX final

- Revisión del flujo completo en mobile (375px) y tablet (768px) con cookies aceptadas y rechazadas.
- Microinteracciones: animaciones suaves ya están (motion-safe), transitions OK, hover states correctos.
- Falta: probar el flujo Telegram → click → app abriendo el canal real, verificar deep-link en iOS/Android.

### E) Decisiones Blogabet/tracking fase 2

Ver tabla `5. Decisiones diferidas`.

## 7. Refs documentación

- **Operations doc**: `docs/apuesta-segura-cs2.md` — refresh manual Blogabet, TELEGRAM_URL, naming ctaId, uso `?creator=`, slots cross-link, fase 2.
- **CLAUDE.md**: contexto general del proyecto.
- **`.claude/rules/typescript.md`**: hard rules respetadas.

## 8. Pre-flight para retomar mañana

```bash
# 1. Pickup contexto
cat docs/handoff.md
cat docs/apuesta-segura-cs2.md

# 2. Sanity check
git status
git log --oneline -8
npx tsc --noEmit
npm run dev   # http://localhost:3000/apuesta-segura-cs2

# 3. SEO audit baseline (claude-seo skill)
# Invocar /seo-page con URL https://socialpro.es/apuesta-segura-cs2
# o /seo-audit para análisis completo del sitio
```
