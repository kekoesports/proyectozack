ALTER TABLE "contact_submissions" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "channel_url" varchar(500);--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "content_category" varchar(100);--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "followers" varchar(50);--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "average_audience" varchar(100);--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "other_links" text;