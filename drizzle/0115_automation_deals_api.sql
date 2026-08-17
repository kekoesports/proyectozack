-- Puente CRM para n8n: idempotencia por origen+clave y memoria del último
-- umbral de progreso notificado. Cambios aditivos y compatibles con campañas
-- existentes.

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "automation_source" varchar(40);
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "automation_external_id" varchar(160);
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "tracking_alert_level" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "campaigns_automation_source_external_uq"
  ON "campaigns" USING btree ("automation_source", "automation_external_id")
  WHERE "automation_source" IS NOT NULL AND "automation_external_id" IS NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
  ALTER TABLE "campaigns"
    ADD CONSTRAINT "campaigns_tracking_alert_level_check"
    CHECK ("tracking_alert_level" IN (0, 70, 80, 100));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
