-- Evidencias reversibles para el seguimiento de tratos desde Google Sheets.
-- Los imports históricos quedan como source_type=manual; solo las filas
-- google_sheet se activan/desactivan en cada sincronización.

ALTER TABLE "campaigns"
  ADD COLUMN IF NOT EXISTS "last_evidence_added_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "deal_deliverable_items"
  ADD COLUMN IF NOT EXISTS "source_type" varchar(20) DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "deal_deliverable_items"
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "deal_deliverable_items"
  ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "campaigns_last_evidence_idx"
  ON "campaigns" USING btree ("last_evidence_added_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deal_items_tracker_source_active_idx"
  ON "deal_deliverable_items" USING btree ("tracker_id", "source_type", "is_active");
