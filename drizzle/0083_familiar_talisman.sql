CREATE TYPE "public"."post_content_type" AS ENUM('noticias', 'analisis', 'estadisticas');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "content_type" "post_content_type" DEFAULT 'noticias' NOT NULL;--> statement-breakpoint
CREATE INDEX "posts_content_type_idx" ON "posts" USING btree ("vertical","content_type","status","published_at");