ALTER TABLE "creator_outreach_threads" ADD COLUMN "review_decision" varchar(16);--> statement-breakpoint
ALTER TABLE "creator_outreach_threads" ADD COLUMN "qualification_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "creator_outreach_threads" ADD COLUMN "internal_notes" text;