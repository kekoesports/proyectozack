CREATE TABLE "studio_boards" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"document" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_channel_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"document" jsonb NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" integer NOT NULL,
	"platform" text NOT NULL,
	"handle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_chat_turns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"project_revision" integer NOT NULL,
	"prompt" text NOT NULL,
	"response" text,
	"proposal" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"engine" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_chat_status_ck" CHECK ("studio_chat_turns"."status" in ('pending','complete','failed'))
);
--> statement-breakpoint
CREATE TABLE "studio_renders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_revision" integer NOT NULL,
	"board_revision" integer NOT NULL,
	"document" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"asset_id" uuid,
	"requested_by" text NOT NULL,
	"reviewed_by" text,
	"review_note" text,
	"failure_code" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_render_status_ck" CHECK ("studio_renders"."status" in ('queued','rendering','ready','failed','approved','changes_requested'))
);
--> statement-breakpoint
CREATE TABLE "studio_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"published_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_boards" ADD CONSTRAINT "studio_boards_project_id_studio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_channel_observations" ADD CONSTRAINT "studio_channel_observations_channel_id_studio_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."studio_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_channels" ADD CONSTRAINT "studio_channels_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_chat_turns" ADD CONSTRAINT "studio_chat_turns_project_id_studio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_renders" ADD CONSTRAINT "studio_renders_project_id_studio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_renders" ADD CONSTRAINT "studio_renders_asset_id_studio_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."studio_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_renders" ADD CONSTRAINT "studio_renders_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_renders" ADD CONSTRAINT "studio_renders_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_schedule" ADD CONSTRAINT "studio_schedule_project_id_studio_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studio_channel_observation_idx" ON "studio_channel_observations" USING btree ("channel_id","collected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_channel_talent_platform_uq" ON "studio_channels" USING btree ("talent_id","platform");--> statement-breakpoint
CREATE INDEX "studio_chat_project_idx" ON "studio_chat_turns" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_render_revision_uq" ON "studio_renders" USING btree ("project_id","project_revision","board_revision");--> statement-breakpoint
CREATE INDEX "studio_render_queue_idx" ON "studio_renders" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_schedule_project_uq" ON "studio_schedule" USING btree ("project_id");