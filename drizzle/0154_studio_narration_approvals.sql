CREATE TABLE "studio_narrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_revision" integer NOT NULL,
	"text" text NOT NULL,
	"voice_id" uuid NOT NULL,
	"status" text DEFAULT 'quote_requested' NOT NULL,
	"credits_milli" integer,
	"quoted_at" timestamp with time zone,
	"approved_by" text,
	"requested_by" text NOT NULL,
	"provider_job_id" uuid,
	"asset_id" uuid,
	"failure_code" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_narration_status_ck" CHECK ("studio_narrations"."status" in ('quote_requested','quoting','quoted','approved','submitting','complete','failed','uncertain')),
	CONSTRAINT "studio_narration_cost_ck" CHECK ("studio_narrations"."credits_milli" IS NULL OR "studio_narrations"."credits_milli" >= 0)
);
--> statement-breakpoint
ALTER TABLE "studio_narrations" ADD CONSTRAINT "studio_narrations_project_id_studio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_narrations" ADD CONSTRAINT "studio_narrations_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_narrations" ADD CONSTRAINT "studio_narrations_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_narrations" ADD CONSTRAINT "studio_narrations_asset_id_studio_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."studio_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "studio_narration_revision_uq" ON "studio_narrations" USING btree ("project_id","project_revision");