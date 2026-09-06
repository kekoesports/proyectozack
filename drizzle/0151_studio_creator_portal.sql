CREATE TABLE "studio_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" integer NOT NULL,
	"project_id" uuid,
	"name" text NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"checksum" text NOT NULL,
	"rights_confirmed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_asset_size_ck" CHECK ("studio_assets"."size" > 0 AND "studio_assets"."size" <= 20971520)
);
--> statement-breakpoint
CREATE TABLE "studio_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" integer NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" integer NOT NULL,
	"title" text NOT NULL,
	"template" text NOT NULL,
	"platform" text NOT NULL,
	"brief" text NOT NULL,
	"script" text DEFAULT '' NOT NULL,
	"cta" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_project_status_ck" CHECK ("studio_projects"."status" in ('draft','in_review','changes_requested','approved')),
	CONSTRAINT "studio_project_revision_ck" CHECK ("studio_projects"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "studio_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"decision" text NOT NULL,
	"comment" text NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talent_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"invited_by" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_assets" ADD CONSTRAINT "studio_assets_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_assets" ADD CONSTRAINT "studio_assets_project_id_studio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_assets" ADD CONSTRAINT "studio_assets_rights_confirmed_by_user_id_fk" FOREIGN KEY ("rights_confirmed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_invitations" ADD CONSTRAINT "studio_invitations_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_invitations" ADD CONSTRAINT "studio_invitations_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_reviews" ADD CONSTRAINT "studio_reviews_project_id_studio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_reviews" ADD CONSTRAINT "studio_reviews_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_versions" ADD CONSTRAINT "studio_versions_project_id_studio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_users" ADD CONSTRAINT "talent_users_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_users" ADD CONSTRAINT "talent_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_users" ADD CONSTRAINT "talent_users_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studio_asset_talent_idx" ON "studio_assets" USING btree ("talent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_asset_storage_uq" ON "studio_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_invitation_token_uq" ON "studio_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "studio_project_talent_updated_idx" ON "studio_projects" USING btree ("talent_id","updated_at");--> statement-breakpoint
CREATE INDEX "studio_review_project_idx" ON "studio_reviews" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_version_project_revision_uq" ON "studio_versions" USING btree ("project_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "talent_users_pilot_user_uq" ON "talent_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "talent_users_talent_idx" ON "talent_users" USING btree ("talent_id");