CREATE TABLE "talent_channel_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"talent_id" integer NOT NULL,
	"social_id" integer NOT NULL,
	"platform" varchar(30) NOT NULL,
	"snapshot_date" date NOT NULL,
	"followers" bigint DEFAULT 0 NOT NULL,
	"total_views" bigint,
	"content_count" integer,
	"recent_views_30d" bigint,
	"avg_views_30d" bigint,
	"uploads_30d" integer,
	"engagement_rate_30d" numeric(8, 4),
	"avg_ccv_30d" integer,
	"peak_ccv_30d" integer,
	"hours_live_30d" numeric(9, 2),
	"data_source" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talent_content_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"talent_id" integer NOT NULL,
	"social_id" integer NOT NULL,
	"platform" varchar(30) NOT NULL,
	"external_content_id" varchar(160) NOT NULL,
	"title" text NOT NULL,
	"content_url" text NOT NULL,
	"thumbnail_url" text,
	"content_type" varchar(24) DEFAULT 'video' NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"view_count" bigint DEFAULT 0 NOT NULL,
	"like_count" bigint,
	"comment_count" integer,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "talent_channel_snapshots" ADD CONSTRAINT "talent_channel_snapshots_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_channel_snapshots" ADD CONSTRAINT "talent_channel_snapshots_social_id_talent_socials_id_fk" FOREIGN KEY ("social_id") REFERENCES "public"."talent_socials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_content_performance" ADD CONSTRAINT "talent_content_performance_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_content_performance" ADD CONSTRAINT "talent_content_performance_social_id_talent_socials_id_fk" FOREIGN KEY ("social_id") REFERENCES "public"."talent_socials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "talent_channel_snapshots_social_date_uq" ON "talent_channel_snapshots" USING btree ("social_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "talent_channel_snapshots_talent_date_idx" ON "talent_channel_snapshots" USING btree ("talent_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "talent_channel_snapshots_platform_date_idx" ON "talent_channel_snapshots" USING btree ("platform","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "talent_content_performance_platform_external_uq" ON "talent_content_performance" USING btree ("platform","external_content_id");--> statement-breakpoint
CREATE INDEX "talent_content_performance_talent_published_idx" ON "talent_content_performance" USING btree ("talent_id","published_at");--> statement-breakpoint
CREATE INDEX "talent_content_performance_views_idx" ON "talent_content_performance" USING btree ("view_count");--> statement-breakpoint
INSERT INTO "talent_channel_snapshots" (
	"talent_id",
	"social_id",
	"platform",
	"snapshot_date",
	"followers",
	"data_source"
)
SELECT
	history."talent_id",
	social."id",
	history."platform",
	history."snapshot_date",
	history."value"::bigint,
	coalesce(history."data_source", 'legacy_snapshot')
FROM "talent_metric_snapshots" history
JOIN LATERAL (
	SELECT candidate."id"
	FROM "talent_socials" candidate
	WHERE candidate."talent_id" = history."talent_id"
		AND candidate."platform" = history."platform"
	ORDER BY candidate."sort_order", candidate."id"
	LIMIT 1
) social ON true
WHERE history."metric_type" IN ('subscribers', 'followers')
ON CONFLICT ("social_id", "snapshot_date") DO NOTHING;
