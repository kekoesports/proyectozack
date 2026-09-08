ALTER TABLE "creator_applications" ALTER COLUMN "handle" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "creator_applications" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "creator_applications" ADD COLUMN "content_category" varchar(100);--> statement-breakpoint
ALTER TABLE "creator_applications" ADD COLUMN "average_audience" varchar(100);--> statement-breakpoint
ALTER TABLE "creator_applications" ADD COLUMN "other_links" text;