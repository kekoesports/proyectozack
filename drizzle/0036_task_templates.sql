ALTER TYPE "public"."crm_task_related_type" ADD VALUE IF NOT EXISTS 'campaign';--> statement-breakpoint
ALTER TYPE "public"."crm_task_related_type" ADD VALUE IF NOT EXISTS 'general';--> statement-breakpoint
CREATE TYPE "public"."crm_task_recurrence" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TABLE "crm_task_templates" (
	"id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(40) NOT NULL,
	"default_priority" "crm_task_priority" DEFAULT 'media' NOT NULL,
	"recurrence" "crm_task_recurrence" DEFAULT 'weekly' NOT NULL,
	"default_assignee_user_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD COLUMN "assigned_to_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD COLUMN "recurrence_template_id" integer;--> statement-breakpoint
ALTER TABLE "crm_task_templates" ADD CONSTRAINT "crm_task_templates_default_assignee_user_id_user_id_fk" FOREIGN KEY ("default_assignee_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_recurrence_template_id_crm_task_templates_id_fk" FOREIGN KEY ("recurrence_template_id") REFERENCES "public"."crm_task_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "crm_tasks" SET "created_by_user_id" = "owner_id" WHERE "created_by_user_id" IS NULL;--> statement-breakpoint
UPDATE "crm_tasks" SET "assigned_to_user_id" = "owner_id" WHERE "assigned_to_user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_task_templates_title_unique" ON "crm_task_templates" USING btree ("title");--> statement-breakpoint
CREATE INDEX "crm_task_templates_active_idx" ON "crm_task_templates" USING btree ("active");--> statement-breakpoint
CREATE INDEX "crm_task_templates_assignee_idx" ON "crm_task_templates" USING btree ("default_assignee_user_id");--> statement-breakpoint
CREATE INDEX "crm_tasks_assigned_idx" ON "crm_tasks" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "crm_tasks_template_idx" ON "crm_tasks" USING btree ("recurrence_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_tasks_template_week_unique" ON "crm_tasks" USING btree ("recurrence_template_id", "assigned_to_user_id", "week_label") WHERE "recurrence_template_id" IS NOT NULL;--> statement-breakpoint
