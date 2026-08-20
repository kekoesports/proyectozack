-- FV.1 — FK real del espejo emitida → interna.
--
-- Al marcar cobrada una factura emitida, `updateInvoiceStatusAction` crea un
-- movimiento interno "espejo" para que la venta aparezca también en el libro de
-- gestión. Hasta ahora ese espejo solo se reconocía por un prefijo de texto en
-- `concept` / `notes`, y cada agregador aplicaba el criterio a su manera: uno
-- filtraba por `notes`, otro por `notes OR concept`, y rentabilidad no filtraba
-- nada. Editar el concepto de un movimiento bastaba para duplicar el importe.
--
-- Esta migración añade la FK que sustituye a esa heurística y enlaza de una vez
-- los espejos históricos. Escrita A MANO: `drizzle-kit generate` está prohibido
-- mientras `drizzle/meta/` tenga drift — ver
-- docs/incidents/2026-08-19-drizzle-snapshot-drift.md.
--
-- Idempotente: el build de Vercel ejecuta `tsx scripts/migrate.ts` y una
-- migración que falla bloquea todos los deploys.

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "mirror_of_issued_invoice_id" integer;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_mirror_of_issued_invoice_id_issued_invoices_id_fk"
    FOREIGN KEY ("mirror_of_issued_invoice_id")
    REFERENCES "public"."issued_invoices"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "invoices_mirror_of_issued_idx"
  ON "invoices" USING btree ("mirror_of_issued_invoice_id");
--> statement-breakpoint

-- Backfill único de los espejos ya existentes, detectados por el prefijo actual.
--
-- El match se hace por el número de factura al final del texto en lugar de
-- comparar la cadena completa: así no depende del guion largo de
-- 'Factura emitida — ' ni de la tilde de 'automáticamente', que es exactamente
-- el tipo de detalle que se rompe al pasar por editores y encodings distintos.
--
-- `HAVING COUNT(DISTINCT ii."id") = 1` deja fuera a propósito los casos
-- ambiguos (dos emitidas distintas con el mismo número, posible entre
-- emisores): esos se quedan con la FK a NULL y siguen cubiertos por el fallback
-- de prefijo en `revenue.shared.ts`. FV.7 los listará como incidencia de cierre
-- en vez de enlazarlos a ciegas aquí.
UPDATE "invoices" AS i
SET "mirror_of_issued_invoice_id" = m."issued_id"
FROM (
  SELECT inv."id" AS invoice_id, MIN(ii."id") AS issued_id
  FROM "invoices" inv
  JOIN "issued_invoices" ii
    ON (
         inv."concept" LIKE 'Factura emitida %'
         AND right(inv."concept", length(ii."invoice_number")) = ii."invoice_number"
       )
    OR (
         inv."notes" LIKE 'Creado autom%'
         AND right(inv."notes", length(ii."invoice_number")) = ii."invoice_number"
       )
  WHERE inv."kind" = 'income'
    AND inv."mirror_of_issued_invoice_id" IS NULL
  GROUP BY inv."id"
  HAVING COUNT(DISTINCT ii."id") = 1
) AS m
WHERE i."id" = m."invoice_id";
