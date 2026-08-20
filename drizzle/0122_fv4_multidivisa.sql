-- FV.4 — el contravalor en euros deja de calcularse al vuelo y se guarda.
--
-- Hasta ahora una factura en dólares sumaba 1:1 en todos los agregados: 800 $
-- contaban como 800 €. Con las tres emitidas en USD de 2026 eso son 372,34 €
-- de más sobre una facturación de 57.376,99 €.
--
-- Se guardan tres cosas por fila, no una:
--   · fx_rate       EUR que vale UNA unidad de la divisa (USD 0,86528 ⇒ 1 $ = 0,86528 €)
--   · fx_rate_date  el día del tipo aplicado — en fin de semana no coincide con
--                   issue_date porque el BCE no publica, y sin este campo no hay
--                   forma de auditar por qué salió ese número
--   · eur_equivalent  el contravalor ya fijado, que es lo que suman los agregados
--
-- Fijar el contravalor en la fila y no recalcularlo es deliberado: el tipo de la
-- fecha de operación es el que vale fiscalmente, y no puede cambiar porque hoy
-- el mercado esté en otro sitio.
--
-- NULL en las filas en euros: no hay nada que convertir, y así se distingue
-- "es euros" de "está sin convertir".
--
-- Escrita A MANO (ver docs/incidents/2026-08-19-drizzle-snapshot-drift.md).
-- Idempotente: el build de Vercel la ejecuta en cada deploy.

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "fx_rate" numeric(14, 6);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "fx_rate_date" date;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "eur_equivalent" numeric(12, 2);
--> statement-breakpoint

ALTER TABLE "issued_invoices" ADD COLUMN IF NOT EXISTS "fx_rate" numeric(14, 6);
--> statement-breakpoint
ALTER TABLE "issued_invoices" ADD COLUMN IF NOT EXISTS "fx_rate_date" date;
--> statement-breakpoint
ALTER TABLE "issued_invoices" ADD COLUMN IF NOT EXISTS "eur_equivalent" numeric(12, 2);
--> statement-breakpoint

-- Las filas en euros quedan resueltas aquí mismo: su contravalor es su importe.
-- Así `eur_equivalent IS NULL` significa exactamente "falta convertir esta fila",
-- que es lo que consultan los avisos del desglose y los chequeos de FV.7.
UPDATE "invoices"
   SET "eur_equivalent" = "total_amount"
 WHERE "currency" = 'EUR' AND "eur_equivalent" IS NULL;
--> statement-breakpoint

UPDATE "issued_invoices"
   SET "eur_equivalent" = "total_amount"
 WHERE "currency" = 'EUR' AND "eur_equivalent" IS NULL;
