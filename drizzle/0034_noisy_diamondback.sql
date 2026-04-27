CREATE TYPE "public"."file_related_type" AS ENUM('brand', 'talent', 'campaign', 'invoice', 'followup', 'task');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('invoice', 'statement', 'contract', 'briefing', 'geo_stats', 'screenshot', 'receipt', 'other');--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(250) NOT NULL,
	"type" "file_type" DEFAULT 'other' NOT NULL,
	"mime" varchar(120),
	"size_bytes" integer,
	"url" text NOT NULL,
	"path" text,
	"related_type" "file_related_type" NOT NULL,
	"related_id" integer NOT NULL,
	"platform" varchar(30),
	"notes" text,
	"uploaded_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "audience_status" varchar(20);--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "last_stats_update_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "top_geos" jsonb;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "updated_by_user_id" text;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_related_idx" ON "files" USING btree ("related_type","related_id");--> statement-breakpoint
CREATE INDEX "files_type_idx" ON "files" USING btree ("type");--> statement-breakpoint
CREATE INDEX "files_uploaded_by_idx" ON "files" USING btree ("uploaded_by_user_id");--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD CONSTRAINT "talent_metric_snapshots_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;