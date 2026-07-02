# Deuda técnica — SocialPro

Generado automáticamente la noche del 07-05-2026. Revisar con el equipo antes de actuar.

---

## CRÍTICO — Seguridad / Corrección

### TD-01 · `process.env` directo fuera de `lib/env.ts`
**Archivos:** `src/lib/parsers/pdfAi.ts:294`, `src/app/admin/(dashboard)/facturacion/import/import-actions.ts:161`
**Problema:** La regla 6 de TypeScript prohibe acceso directo a `process.env` fuera de `lib/env.ts`. `GEMINI_API_KEY` se usa sin validación Zod → puede pasar `undefined` sin error en tiempo de compilación.
**Acción:** Añadir `GEMINI_API_KEY` y `GEMINI_MODEL` a `lib/env.ts` y referenciarlos desde ahí.
**Riesgo:** Bajo (no es una ruta pública), pero viola el contrato arquitectónico.
**Esfuerzo:** 30 min.

### TD-02 · Ownership faltante en `campaigns` y `deliverables`
**Archivos:** `src/db/schema/campaigns.ts`, `src/db/schema/deliverables.ts`
**Problema:** El filtro de visibilidad para `staff` (`needsVisibilityFilter`) existe en `permissions.ts` y se aplica en `crmBrands.ts`, pero `campaigns` y `deliverables` NO tienen columnas `assignedToUserId`/`createdByUserId`. Un `staff` con filtro activo ve todas las campañas de todos los talentos.
**Acción:** Migration con dos columnas nullable + extender las queries. Ver roadmap-detailed.md.
**Riesgo:** ALTO para privacidad interna. No es visible externamente.
**Esfuerzo:** 2-3h (migration + queries + tests).

---

## ALTO — Dead code / Rutas huérfanas

### TD-03 · `/api/og/talent/[slug]/route.ts` — ruta obsoleta
**Archivo:** `src/app/api/og/talent/[slug]/route.ts`
**Problema:** Esta ruta devuelve JSON (no imagen). Fue la fuente de datos para el OG antiguo. No tiene referencias activas en ningún componente. Consume DB en cada request (force-dynamic).
**Verificar antes de borrar:** `grep -r "api/og/talent" src/` (ya se hizo — 0 resultados fuera de la propia ruta).
**Acción:** Marcar para eliminar en próxima sesión. Pedir confirmación antes.
**Riesgo:** Bajo — no hay nada que dependa de ella. Pero confirmar antes de borrar.
**Esfuerzo:** 5 min.

### TD-04 · `/api/og-image/test/route.tsx` — endpoint de debug en producción
**Archivo:** `src/app/api/og-image/test/route.tsx`
**Problema:** Endpoint de debug que expone el número de talentos en DB a cualquiera que acceda a `/api/og-image/test`. No tiene auth. Fue útil para diagnosticar ImageResponse — ya no tiene utilidad.
**Acción:** Eliminar en próxima sesión.
**Riesgo:** Bajo (no es PII sensible), pero es ruido y expone información.
**Esfuerzo:** 2 min.

### TD-05 · Rutas duplicadas para perfiles de creador
**Archivos:** `src/app/[creatorSlug]/page.tsx` y `src/app/creadores/[slug]/page.tsx`
**Problema:** Ambas sirven perfiles de creador. `/[creatorSlug]` captura el slug en la raíz del dominio (ej: `socialpro.es/naow`). `/creadores/[slug]` es una ruta explícita. Ambas apuntan a canonical `/talentos/[slug]`. No es dead code — son redirects implícitos con contenido — pero generan confusión arquitectónica.
**Análisis:**
- `[creatorSlug]` muestra la vista de giveaways del creador (HeroSponsorCard + CodeRowMini)
- `creadores/[slug]` muestra la vista alternativa con CreatorHero
- `talentos/[slug]` es el perfil canónico completo
- `c/[slug]` redirige a talentos/[slug]
**Acción:** Documentar la intención de cada ruta (ver sección de arquitectura abajo). No eliminar sin entender el funnel.
**Riesgo:** Medio — puede generar crawl budget desperdiciado si Google indexa variantes.

---

## MEDIO — Performance

