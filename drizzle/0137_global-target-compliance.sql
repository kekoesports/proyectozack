ALTER TABLE "targets" ADD COLUMN "compliance_activity" varchar(30);--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "compliance_status" varchar(40);--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "compliance_source_url" text;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "compliance_checked_at" timestamp with time zone;