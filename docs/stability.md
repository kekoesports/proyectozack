# Estabilidad del CRM — Mapa de módulos

Última actualización: 2026-05-06

## Estado general

| Check | Estado |
|---|---|
| CI (lint + tsc + tests + build) | ✅ Verde |
| Schema drift check | ✅ Activo en CI |
| Migrations auto en deploy | ✅ `npm run migrate` en build |
| Tests | ✅ 939/939 pasan |
| Producción | ✅ Sin errores runtime |
| IDOR brands/[id] | ✅ Guard aplicado (2026-05-06) |
| IDOR campanas/[id] | ✅ Guard aplicado (2026-05-06) |
| Staff visibility equipo | ✅ Solo ve su card (2026-05-06) |
| Analytics staff filter | ✅ Corregido a session-based (2026-05-06) |

---

## Módulos sólidos

### Tareas (crm_tasks)
- Tests unitarios completos para actions y queries
- Rollover semanal con test de cron
- Co-responsable, notificaciones, calendario — funcional
- Ownership checks en staff (resetRolledOver, etc.)
- **Riesgo bajo**

### Facturación (invoices, issued_invoices)
- Parser PDF con reintentos y rate-limit handling
- Tests para invoice schema, draft schema, PnL
- Importación CSV/XML/XLSX funcional
- **Riesgo bajo**

### Campañas (campaigns, deliverables)
- Tests para campaign actions y queries
- Contratos con firma digital funcional
- **Riesgo bajo**

### Marcas (crm_brands)
- Co-responsable implementado con visibilidad correcta
- Permisos staff bien scoped
- **Riesgo bajo**

### Autenticación (Better Auth)
- `requireAnyRole` / `requireRole` patrón consistente
- Session cascade delete en onDelete
- **Riesgo bajo**

---

## Módulos frágiles

### Giveaways (giveaways + creator_codes)

**Historial de bugs (todos corregidos):**
- 3 actions usaban `requireRole('admin')` → managers redirigidos al panel (2026-05-06)
- `validateRedirectField` bloqueaba cualquier URL → form no funcionaba (2026-05-06)
- `useActionState` + form nativo → POST completo en producción (2026-05-06)
- `endsAt` NOT NULL → imposible crear sorteos sin fecha fin (2026-05-06)
- Form se reseteaba al error de validación (2026-05-06)

**Estado actual:**
- `createCodeAction`, `updateCodeAction`, `deleteCodeAction` → `requireAnyRole(['admin','manager'])`
- `createWinnerAction`, `deleteWinnerAction` → `requireAnyRole(['admin','manager'])`
- `createGiveawayAction`, `deleteGiveawayAction` → `requireAnyRole(['admin','manager'])`
- Todos los forms usan `useTransition` + inputs controlados
- `safeRedirectUrl()` en schemas — rechaza javascript:/data: schemes

**Tests de cobertura:**
- `codes-actions.test.ts` — 7 tests (validación, permisos, esquemas peligrosos)
- `winners-actions.test.ts` — 5 tests (permisos, validación básica)
- `trpc-giveaways.test.ts` — queries públicas

**Riesgo medio** — Módulo con más cambios recientes. Monitorizar en producción.

### Calendario (crm_events + TaskCalendar)

**Nuevo en 2026-05-06:**
- Tabla `crm_events` (jsonb attendees, startAt, endAt)
- Spans multi-día en calendario
- Visibilidad staff por attendees
- `getEventsForMonth` extiende ±3 meses

**Sin tests unitarios para:**
- `event-actions.ts` (createEventAction, deleteEventAction)
- `crmEvents.ts` queries

**Riesgo medio** — Funcionalidad nueva sin test coverage.

---

## Migrations

### Protocolo (obligatorio)
1. Editar `src/db/schema/`
2. `npx drizzle-kit generate` → SQL en `drizzle/`
3. `npm run migrate` → aplica en local
4. Commit del SQL generado
5. El deploy Vercel ejecuta `npm run migrate` automáticamente

### Reglas
- ❌ NUNCA `drizzle-kit push` en producción
- ❌ NUNCA SQL directo en Neon console
- ✅ CI falla si hay drift schema sin migration (`drizzle-kit check`)
- ✅ Build de Vercel aplica migrations antes de compilar

### Incidente histórico (2026-05-06)
`crm_alerts` fue creada via `drizzle-kit push` sin migration file → producción crasheó.
Resuelto con migration 0051 (`CREATE TABLE IF NOT EXISTS`).

---

## Deuda técnica priorizada

| Prioridad | Item | Fichero |
|---|---|---|
| Alta | Tests para event-actions.ts | Ninguno aún |
| Alta | Tests para crmEvents queries | Ninguno aún |
| Media | `<img>` en vez de `<Image>` | brands/[id] page |
| Media | `byStatus` y `PAYMENT_METHODS` sin usar | CampaignsManager |
| Baja | Variables `_prefixadas` en tests | invoice-draft-schema.test.ts |
| Baja | `isAdmin` sin usar en equipo/page.tsx | equipo/page.tsx |

---

## Reglas de permisos

| Operación | Admin | Manager | Staff |
|---|---|---|---|
| CRUD general (marcas, tareas, campañas) | ✅ | ✅ | ✅ (solo propios) |
| Eliminar entidades | ✅ | ❌ | ❌ |
| Gestión de equipo (roles, invitar) | ✅ | ❌ | ❌ |
| Giveaways / códigos / ganadores | ✅ | ✅ | ❌ |
| Import masivo (talentos) | ✅ | ❌ | ❌ |
| Fotos equipo/talentos | ✅ | ❌ | ❌ |
| Plantillas de contrato | ✅ | ❌ | ❌ |
