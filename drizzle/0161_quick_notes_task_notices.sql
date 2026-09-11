CREATE TABLE "crm_quick_note_conversions" (
	"note_id" uuid PRIMARY KEY NOT NULL,
	"task_id" integer,
	"task_updated_at" timestamp with time zone NOT NULL,
	"undone_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_quick_note_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"actor_id" text,
	"kind" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_quick_note_shares" (
	"note_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_quick_note_shares_note_id_user_id_pk" PRIMARY KEY("note_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "crm_quick_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"original_text" text NOT NULL,
	"body" text NOT NULL,
	"mode" text DEFAULT 'auto' NOT NULL,
	"timezone" text DEFAULT 'Europe/Madrid' NOT NULL,
	"related_type" text,
	"related_id" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_task_notice_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Europe/Madrid' NOT NULL,
	"start_hour" integer DEFAULT 9 NOT NULL,
	"end_hour" integer DEFAULT 20 NOT NULL,
	"weekdays_only" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD COLUMN "remind_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_alerts" ADD COLUMN "dedupe_key" varchar(200);--> statement-breakpoint
ALTER TABLE "crm_alerts" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_alerts" ADD COLUMN "snoozed_until_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_alerts" ADD COLUMN "presented_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_alerts" ADD COLUMN "delivery_token" varchar(36);--> statement-breakpoint
ALTER TABLE "crm_alerts" ADD COLUMN "delivery_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_quick_note_conversions" ADD CONSTRAINT "crm_quick_note_conversions_note_id_crm_quick_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."crm_quick_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quick_note_conversions" ADD CONSTRAINT "crm_quick_note_conversions_task_id_crm_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."crm_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quick_note_events" ADD CONSTRAINT "crm_quick_note_events_note_id_crm_quick_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."crm_quick_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quick_note_events" ADD CONSTRAINT "crm_quick_note_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quick_note_shares" ADD CONSTRAINT "crm_quick_note_shares_note_id_crm_quick_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."crm_quick_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quick_note_shares" ADD CONSTRAINT "crm_quick_note_shares_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quick_notes" ADD CONSTRAINT "crm_quick_notes_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task_notice_settings" ADD CONSTRAINT "crm_task_notice_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quick_note_conversion_task_unique" ON "crm_quick_note_conversions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "quick_note_events_note_idx" ON "crm_quick_note_events" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "quick_note_shares_user_idx" ON "crm_quick_note_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quick_notes_owner_updated_idx" ON "crm_quick_notes" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_alerts_dedupe_key_unique" ON "crm_alerts" USING btree ("dedupe_key");