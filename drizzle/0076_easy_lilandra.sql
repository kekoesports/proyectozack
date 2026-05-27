CREATE TABLE "giveaway_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"giveaway_id" integer,
	"action" varchar(20) NOT NULL,
	"page" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "giveaway_events" ADD CONSTRAINT "giveaway_events_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "giveaway_events_action_created_idx" ON "giveaway_events" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "giveaway_events_giveaway_id_idx" ON "giveaway_events" USING btree ("giveaway_id");--> statement-breakpoint
CREATE INDEX "giveaway_events_created_at_idx" ON "giveaway_events" USING btree ("created_at");