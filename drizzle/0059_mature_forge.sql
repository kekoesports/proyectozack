CREATE TYPE "public"."post_vertical" AS ENUM('blog', 'news');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "vertical" "post_vertical" DEFAULT 'blog' NOT NULL;--> statement-breakpoint
CREATE INDEX "posts_vertical_status_pub_idx" ON "posts" USING btree ("vertical","status","published_at");