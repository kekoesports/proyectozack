CREATE TABLE "post_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"action" varchar(20) DEFAULT 'view' NOT NULL,
	"session_hash" varchar(64) NOT NULL,
	"country" varchar(2),
	"referrer_host" varchar(255),
	"device" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_events" ADD CONSTRAINT "post_events_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_events_post_id_created_at_idx" ON "post_events" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "post_events_created_at_idx" ON "post_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "post_events_dedup_idx" ON "post_events" USING btree ("session_hash","post_id","action");