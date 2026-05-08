ALTER TABLE "giveaways" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "giveaways" ADD COLUMN "badge" varchar(50);