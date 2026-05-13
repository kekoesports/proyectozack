CREATE TYPE "public"."newsletter_send_status" AS ENUM('sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "newsletter_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"status" "newsletter_send_status" DEFAULT 'sending' NOT NULL,
	"recipient_count" integer,
	"sent_by" varchar(254),
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "newsletter_sends_post_id_uniq" UNIQUE("post_id")
);
--> statement-breakpoint
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "newsletter_sends_status_idx" ON "newsletter_sends" USING btree ("status");