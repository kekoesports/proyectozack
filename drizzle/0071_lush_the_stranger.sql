CREATE TYPE "public"."seo_bio_status" AS ENUM('empty', 'generated', 'edited', 'approved');--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "seo_bio_generated" text;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "seo_bio_manual" text;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "seo_bio_status" "seo_bio_status" DEFAULT 'empty' NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "seo_title" varchar(200);--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "seo_description" varchar(300);--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "seo_keywords" text[];