ALTER TABLE "crm_brands" ADD COLUMN IF NOT EXISTS "manager" varchar(250);--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN IF NOT EXISTS "discord" varchar(80);--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN IF NOT EXISTS "telegram" varchar(80);--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN IF NOT EXISTS "whatsapp" varchar(40);--> statement-breakpoint
ALTER TABLE "crm_brands" DROP COLUMN IF EXISTS "legal_name";
