ALTER TABLE "crm_tasks" ADD COLUMN "automation_key" varchar(200);--> statement-breakpoint
CREATE UNIQUE INDEX "crm_tasks_automation_key_uniq" ON "crm_tasks" USING btree ("automation_key");