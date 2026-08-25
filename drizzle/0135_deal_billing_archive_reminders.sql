ALTER TABLE "campaigns" ADD COLUMN "tracking_reminder_baseline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "tracking_reminder_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "tracking_reminder_email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "tracking_reminder_discord_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "tracking_reminder_error" text;--> statement-breakpoint
ALTER TABLE "issued_invoices" ADD COLUMN "automation_key" varchar(160);--> statement-breakpoint
CREATE INDEX "campaigns_tracking_reminder_idx" ON "campaigns" USING btree ("tracking_reminder_baseline_at","tracking_reminder_discord_notified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "issued_invoices_automation_key_uq" ON "issued_invoices" USING btree ("automation_key") WHERE automation_key IS NOT NULL;