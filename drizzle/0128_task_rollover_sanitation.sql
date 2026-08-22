ALTER TYPE "public"."crm_task_status" ADD VALUE 'omitida';--> statement-breakpoint
ALTER TYPE "public"."crm_task_status" ADD VALUE 'no_realizada';--> statement-breakpoint
ALTER TYPE "public"."crm_task_status" ADD VALUE 'archivada';--> statement-breakpoint
DROP INDEX "crm_tasks_template_week_unique";--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD COLUMN "rollover_note" text;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_tasks_template_week_unique" ON "crm_tasks" USING btree ("recurrence_template_id","assigned_to_user_id","week_label") WHERE recurrence_template_id IS NOT NULL AND status IN ('pendiente', 'en_progreso');