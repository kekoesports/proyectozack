ALTER TABLE "case_studies" ADD COLUMN "spokesperson_quote" text;--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN "spokesperson_name" varchar(200);--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN "spokesperson_role" varchar(200);--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN "campaign_period" varchar(100);--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN "key_takeaways" text;