### TD-06 · `LiveSection` sin skeleton — CLS en mobile
**Archivo:** `src/features/live/components/LiveSection.tsx:160`
**Problema:** `if (loading) return null` — la sección aparece de la nada desplazando todo el contenido de abajo. En mobile esto es especialmente visible. Cumulative Layout Shift (CLS) penaliza SEO.
**Acción:** Añadir un skeleton placeholder de altura fija (ej. `h-48`) mientras `loading = true`.
**Esfuerzo:** 15 min.

### TD-07 · Archivos sobre el límite de 500 LOC (regla CLAUDE.md)
Los siguientes archivos exceden el límite. Candidatos a split cuando se toquen:

| Archivo | LOC |
|---------|-----|
| `AccountingImporter.tsx` | 780 |
| `crmTasks.ts` | 774 |
| `CampaignPayments.tsx` | 688 |
| `BrandBriefsTab.tsx` | 648 |
| `alerts.ts` | 641 |
| `dashboard.ts` | 593 |
| `campaigns.ts` | 593 |
| `talents.ts` | 575 |
| `ImportInbox.parts.tsx` | 557 |
| `CampaignDetailTabs.tsx` | 538 |

**Acción:** No dividir proactivamente. Solo cuando se toque el archivo por otra razón.

### TD-08 · `eslint-disable` sin justificación en componentes live
**Archivos:** `src/features/giveaways/components/TalentLiveWidget.tsx:112`, `src/features/live/components/LiveSection.tsx:150`
**Problema:** `// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment` en fetches de API. Los datos vienen de `fetch('/api/live')` sin tipar el response. Debería usarse un type assertion con Zod parse o al menos `unknown` con narrowing.
**Acción:** Añadir type assertion explícito con `as LiveData` y comentario `// safe: forma conocida del endpoint /api/live`.

---

## BAJO — SEO / Metadata

### TD-09 · Home page sin metadata propia — depende del fallback del layout
**Archivo:** `src/app/page.tsx`
**Problema:** La home no tiene `export const metadata` ni `generateMetadata`. Hereda del `layout.tsx` raíz. El layout tiene buenos defaults, pero si se quiere hacer A/B de títulos o personalizar el OG de la home sin tocar el layout global, no es posible.
**Acción:** Añadir `export const metadata: Metadata = { ... }` específico para la home. Opcional pero recomendado.
**Esfuerzo:** 15 min.

### TD-10 · `/giveaways` sin openGraph image propia
**Archivo:** `src/app/giveaways/page.tsx`
**Problema:** Tiene metadata pero sin `openGraph.images`. Cuando se comparte en Discord/WhatsApp usa el OG estático de la home (`/og-socialpro.png`). Debería tener una imagen más relevante al contexto de sorteos/códigos.
**Acción:** Añadir campo `images` al openGraph existente, con la imagen estática o una dinámica si se crea `/api/og-image/giveaway`.
**Esfuerzo:** 10 min (estático) / 2h (dinámico).

### TD-11 · Páginas con canonical a ruta diferente de su propia URL
**Archivo:** `src/app/creadores/[slug]/page.tsx:35`
**Código:** `alternates: { canonical: '/talentos/${slug}' }`
**Análisis:** Correcto — indica que el contenido canónico está en `/talentos/[slug]`. Google debería consolidar el link equity. Verificar que no haya señales contradictorias (hreflang, sitemaps apuntando a `/creadores/`).

---

## BAJO — Código / Mantenibilidad

### TD-12 · Variables declaradas pero sin usar (lint warnings heredados)
Los 76 warnings del linter son todos `no-unused-vars`. Los más repetidos:
- `_formData` en actions (conveción `_` correcta)
- `sql` importado y no usado en varias queries
- Variables intermedias en formularios admin

**Acción:** Limpiar incrementalmente cuando se toquen los archivos. No hacer un commit masivo de cleanup.

### TD-13 · `import Link from 'next/link'` sin usar en AboutSection
**Archivo:** `src/features/marketing-site/components/AboutSection.tsx` (ya limpiado hoy — ✅)

