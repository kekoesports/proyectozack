-- Reconciliación del drift entre el schema TypeScript y la base de producción.
--
-- Diagnóstico completo en docs/incidents/2026-08-19-drizzle-snapshot-drift.md.
-- Escrita A MANO: `drizzle-kit generate` no produce un diff fiable mientras
-- `drizzle/meta/` esté desalineado (mismo patrón que 0105 y 0118).
--
-- Se comparó el snapshot derivado del schema TypeScript contra la introspección
-- real de producción. De ahí salen exactamente estos tres bloques.

-- ── 1. BUG EN PRODUCCIÓN ─────────────────────────────────────────────────────
-- `crmBrandStatusEnum` (src/db/schema/crmBrands.ts) y el Zod de
-- src/lib/schemas/crmBrand.ts declaran 'inactiva' y 'perdida', pero el enum de
-- la base sólo tiene 8 valores. Marcar una marca con cualquiera de esos dos
-- estados falla hoy con:
--     invalid input value for enum crm_brand_status: "inactiva"
-- Se insertan en su posición para que el orden case con el del schema.
ALTER TYPE "public"."crm_brand_status" ADD VALUE IF NOT EXISTS 'inactiva' BEFORE 'pausada';
--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE IF NOT EXISTS 'perdida' BEFORE 'pausada';
--> statement-breakpoint

-- ── 2. COLUMNAS RESIDUALES ───────────────────────────────────────────────────
-- Restos de un modelo anterior que el schema TypeScript ya no declara. Sustituidas
-- por el cálculo derivado desde `invoices` (brandPaid/talentPaid se computan en
-- la query, no se almacenan).
--
-- Verificado contra producción antes de borrar (96 campañas, 93 facturas):
--   description, deliverables, agency_fee, agency_fee_percent,
--   brand_paid_date, brand_paid_amount, talent_paid_date, talent_paid_amount
--     → 0/96 no nulos
--   brand_paid, talent_paid → boolean NOT NULL DEFAULT false, 96/96 en `false`
--   invoices.entity → 0/93 no nulos
-- Ninguna fila con valor significativo. Respaldo tomado antes de aplicar.
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "description";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "deliverables";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "agency_fee";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "agency_fee_percent";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "brand_paid";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "brand_paid_date";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "brand_paid_amount";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "talent_paid";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "talent_paid_date";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "talent_paid_amount";
--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "entity";
--> statement-breakpoint

-- ── 3. TABLA DE EJEMPLO DE NEON ──────────────────────────────────────────────
-- La crea Neon al provisionar el proyecto. Nunca la ha referenciado el código
-- (20 filas de datos de muestra). Mientras exista, la introspección la ve y
-- `generate` la trata como tabla a eliminar.
DROP TABLE IF EXISTS "playing_with_neon";
