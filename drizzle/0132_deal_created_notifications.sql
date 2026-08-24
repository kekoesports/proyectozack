ALTER TABLE "automation_deal_drafts" ADD COLUMN "sheet_share_status" varchar(20);--> statement-breakpoint
ALTER TABLE "automation_deal_drafts" ADD COLUMN "discord_notified_at" timestamp with time zone;
