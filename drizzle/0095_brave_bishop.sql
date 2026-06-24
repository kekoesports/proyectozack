CREATE TYPE "public"."tracker_parse_mode" AS ENUM('simple_columns', 'socialpro_blocks');--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ALTER COLUMN "tracking_source_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ALTER COLUMN "tracking_source_type" SET DEFAULT 'manual'::text;--> statement-breakpoint
DROP TYPE "public"."tracker_source_type";--> statement-breakpoint
CREATE TYPE "public"."tracker_source_type" AS ENUM('csv_upload', 'xlsx_upload', 'google_sheet', 'manual');--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ALTER COLUMN "tracking_source_type" SET DEFAULT 'manual'::"public"."tracker_source_type";--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ALTER COLUMN "tracking_source_type" SET DATA TYPE "public"."tracker_source_type" USING "tracking_source_type"::"public"."tracker_source_type";--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "tracking_source_url" text;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "google_spreadsheet_id" varchar(100);--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "google_sheet_gid" varchar(20);--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "sync_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "link_column" varchar(100);--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "date_column" varchar(100);--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "notes_column" varchar(100);--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "tracking_parse_mode" "tracker_parse_mode" DEFAULT 'simple_columns' NOT NULL;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "google_sheet_block_title" varchar(500);--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "google_sheet_block_index" integer;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "google_sheet_start_col" integer;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "google_sheet_header_row" integer;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "google_sheet_link_col" integer;