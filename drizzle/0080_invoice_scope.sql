CREATE TYPE "public"."invoice_scope" AS ENUM('campaign', 'company');
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "scope" "invoice_scope";
--> statement-breakpoint
UPDATE "invoices" SET scope = 'company', category = 'Otros' WHERE category = 'Gastos empresa';
--> statement-breakpoint
UPDATE "invoices" SET scope = 'campaign', category = 'Otros' WHERE category = 'Gastos creador';
--> statement-breakpoint
UPDATE "invoices" SET
  scope = CASE WHEN campaign_id IS NOT NULL THEN 'campaign'::invoice_scope ELSE 'company'::invoice_scope END,
  category = 'Otros'
  WHERE category IN ('Ingresos en banco', 'Ingresos en crypto');
--> statement-breakpoint
UPDATE "invoices" SET
  scope = CASE WHEN campaign_id IS NOT NULL THEN 'campaign'::invoice_scope ELSE 'company'::invoice_scope END
  WHERE scope IS NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "scope" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_scope_idx" ON "invoices" ("scope");
