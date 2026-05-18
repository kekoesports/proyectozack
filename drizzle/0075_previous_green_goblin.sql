CREATE TABLE "news_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"source_name" varchar(200),
	"source_url" text NOT NULL,
	"snippet" text,
	"image_url" varchar(500),
	"keywords_matched" text[] DEFAULT '{}' NOT NULL,
	"category" varchar(50) NOT NULL,
	"priority" varchar(10) NOT NULL,
	"language" varchar(5),
	"published_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	CONSTRAINT "news_alerts_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE INDEX "news_alerts_category_idx" ON "news_alerts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "news_alerts_published_at_idx" ON "news_alerts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "news_alerts_read_at_idx" ON "news_alerts" USING btree ("read_at");