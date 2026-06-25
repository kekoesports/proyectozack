CREATE TYPE "public"."brand_sheet_status" AS ENUM('active', 'paused', 'error');--> statement-breakpoint
CREATE TABLE "brand_sheet_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_name" varchar(200) NOT NULL,
	"crm_brand_id" integer,
	"source_title" varchar(300),
	"google_sheet_url" text NOT NULL,
	"spreadsheet_id" varchar(100) NOT NULL,
	"parse_mode" "tracker_parse_mode" DEFAULT 'socialpro_blocks' NOT NULL,
	"sync_enabled" boolean DEFAULT false NOT NULL,
	"last_scanned_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"status" "brand_sheet_status" DEFAULT 'active' NOT NULL,
	"error_message" text,
	"deliverable_type_map" jsonb,
	"talent_name_map" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "brand_sheet_source_id" integer;--> statement-breakpoint
ALTER TABLE "brand_sheet_sources" ADD CONSTRAINT "brand_sheet_sources_crm_brand_id_crm_brands_id_fk" FOREIGN KEY ("crm_brand_id") REFERENCES "public"."crm_brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_sheet_sources_status_idx" ON "brand_sheet_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "brand_sheet_sources_crm_brand_idx" ON "brand_sheet_sources" USING btree ("crm_brand_id");--> statement-breakpoint
CREATE INDEX "brand_sheet_sources_created_idx" ON "brand_sheet_sources" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD CONSTRAINT "deal_deliverable_trackers_brand_sheet_source_id_brand_sheet_sources_id_fk" FOREIGN KEY ("brand_sheet_source_id") REFERENCES "public"."brand_sheet_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_trackers_source_idx" ON "deal_deliverable_trackers" USING btree ("brand_sheet_source_id");