-- crm_alerts was added to the schema without a migration file (likely via drizzle-kit push).
-- This migration creates it idempotently so production databases that missed it are fixed.
CREATE TABLE IF NOT EXISTS "crm_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(80) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"severity" varchar(20) NOT NULL DEFAULT 'medium',
	"status" varchar(20) NOT NULL DEFAULT 'active',
	"related_entity_type" varchar(50),
	"related_entity_id" integer,
	"assigned_to_user_id" text,
	"due_date" date,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"snoozed_until" date,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_alerts" ADD CONSTRAINT "crm_alerts_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_alerts_type_idx" ON "crm_alerts" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_alerts_status_idx" ON "crm_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_alerts_severity_idx" ON "crm_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_alerts_entity_idx" ON "crm_alerts" USING btree ("related_entity_type","related_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_alerts_assigned_idx" ON "crm_alerts" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_alerts_due_idx" ON "crm_alerts" USING btree ("due_date");
