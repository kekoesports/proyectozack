-- Borradores de trato originados en Discord/API. La aprobación humana ocurre
-- antes de crear la campaña y la clave source+external_id evita duplicados.

CREATE TABLE IF NOT EXISTS "automation_deal_drafts" (
  "id" serial PRIMARY KEY NOT NULL,
  "source" varchar(40) DEFAULT 'discord' NOT NULL,
  "external_id" varchar(160) NOT NULL,
  "source_user_id" varchar(80),
  "source_channel_id" varchar(80),
  "raw_text" text NOT NULL,
  "proposed_deal" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'pending_review' NOT NULL,
  "campaign_id" integer,
  "reviewed_by" varchar(100),
  "reviewed_at" timestamp with time zone,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "automation_deal_drafts_campaign_id_campaigns_id_fk"
    FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id")
    ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "automation_deal_drafts_status_idx"
  ON "automation_deal_drafts" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_deal_drafts_campaign_idx"
  ON "automation_deal_drafts" USING btree ("campaign_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "automation_deal_drafts_source_external_uq"
  ON "automation_deal_drafts" USING btree ("source", "external_id")
  WHERE "external_id" IS NOT NULL;
