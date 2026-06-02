CREATE TABLE "talent_profile_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"talent_id" integer NOT NULL,
	"action" varchar(20) DEFAULT 'view' NOT NULL,
	"session_hash" varchar(64) NOT NULL,
	"country" varchar(2),
	"referrer_host" varchar(255),
	"device" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "talent_profile_events" ADD CONSTRAINT "talent_profile_events_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "talent_profile_events_talent_id_created_at_idx" ON "talent_profile_events" USING btree ("talent_id","created_at");--> statement-breakpoint
CREATE INDEX "talent_profile_events_created_at_idx" ON "talent_profile_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "talent_profile_events_dedup_idx" ON "talent_profile_events" USING btree ("session_hash","talent_id","action");