CREATE TYPE "public"."newsletter_status" AS ENUM('active', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(254) NOT NULL,
	"status" "newsletter_status" DEFAULT 'active' NOT NULL,
	"source" varchar(50) DEFAULT 'news_popup' NOT NULL,
	"consent_newsletter" boolean NOT NULL,
	"consent_marketing" boolean DEFAULT false NOT NULL,
	"consent_version" varchar(30) NOT NULL,
	"consent_text" text NOT NULL,
	"ip_hash" varchar(64),
	"user_agent" text,
	"unsubscribe_token" varchar(64),
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token"),
	CONSTRAINT "newsletter_subscribers_email_uniq" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_status_idx" ON "newsletter_subscribers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_subscribed_idx" ON "newsletter_subscribers" USING btree ("subscribed_at");