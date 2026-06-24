CREATE TYPE "public"."content_platform" AS ENUM('twitch', 'kick', 'youtube', 'instagram', 'tiktok', 'other');--> statement-breakpoint
CREATE TYPE "public"."tracker_item_status" AS ENUM('detected', 'valid', 'duplicate', 'invalid', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tracker_source_type" AS ENUM('csv_upload', 'xlsx_upload', 'google_sheet_future', 'manual');--> statement-breakpoint
CREATE TYPE "public"."tracker_status" AS ENUM('active', 'review_pending', 'approved', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "deal_deliverable_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracker_id" integer NOT NULL,
	"source_row_index" integer,
	"original_url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"platform" "content_platform" DEFAULT 'other' NOT NULL,
	"content_date" varchar(10),
	"notes" text,
	"status" "tracker_item_status" DEFAULT 'detected' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_deliverable_trackers" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer,
	"talent_id" integer,
	"brand_name" varchar(200) NOT NULL,
	"deal_name" varchar(300) NOT NULL,
	"deliverable_type" "deliverable_type" NOT NULL,
	"target_count" integer NOT NULL,
	"current_count" integer DEFAULT 0 NOT NULL,
	"status" "tracker_status" DEFAULT 'active' NOT NULL,
	"tracking_source_type" "tracker_source_type" DEFAULT 'csv_upload' NOT NULL,
	"source_file_name" varchar(500),
	"last_imported_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deal_deliverable_items" ADD CONSTRAINT "deal_deliverable_items_tracker_id_deal_deliverable_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."deal_deliverable_trackers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_deliverable_items" ADD CONSTRAINT "deal_deliverable_items_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD CONSTRAINT "deal_deliverable_trackers_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD CONSTRAINT "deal_deliverable_trackers_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD CONSTRAINT "deal_deliverable_trackers_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_items_tracker_idx" ON "deal_deliverable_items" USING btree ("tracker_id");--> statement-breakpoint
CREATE INDEX "deal_items_status_idx" ON "deal_deliverable_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deal_items_normalized_url_idx" ON "deal_deliverable_items" USING btree ("normalized_url");--> statement-breakpoint
CREATE INDEX "deal_trackers_campaign_idx" ON "deal_deliverable_trackers" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "deal_trackers_talent_idx" ON "deal_deliverable_trackers" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "deal_trackers_status_idx" ON "deal_deliverable_trackers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deal_trackers_created_idx" ON "deal_deliverable_trackers" USING btree ("created_at");