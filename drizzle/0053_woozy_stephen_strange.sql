CREATE TABLE "talent_live_status" (
	"talent_id" integer PRIMARY KEY NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"platform" varchar(20),
	"stream_title" text,
	"game_name" varchar(100),
	"viewer_count" integer,
	"thumbnail_url" varchar(500),
	"stream_url" varchar(500),
	"live_video_id" varchar(100),
	"started_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "featured_live" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "exclude_from_live" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "talent_live_status" ADD CONSTRAINT "talent_live_status_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;