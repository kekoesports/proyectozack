CREATE TABLE "ip_evidence_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"external_id" varchar(240) NOT NULL,
	"evidence_kind" "ip_evidence_kind" NOT NULL,
	"title" varchar(500) NOT NULL,
	"evidence_ref" varchar(500) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_name" varchar(160),
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ip_projects" ADD COLUMN "evidence_tracking_started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ip_work_logs" ADD COLUMN "evidence_event_id" integer;--> statement-breakpoint
ALTER TABLE "ip_evidence_events" ADD CONSTRAINT "ip_evidence_events_project_id_ip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ip_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ip_evidence_events_external_id_uq" ON "ip_evidence_events" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "ip_evidence_events_project_occurred_idx" ON "ip_evidence_events" USING btree ("project_id","occurred_at");--> statement-breakpoint
CREATE INDEX "ip_evidence_events_created_idx" ON "ip_evidence_events" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "ip_work_logs" ADD CONSTRAINT "ip_work_logs_evidence_event_id_ip_evidence_events_id_fk" FOREIGN KEY ("evidence_event_id") REFERENCES "public"."ip_evidence_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ip_work_logs_evidence_event_idx" ON "ip_work_logs" USING btree ("evidence_event_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "prevent_ip_evidence_events_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'ip_evidence_events is append-only; add a corrective event instead';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "ip_evidence_events_append_only"
BEFORE UPDATE OR DELETE ON "ip_evidence_events"
FOR EACH ROW
EXECUTE FUNCTION "prevent_ip_evidence_events_mutation"();--> statement-breakpoint
INSERT INTO "ip_projects" (
	"code",
	"name",
	"asset_name",
	"owner_entity",
	"paying_entity",
	"future_cyprus_candidate",
	"repository_ref",
	"evidence_tracking_started_at",
	"started_on",
	"status"
) VALUES (
	'SP-PRE-001',
	'SocialPro CRM — baseline PRE-CYPRUS',
	'SocialPro Agency CRM — baseline técnico actual',
	NULL,
	NULL,
	false,
	'https://github.com/kekoesports/proyectozack',
	'2026-09-01T00:00:00Z',
	'2026-03-17',
	'active'
) ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
INSERT INTO "ip_evidence_events" (
	"project_id",
	"external_id",
	"evidence_kind",
	"title",
	"evidence_ref",
	"occurred_at",
	"actor_name",
	"source_metadata"
)
SELECT
	"id",
	'github:kekoesports/proyectozack:pr:399',
	'github_pr',
	'feat: expediente IP y preparación para Chipre en Zack',
	'https://github.com/kekoesports/proyectozack/pull/399',
	'2026-09-01T13:52:10Z',
	'kekoesports',
	'{"provider":"github","pullRequestNumber":399,"mergeCommitSha":"023e8606ba5659fa6432b9bcc885df63ad92c162","baseBranch":"master"}'::jsonb
FROM "ip_projects"
WHERE "code" = 'SP-PRE-001'
ON CONFLICT ("external_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "ip_evidence_events" (
	"project_id",
	"external_id",
	"evidence_kind",
	"title",
	"evidence_ref",
	"occurred_at",
	"actor_name",
	"source_metadata"
)
SELECT
	"id",
	'github:kekoesports/proyectozack:pr:400',
	'github_pr',
	'fix: no forzar titularidad IP sin acreditar',
	'https://github.com/kekoesports/proyectozack/pull/400',
	'2026-09-01T14:05:37Z',
	'kekoesports',
	'{"provider":"github","pullRequestNumber":400,"mergeCommitSha":"c1b024ede5648b958cd038c587fd23f16d2d5c08","baseBranch":"master"}'::jsonb
FROM "ip_projects"
WHERE "code" = 'SP-PRE-001'
ON CONFLICT ("external_id") DO NOTHING;
