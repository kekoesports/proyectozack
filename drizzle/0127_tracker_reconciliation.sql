CREATE TYPE "public"."tracker_reconciliation_status" AS ENUM('unreconciled', 'legacy', 'deferred');--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "reconciliation_status" "tracker_reconciliation_status" DEFAULT 'unreconciled' NOT NULL;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "reconciliation_note" text;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "reconciled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD COLUMN "reconciled_by_user_id" text;--> statement-breakpoint
ALTER TABLE "deal_deliverable_trackers" ADD CONSTRAINT "deal_deliverable_trackers_reconciled_by_user_id_user_id_fk" FOREIGN KEY ("reconciled_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_trackers_reconciliation_idx" ON "deal_deliverable_trackers" USING btree ("reconciliation_status");