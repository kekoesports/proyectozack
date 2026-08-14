CREATE TYPE "public"."automation_event_status" AS ENUM('pending', 'processing', 'delivered', 'failed', 'dead_letter');
--> statement-breakpoint
CREATE TYPE "public"."automation_risk_level" AS ENUM('low', 'medium', 'high', 'critical');
--> statement-breakpoint
CREATE TYPE "public"."communication_channel" AS ENUM('email', 'telegram', 'discord', 'whatsapp', 'phone', 'meeting', 'system', 'other');
--> statement-breakpoint
CREATE TYPE "public"."communication_direction" AS ENUM('inbound', 'outbound', 'internal');
--> statement-breakpoint
CREATE TYPE "public"."communication_draft_status" AS ENUM('pending_approval', 'approved', 'rejected', 'sending', 'sent', 'failed');
--> statement-breakpoint
CREATE TABLE "automation_event_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"aggregate_type" varchar(50) NOT NULL,
	"aggregate_id" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "automation_event_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 8 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"idempotency_key" varchar(200) NOT NULL,
	"trace_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"last_error_code" varchar(80),
	"last_response_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"outcome" varchar(30) NOT NULL,
	"status_code" integer,
	"duration_ms" integer,
	"response_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer,
	"campaign_id" integer,
	"talent_id" integer,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"activity_type" varchar(80) NOT NULL,
	"channel" "communication_channel" DEFAULT 'system' NOT NULL,
	"direction" "communication_direction" DEFAULT 'internal' NOT NULL,
	"summary" text NOT NULL,
	"detail" text,
	"source" varchar(50) DEFAULT 'socialpro' NOT NULL,
	"external_id" varchar(200),
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" "communication_channel" NOT NULL,
	"status" "communication_draft_status" DEFAULT 'pending_approval' NOT NULL,
	"purpose" varchar(80) NOT NULL,
	"brand_id" integer,
	"campaign_id" integer,
	"talent_id" integer,
	"recipient" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"model" varchar(100),
	"source_activity_id" integer,
	"risk_level" "automation_risk_level" DEFAULT 'medium' NOT NULL,
	"metadata" jsonb,
	"reviewed_by_user_id" text,
	"review_note" text,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"provider_message_id" varchar(200),
	"failure_code" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_api_idempotency" (
	"key" varchar(200) PRIMARY KEY NOT NULL,
	"route" varchar(160) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"status_code" integer NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_api_rate_limits" (
	"token_fingerprint" varchar(64) NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_api_rate_limits_token_fingerprint_window_started_at_pk" PRIMARY KEY("token_fingerprint","window_started_at")
);
--> statement-breakpoint
ALTER TABLE "automation_webhook_deliveries" ADD CONSTRAINT "automation_webhook_deliveries_event_id_automation_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."automation_event_outbox"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_brand_id_crm_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."crm_brands"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "communication_drafts" ADD CONSTRAINT "communication_drafts_brand_id_crm_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."crm_brands"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "communication_drafts" ADD CONSTRAINT "communication_drafts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "communication_drafts" ADD CONSTRAINT "communication_drafts_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "communication_drafts" ADD CONSTRAINT "communication_drafts_source_activity_id_crm_activities_id_fk" FOREIGN KEY ("source_activity_id") REFERENCES "public"."crm_activities"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "communication_drafts" ADD CONSTRAINT "communication_drafts_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "automation_outbox_idempotency_uniq" ON "automation_event_outbox" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "automation_outbox_dispatch_idx" ON "automation_event_outbox" USING btree ("status","next_attempt_at");
--> statement-breakpoint
CREATE INDEX "automation_outbox_locked_idx" ON "automation_event_outbox" USING btree ("locked_at");
--> statement-breakpoint
CREATE INDEX "automation_outbox_aggregate_idx" ON "automation_event_outbox" USING btree ("aggregate_type","aggregate_id");
--> statement-breakpoint
CREATE INDEX "automation_deliveries_event_idx" ON "automation_webhook_deliveries" USING btree ("event_id");
--> statement-breakpoint
CREATE INDEX "automation_deliveries_created_idx" ON "automation_webhook_deliveries" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "crm_activities_entity_idx" ON "crm_activities" USING btree ("entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX "crm_activities_brand_idx" ON "crm_activities" USING btree ("brand_id");
--> statement-breakpoint
CREATE INDEX "crm_activities_campaign_idx" ON "crm_activities" USING btree ("campaign_id");
--> statement-breakpoint
CREATE INDEX "crm_activities_occurred_idx" ON "crm_activities" USING btree ("occurred_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_activities_source_external_uniq" ON "crm_activities" USING btree ("source","external_id");
--> statement-breakpoint
CREATE INDEX "communication_drafts_status_idx" ON "communication_drafts" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "communication_drafts_brand_idx" ON "communication_drafts" USING btree ("brand_id");
--> statement-breakpoint
CREATE INDEX "communication_drafts_campaign_idx" ON "communication_drafts" USING btree ("campaign_id");
--> statement-breakpoint
CREATE INDEX "communication_drafts_created_idx" ON "communication_drafts" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "integration_idempotency_expires_idx" ON "integration_api_idempotency" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "integration_rate_limits_updated_idx" ON "integration_api_rate_limits" USING btree ("updated_at");
--> statement-breakpoint
-- Legacy compatibility: retain next_follow_up_at but populate the canonical timestamp only when absent.
UPDATE "crm_brands"
SET "next_followup_at" = "next_follow_up_at"::timestamp AT TIME ZONE 'Europe/Madrid'
WHERE "next_followup_at" IS NULL AND "next_follow_up_at" IS NOT NULL;
