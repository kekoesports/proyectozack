CREATE TABLE "agenda_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"team1" varchar(100),
	"team2" varchar(100),
	"tournament" varchar(200),
	"match_date" date NOT NULL,
	"match_time" time,
	"is_live" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "blocks_json" jsonb;--> statement-breakpoint
CREATE INDEX "agenda_items_date_idx" ON "agenda_items" USING btree ("match_date");