CREATE TYPE "public"."deliverable_status" AS ENUM('pending_submission', 'submitted', 'internal_review', 'brand_review', 'approved', 'revision_requested', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."deliverable_type" AS ENUM('stream_integration', 'video_youtube', 'short_reel_tiktok', 'story_instagram', 'tweet_x', 'post_instagram', 'otro');--> statement-breakpoint
CREATE TABLE "deliverable_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deliverable_id" integer NOT NULL,
	"author_user_id" text,
	"content" text NOT NULL,
	"status_snapshot" "deliverable_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"talent_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"type" "deliverable_type" NOT NULL,
	"description" text,
	"status" "deliverable_status" DEFAULT 'pending_submission' NOT NULL,
	"content_url" text,
	"submitted_at" timestamp with time zone,
	"submitted_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"approved_at" timestamp with time zone,
	"revision_notes" text,
	"due_date" timestamp with time zone,
	"invoice_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverable_comments" ADD CONSTRAINT "deliverable_comments_deliverable_id_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_comments" ADD CONSTRAINT "deliverable_comments_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_submitted_by_user_id_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deliverable_comments_deliverable_idx" ON "deliverable_comments" USING btree ("deliverable_id");--> statement-breakpoint
CREATE INDEX "deliverables_campaign_idx" ON "deliverables" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "deliverables_talent_idx" ON "deliverables" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "deliverables_status_idx" ON "deliverables" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deliverables_due_date_idx" ON "deliverables" USING btree ("due_date");