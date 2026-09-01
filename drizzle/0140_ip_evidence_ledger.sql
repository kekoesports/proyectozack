CREATE TYPE "public"."ip_activity_category" AS ENUM('research', 'experimental_development', 'product_development', 'testing', 'maintenance', 'operations', 'security', 'sales_marketing', 'administration', 'training');--> statement-breakpoint
CREATE TYPE "public"."ip_evidence_kind" AS ENUM('git_commit', 'github_pr', 'task', 'document', 'test_run', 'deployment', 'other');--> statement-breakpoint
CREATE TYPE "public"."ip_legal_entity" AS ENUM('elevatex_agency_pa_sl', 'playmaker_media_llc', 'founder_personal');--> statement-breakpoint
CREATE TYPE "public"."ip_project_status" AS ENUM('draft', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."ip_provisional_assessment" AS ENUM('unassessed', 'rd_candidate', 'it_candidate', 'non_qualifying');--> statement-breakpoint
CREATE TYPE "public"."ip_record_mode" AS ENUM('contemporaneous', 'reconstructed');--> statement-breakpoint
CREATE TABLE "ip_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(180) NOT NULL,
	"asset_name" varchar(180) NOT NULL,
	"owner_entity" "ip_legal_entity" NOT NULL,
	"paying_entity" "ip_legal_entity" NOT NULL,
	"future_cyprus_candidate" boolean DEFAULT false NOT NULL,
	"repository_ref" varchar(500),
	"technical_uncertainty" text,
	"expected_outcome" text,
	"started_on" date NOT NULL,
	"ended_on" date,
	"status" "ip_project_status" DEFAULT 'active' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ip_work_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"contributor_name" varchar(160) NOT NULL,
	"contributor_user_id" text,
	"work_date" date NOT NULL,
	"minutes" integer NOT NULL,
	"activity_category" "ip_activity_category" NOT NULL,
	"provisional_assessment" "ip_provisional_assessment" NOT NULL,
	"description" text NOT NULL,
	"evidence_kind" "ip_evidence_kind" NOT NULL,
	"evidence_ref" varchar(500) NOT NULL,
	"record_mode" "ip_record_mode" NOT NULL,
	"owner_entity_snapshot" "ip_legal_entity" NOT NULL,
	"paying_entity_snapshot" "ip_legal_entity" NOT NULL,
	"integrity_hash" varchar(64) NOT NULL,
	"recorded_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ip_work_logs_minutes_check" CHECK ("ip_work_logs"."minutes" > 0 AND "ip_work_logs"."minutes" <= 1440),
	CONSTRAINT "ip_work_logs_date_check" CHECK ("ip_work_logs"."work_date" <= CURRENT_DATE)
);
--> statement-breakpoint
ALTER TABLE "ip_projects" ADD CONSTRAINT "ip_projects_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_work_logs" ADD CONSTRAINT "ip_work_logs_project_id_ip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ip_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_work_logs" ADD CONSTRAINT "ip_work_logs_contributor_user_id_user_id_fk" FOREIGN KEY ("contributor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_work_logs" ADD CONSTRAINT "ip_work_logs_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ip_projects_code_uq" ON "ip_projects" USING btree ("code");--> statement-breakpoint
CREATE INDEX "ip_projects_status_started_idx" ON "ip_projects" USING btree ("status","started_on");--> statement-breakpoint
CREATE INDEX "ip_projects_owner_idx" ON "ip_projects" USING btree ("owner_entity");--> statement-breakpoint
CREATE UNIQUE INDEX "ip_work_logs_integrity_hash_uq" ON "ip_work_logs" USING btree ("integrity_hash");--> statement-breakpoint
CREATE INDEX "ip_work_logs_project_date_idx" ON "ip_work_logs" USING btree ("project_id","work_date");--> statement-breakpoint
CREATE INDEX "ip_work_logs_assessment_date_idx" ON "ip_work_logs" USING btree ("provisional_assessment","work_date");--> statement-breakpoint
CREATE INDEX "ip_work_logs_created_idx" ON "ip_work_logs" USING btree ("created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "prevent_ip_work_logs_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'ip_work_logs is append-only; add a corrective record instead';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "ip_work_logs_append_only"
BEFORE UPDATE OR DELETE ON "ip_work_logs"
FOR EACH ROW
EXECUTE FUNCTION "prevent_ip_work_logs_mutation"();
