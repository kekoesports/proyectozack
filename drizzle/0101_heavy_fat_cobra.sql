CREATE TYPE "public"."deliverable_subtype" AS ENUM('dedicated_video', 'preroll', 'stream');--> statement-breakpoint
ALTER TYPE "public"."tracker_parse_mode" ADD VALUE 'horizontal_triplets';--> statement-breakpoint
ALTER TABLE "deal_deliverable_items" ADD COLUMN "deliverable_subtype" "deliverable_subtype";