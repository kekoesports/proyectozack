ALTER TABLE "ip_projects" ALTER COLUMN "owner_entity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ip_projects" ALTER COLUMN "paying_entity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ip_work_logs" ALTER COLUMN "owner_entity_snapshot" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ip_work_logs" ALTER COLUMN "paying_entity_snapshot" DROP NOT NULL;