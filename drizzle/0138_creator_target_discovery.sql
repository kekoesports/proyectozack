CREATE TABLE "creator_discovery_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"found_count" integer DEFAULT 0 NOT NULL,
	"qualified_count" integer DEFAULT 0 NOT NULL,
	"inserted_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"platform_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "qualification_status" varchar(24) DEFAULT 'review' NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "fit_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "fit_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "source_query" varchar(200);--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "last_activity_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "last_discovered_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "creator_discovery_runs_started_idx" ON "creator_discovery_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "creator_discovery_runs_status_idx" ON "creator_discovery_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "targets_qualification_idx" ON "targets" USING btree ("qualification_status","fit_score");--> statement-breakpoint
CREATE INDEX "targets_last_discovered_idx" ON "targets" USING btree ("last_discovered_at");--> statement-breakpoint
UPDATE "targets"
SET
	"qualification_status" = 'rejected',
	"fit_reasons" = '["Descartado previamente en el CRM"]'::jsonb
WHERE "status" = 'descartado';--> statement-breakpoint
UPDATE "targets"
SET
	"qualification_status" = 'qualified',
	"fit_score" = 100,
	"fit_reasons" = '["Actividad, audiencia y cumplimiento verificados"]'::jsonb
WHERE
	"status" <> 'descartado'
	AND "platform" = 'youtube'
	AND "recent_video_count" >= 8
	AND "min_recent_video_views" >= 1000
	AND "compliance_status" IN ('marketplace-scope-only', 'operator-check-required');--> statement-breakpoint
UPDATE "targets"
SET
	"qualification_status" = 'qualified',
	"fit_score" = GREATEST("fit_score", 75),
	"fit_reasons" = '["Lead con trabajo comercial previo"]'::jsonb
WHERE "status" IN ('contactado', 'finalizado');
