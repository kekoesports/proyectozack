# Apuesta Segura CS2 — Operations & Continuity

Landing del CS2 Competitive Lab dentro del ecosistema SocialPro. Esta nota documenta los puntos de mantenimiento operativo. La estructura técnica vive bajo `src/app/apuesta-segura-cs2/`.

## URLs públicas

- Landing: https://socialpro.es/apuesta-segura-cs2
- Telegram (real, en `tokens.ts`): `https://t.me/+B65oaDw_4jhmNDFk`
- Blogabet: https://arkeroz.blogabet.com

## Refresh de datos Blogabet (manual)

Blogabet **no expone RSS ni JSON públicos** (probado: `/feed`, `/rss`, `/rss.xml` → todos devuelven HTML del homepage). El sync automático vía Playwright queda como decisión pendiente — coste/riesgo alto vs 30s manuales cuando hay cambios relevantes.

**Archivo único a editar:** `src/app/apuesta-segura-cs2/_components/tokens.ts`

Constantes que reflejan el perfil público de ArkeroZ:

- `HERO_STATS` — 4 KPIs del hero (Picks · Yield · Winrate · Profit)
- `KPIS` — 4 KPIs del bloque BlogabetValidation
- `PROFIT_CURVE_REAL` y `PROFIT_CURVE_LABELS` — puntos de la curva May'25 → May'26 que renderiza `BlogabetValidation.ProfitCurve`
- `WIN_LOSS` — donut won/lost (porcentajes literales del dashboard)
- `TOP_SPORTS` — donut E-Sports/Combos
- `MONTHLY_EUR_2026` y `YEAR_TOTAL_2026` — beneficios mensuales en EUR de la sección `MonthlyResults` (datos del Excel del equipo, no de Blogabet)

Después de editar: actualizar el comment `Última sincronización: YYYY-MM-DD` al inicio del archivo y commit con `chore(landing-cs2): refresh blogabet data`.

## Cambiar TELEGRAM_URL

**Archivo único:** `src/app/apuesta-segura-cs2/_components/tokens.ts`

```ts
export const TELEGRAM_URL = 'https://t.me/+B65oaDw_4jhmNDFk';
```

Todas las referencias internas (8 CTAs en la landing + 1 sticky mobile + 1 floating desktop) consumen este export. Cambiar aquí es el único lugar.

Nota: la card de cross-link en `/servicios/igaming/page.tsx` apunta a `/apuesta-segura-cs2`, no a Telegram directamente — no hay URL que actualizar ahí.

## ctaId — convenciones

Todos los CTAs van a través de `<TrackedCtaLink>` (cliente, vía `lib/analytics.ts → trackEvent`), que empuja a `window.dataLayer`:

```ts
{ event: 'cta_click', cta_id, cta_destination, ...attribution }
```

Naming: `<scope>_<surface>_<action>`. Cada slot tiene un id único (16 totales en este momento, ver `git grep 'ctaId='`):

- `apuesta_cs2_hero_telegram` / `apuesta_cs2_hero_stats`
- `apuesta_cs2_trust_blogabet`
- `apuesta_cs2_telegram_main`
- `apuesta_cs2_results_telegram` / `apuesta_cs2_results_blogabet`
- `apuesta_cs2_results_eur_telegram`
- `apuesta_cs2_finalcta_telegram` / `apuesta_cs2_finalcta_blogabet`
- `apuesta_cs2_floating_telegram` / `apuesta_cs2_sticky_telegram`
- Cross-links: `home_cs2_lab_full` · `talent_profile_cs2_lab` · `sorteos_cs2_lab` · `igaming_es_apuesta_segura_cs2`

`trackEvent` es **no-op si el usuario no aceptó cookies** (GTM no está cargado). Decisión sobre fallback server-side queda pendiente.

## Attribution `?creator=...` y UTMs

**Capa global**, vive en `src/lib/attribution.ts` y se enchufa a `trackEvent` automáticamente. No hace falta pasar nada manual desde los CTAs.

Params capturados:
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `creator`

Flujo:

1. Usuario llega con `?creator=zacketizor&utm_source=youtube` (o cualquier subset).
2. `<AttributionCapture/>` (montado en el layout de la landing) lee `URLSearchParams` y persiste en `sessionStorage` bajo la clave `sp-attribution`.
3. Cualquier `trackEvent('cta_click', ...)` desde ese momento añade los params al payload del dataLayer junto al `cta_id`.

Persistencia: dura toda la sesión del navegador. Si el usuario navega a otras páginas SocialPro y vuelve a la landing, la attribution se preserva. Sólo se pierde al cerrar la pestaña.

URLs de ejemplo para campañas de creator:

```
https://socialpro.es/apuesta-segura-cs2?creator=zacketizor&utm_source=youtube&utm_medium=video&utm_campaign=launch_oct
https://socialpro.es/apuesta-segura-cs2?creator=arkeroz&utm_source=twitter
```

Verificación local: abrir devtools → Application → Session Storage → `sp-attribution`.

## Fase 2 — pendientes para alinear