### TD-14 · `receivables.ts` widget resumen usa `invoices.paidAmount` deprecated — ✅ CORREGIDO (2026-07-02)
**Archivo:** `src/lib/queries/financeDashboard/receivables.ts:53`
**Contexto:** El schema marca `invoices.paidAmount` como `@deprecated` — la fuente canónica de pagos es `invoice_payments`.
**Corrección:** El internal path de `getReceivables()` ahora calcula `paidAmount` como `COALESCE(SUM(invoice_payments.amount), 0)` con LEFT JOIN + GROUP BY, mismo patrón que el issued path y que `arAging.ts` / `finanzasResumenV2.ts`. También se limpió `pnl.ts` que seleccionaba `paidAmount` sin usarlo (dead SELECT).
**Estado:** `receivables.ts` y `pnl.ts` ya no leen `invoices.paidAmount`. Ver TD-14b para el residual pendiente.

### TD-14b · `listInvoices()` expone `paidAmount` column — 🟨 NO ACCIONABLE (decisión de diseño, 2026-07-02)
**Archivo:** `src/lib/queries/invoices.ts:68`

**Decisión (2026-07-02):** tras diagnóstico exhaustivo de los 10 consumers de `listInvoices()`, **no se migra**. La column `invoices.paidAmount` deja de considerarse "deuda a corregir" y pasa a ser **valor operativo manual declarado por el usuario**.

**Semántica actual (documentada y aceptada):**
- `invoices.paidAmount` (column) = valor operativo/manual editable desde `InvoiceDrawer` — lo que el usuario declara como cobrado/pagado.
- `invoice_payments` (tabla) = fuente canónica de **cash real conciliado** con `bank_transaction`.
- Ambos conceptos pueden coexistir independientemente. Ver `docs/finance-dashboard.md` § 10 (Convención `status='pagada'` sin `invoice_payments`).

**Análisis de consumers (10 archivos):**
Ninguno calcula "cobrado real" o "pendiente real" a partir de `.paidAmount`. Los que muestran cifras de cash (`ReceivablesTable`, `ArAgingTable`, resumen V2) reciben `paidAmount` desde queries dedicadas (`arAging.ts`, `receivables.ts`, `finanzasResumenV2.ts`) que ya usan `invoice_payments`. El único consumer que lee la column directamente es `InvoiceDrawer.tsx:390` como `defaultValue` del input editable — semánticamente correcto para el rol de "valor manual".

**Regla derivada de la decisión:**
- ✅ `listInvoices()` se mantiene tal cual. `paidAmount` = valor manual declarado.
- ✅ Vistas críticas de Finanzas (resumen, cobros, pl, mes) deben usar `invoice_payments` o queries dedicadas — nunca `listInvoices().paidAmount`.
- ✅ Si en el futuro se necesita cash real en un listado genérico, **crear una función paralela** `listInvoicesWithPayments()` que derive desde `invoice_payments`. **No modificar `listInvoices()` directamente** — rompería el drawer editable y ~10 pantallas.

**Protección anti-migración accidental:**
`src/__tests__/server/finance-td14-invoice-payments.test.ts` incluye un test estático que verifica que `listInvoices()` sigue con `paidAmount: invoices.paidAmount`. Si algún día se migra intencionalmente, ese test debe actualizarse y este bloque de tech-debt también.

**Estado:** cerrado como decisión de diseño. No hay acción pendiente. Sin fecha de reapertura.

---

## Rutas que necesitan clarificación de propósito

| Ruta | Descripción | Estado |
|------|------------|--------|
| `/app/[creatorSlug]` | Perfil de creador en raíz (giveaways view) | Activo, canon→/talentos |
| `/app/creadores/[slug]` | Perfil de creador explícito (hero view) | Activo, canon→/talentos |
| `/app/c/[slug]` | Redirect 301 a /talentos/[slug] | Activo, intencional |
| `/app/talentos/[slug]` | Perfil canónico completo | Activo, canónico |
| `/api/og/talent/[slug]` | JSON data endpoint legacy | Huérfano — eliminar |
| `/api/og-image/test` | Debug endpoint | Eliminar |
| `/api/og-image/talent/[slug]` | Redirect 301 a talent-img | Activo, intencional |
| `/api/og-image/talent-img` | OG image actual (nodejs) | Activo, producción |
