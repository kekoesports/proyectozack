CREATE TABLE "creator_live_audience_samples" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"platform" varchar(20) NOT NULL,
	"category_name" varchar(100) NOT NULL,
	"viewer_count" integer,
	"stream_started_at" timestamp with time zone NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"source" varchar(80) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_live_audience_samples" ADD CONSTRAINT "creator_live_audience_samples_account_id_creator_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."creator_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_live_sample_account_observed_key" ON "creator_live_audience_samples" USING btree ("account_id","observed_at");--> statement-breakpoint
CREATE INDEX "creator_live_sample_account_window_idx" ON "creator_live_audience_samples" USING btree ("account_id","observed_at");--> statement-breakpoint
CREATE INDEX "creator_live_sample_expiry_idx" ON "creator_live_audience_samples" USING btree ("expires_at");