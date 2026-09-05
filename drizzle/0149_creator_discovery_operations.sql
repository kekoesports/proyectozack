CREATE TABLE "automation_registry" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" varchar(40) NOT NULL,
	"purpose" text NOT NULL,
	"status" varchar(20) DEFAULT 'NEVER_RUN' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"last_started_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"next_run_at" timestamp with time zone,
	"duration_ms" integer,
	"items_processed" integer,
	"usage" jsonb,
	"version" varchar(100) NOT NULL,
	"evidence" text,
	"observed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" integer NOT NULL,
	"target_id" integer,
	"platform" varchar(20) NOT NULL,
	"external_id" varchar(200) NOT NULL,
	"username" varchar(200) NOT NULL,
	"profile_url" text NOT NULL,
	"identity_evidence" jsonb NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"times_observed" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "creator_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_id" integer,
	"creator_id" integer,
	"actor_id" text,
	"previous_status" varchar(24) NOT NULL,
	"status" varchar(24) NOT NULL,
	"reason" varchar(40) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_identities" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" varchar(300) NOT NULL,
	"talent_id" integer,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"times_observed" integer DEFAULT 1 NOT NULL,
	"source_first_seen" varchar(200) NOT NULL,
	"source_last_seen" varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_provider_permissions" (
	"platform" varchar(20) PRIMARY KEY NOT NULL,
	"commercial_approved" boolean DEFAULT false NOT NULL,
	"derived_metrics_approved" boolean DEFAULT false NOT NULL,
	"retention_days" integer DEFAULT 0 NOT NULL,
	"evidence_ref" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"valid_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "creator_search_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"lease_token" varchar(36),
	"lease_until" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "targets" ALTER COLUMN "followers" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "targets" ALTER COLUMN "followers" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_accounts" ADD CONSTRAINT "creator_accounts_creator_id_creator_identities_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_accounts" ADD CONSTRAINT "creator_accounts_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_feedback" ADD CONSTRAINT "creator_feedback_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_feedback" ADD CONSTRAINT "creator_feedback_creator_id_creator_identities_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_feedback" ADD CONSTRAINT "creator_feedback_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_identities" ADD CONSTRAINT "creator_identities_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_provider_permissions" ADD CONSTRAINT "creator_provider_permissions_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_search_profiles" ADD CONSTRAINT "creator_search_profiles_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_account_provider_key" ON "creator_accounts" USING btree ("platform","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_account_target_key" ON "creator_accounts" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "creator_account_person_idx" ON "creator_accounts" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "creator_feedback_target_idx" ON "creator_feedback" USING btree ("target_id","created_at");--> statement-breakpoint
CREATE INDEX "creator_identity_talent_idx" ON "creator_identities" USING btree ("talent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_search_profile_name_key" ON "creator_search_profiles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "creator_search_profile_due_idx" ON "creator_search_profiles" USING btree ("enabled","next_run_at");