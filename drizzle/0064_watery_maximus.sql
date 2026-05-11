CREATE TABLE "ranking_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"team_name" varchar(100) NOT NULL,
	"team_logo" varchar(500),
	"country" varchar(3),
	"points" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ranking_entries_position_idx" ON "ranking_entries" USING btree ("position");