Lo siguiente requiere decisión de producto antes de tocar código:

- **Sync Blogabet automático.** Opciones: (a) seguir manual, (b) Playwright scraping con cron — coste técnico alto. Mientras siga manual, el comment `Última sincronización` en `tokens.ts` es la verdad operativa.
- **Tracking sin consent.** Hoy todo el funnel depende de aceptación de cookies (GTM-gated). Si se quiere fallback server-side (`/api/track-cta` con privacidad-friendly storage), diseñar antes de implementar.
- **Attribution → DB.** Ya existe sistema `creator_codes` + `code_clicks` en `src/db/schema/`. La capa actual va al dataLayer; fase 2 sería persistir clicks Telegram en DB resolviendo `creator` → `talent_id`. Requiere alinear naming y relación con el sistema existente para no fragmentar.
- **Discord / VIP / afiliados / Twitter.** No abrir hasta priorizar — usuario explícitamente pidió no sobrecargar landing actual.

## Assets visuales (`public/images/apuesta-segura-cs2/`)

| Archivo | Uso actual | Origen |
|---|---|---|
| `og-square.png` (1254×1254) | Fallback OpenGraph para plataformas 1:1 (Discord, WhatsApp). Composición: soldier + lockup + 4 pillars + CTA Telegram. | Creatividad premium 2026-05-10. |
| `og-1200x630.jpg` (1200×630) | OpenGraph + Twitter principal. Crop horizontal de og-square con sharp. 130 KB optimizado. | Generado 2026-05-11 desde og-square. |
| `badge.png` (1024×1024 aprox) | Avatar header del `TelegramMockup`, sello del `OfficialChannelStamp` y icono del `StickyCtaMobile`. Servido vía `next/image` (auto-optimize). | Creatividad premium 2026-05-10. |
| `og-portrait.png` (~9:16) | **Archivado**, no usado en producción. Reserva para futuro mobile hero portrait o stories sociales. | Creatividad premium 2026-05-10. |
| `badge-lab.png` | **Archivado**, no usado en producción. Variante "CS2 Competitive Lab" — sólo si en el futuro se separa concepto editorial vs brand principal. | Creatividad premium 2026-05-10. |

### Assets limpios pendientes de generar

Lo siguiente desbloquea mejoras visuales y reduce peso de página:

1. ~~`og-1200x630.png`~~ — **resuelto**: generado como `og-1200x630.jpg` desde `og-square.png` con sharp (crop centrado al ratio 1.91:1). Ya en uso en metadata.openGraph principal.
2. **`soldier-cutout.png` / `soldier-cutout.webp`** — render del soldier sin texto baked-in (sin "APUESTA SEGURA CS2", sin pillars, sin CTA), idealmente con fondo transparente. Necesario para el experimento P4 (filigrana hero) que se descartó por queda invisible al usar la imagen square al 12% opacity tras el mockup. Con asset limpio se puede reposicionar tras el texto del hero (no tras el mockup) y subir opacity sin caer en "tactical/militar".
3. **`badge-256.png` y `badge-128.png`** — versiones reducidas del badge circular (256×256 y 128×128) para `apple-touch-icon`, `favicon` específico de la ruta y `Apple Universal Link preview`. Hoy `badge.png` pesa 1.4MB y aunque `next/image` optimiza on-demand el primer render el asset original es pesado.
4. **Lockup tipográfico SVG** — "APUESTA SEGURA CS2" como SVG/PNG transparente sin fondo, para componer banners custom o cabeceras editoriales sin recortar de las creatividades existentes.

Hasta entonces, todo el uso premium se basa en `og-square.png` + `badge.png`.

## Cross-links al ecosistema

Componente compartido: `src/components/cs2-lab/Cs2LabCard.tsx` (variantes `full` | `compact`). Slots actuales:

- `src/app/page.tsx` — variante `full` después de `MetricsSection` (home).
- `src/app/talentos/[slug]/page.tsx` — variante `compact`, sólo si `talent.game` o algún `talent.tags[].tag` matchea `/cs[: ]?2|counter[- ]?strike/i`.
- `src/app/sorteos/page.tsx` — variante `compact` antes del `ResponsibleGamingFooter`.
- `src/app/servicios/igaming/page.tsx` — card propia (gradient SocialPro) antes del CTA final.
- `src/components/layout/Footer.tsx` — entrada `Apuesta Segura CS2` en columna Especialidades (ES y EN).

Wording obligatorio: **CS2 Competitive Lab · análisis competitivo · ArkeroZ**. Prohibido en cross-links: `apostar`, `betting`, `casino`, `gambling`. La landing en sí sí los usa (es su producto), pero los cross-links externos no.

## Chrome y conflictos

`/apuesta-segura-cs2` está en `HIDE_WHATSAPP_PREFIXES` dentro de `src/components/layout/PublicChrome.tsx`. El `WhatsAppWidget` (z-50, bottom-right) se omite para no chocar con el `FloatingTelegramCta` (z-30, mismo punto), que es el funnel principal de la landing. El resto del chrome (Nav + Footer + Lenis) sigue activo.
