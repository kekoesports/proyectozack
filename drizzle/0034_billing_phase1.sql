-- Fase 1: Facturación — nuevos valores de estado y columnas
ALTER TYPE "public"."invoice_status" ADD VALUE 'no_cobrado';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'no_pagado';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'pendiente';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "campaign_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "ai_tool_name" varchar(100);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "receipt_file_url" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "receipt_file_path" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_campaign_idx" ON "invoices" USING btree ("campaign_id");
