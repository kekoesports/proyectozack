CREATE TABLE "news_social_channels" (
	"channel" varchar(16) PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"start_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"account_id" varchar(100),
	"credential_fingerprint" varchar(64),
	"budget_month" varchar(7),
	"reserved_cents" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_error" varchar(80)
);
--> statement-breakpoint
CREATE TABLE "news_social_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"channel" varchar(16) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"text" text NOT NULL,
	"article_url" text NOT NULL,
	"container_id" varchar(100),
	"remote_id" varchar(100),
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"last_error" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "news_social_deliveries" ADD CONSTRAINT "news_social_deliveries_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "news_social_post_channel_uq" ON "news_social_deliveries" USING btree ("post_id","channel");--> statement-breakpoint
CREATE INDEX "news_social_pending_idx" ON "news_social_deliveries" USING btree ("channel","status","next_attempt_at");