-- FV.3 — el IVA y la retención dejan de vivir solo como porcentaje.
--
-- `invoices` guardaba `vat_pct` y `withholding_pct`, pero ningún importe. Para
-- saber cuánto IVA hay en el periodo había que recalcularlo en cada query, y
-- `issued_invoices` ya guardaba `vat_amount` — dos tablas con dos criterios.
--
-- Con los 70 gastos del libro importados, esto deja de ser teórico: hay
-- 1.639,09 € de IVA soportado y 2.465,58 € de retenciones practicadas que hasta
-- ahora no se veían en ninguna pantalla.
--
-- OJO con el total: NO es uniforme entre tipos de movimiento.
--   · Factura de proveedor → total = base + IVA − retención (lo que se transfiere)
--   · Nómina              → total = devengado bruto; la retención de IRPF no
--                            reduce el gasto, es dinero que la empresa ingresa
--                            a Hacienda por el modelo 111
-- Por eso los importes se derivan de la BASE y su porcentaje, nunca de la
-- diferencia con el total: sobre una nómina esa resta daría el líquido y
-- convertiría el IRPF en un descuento del gasto, que no lo es.
--
-- Escrita A MANO. Idempotente.

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "vat_amount" numeric(12, 2);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "withholding_amount" numeric(12, 2);
--> statement-breakpoint

-- Backfill de lo ya registrado. `ROUND(base * pct/100, 2)` es exactamente lo que
-- aplica la factura, y coincide con los importes del libro de la gestoría.
UPDATE "invoices"
   SET "vat_amount" = ROUND("net_amount" * "vat_pct" / 100, 2)
 WHERE "vat_amount" IS NULL;
--> statement-breakpoint

UPDATE "invoices"
   SET "withholding_amount" = ROUND("net_amount" * "withholding_pct" / 100, 2)
 WHERE "withholding_amount" IS NULL;
