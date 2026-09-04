CREATE TYPE "public"."partner_lead_category" AS ENUM('case-opening', 'skin-marketplace', 'skin-trading', 'esports-betting', 'gaming-adjacent', 'other');--> statement-breakpoint
CREATE TYPE "public"."partner_lead_outreach_status" AS ENUM('nuevo', 'revision', 'aprobado', 'contactado', 'negociando', 'descartado');--> statement-breakpoint
CREATE TYPE "public"."partner_lead_recommendation" AS ENUM('recommended', 'watch', 'discard');--> statement-breakpoint
CREATE TYPE "public"."partner_lead_risk_level" AS ENUM('green', 'amber', 'red');--> statement-breakpoint
CREATE TYPE "public"."partner_lead_spain_status" AS ENUM('review-required', 'restricted', 'unknown', 'not-suitable');--> statement-breakpoint
CREATE TABLE "partner_lead_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" varchar(80) NOT NULL,
	"report_summary" text NOT NULL,
	"candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"new_lead_count" integer DEFAULT 0 NOT NULL,
	"updated_lead_count" integer DEFAULT 0 NOT NULL,
	"discarded_count" integer DEFAULT 0 NOT NULL,
	"researched_at" timestamp with time zone NOT NULL,
	"discord_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(255) NOT NULL,
	"name" varchar(300) NOT NULL,
	"url" text NOT NULL,
	"category" "partner_lead_category" NOT NULL,
	"company_name" varchar(300),
	"jurisdiction" varchar(160),
	"country_code" varchar(2),
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"creator_fit" text NOT NULL,
	"contact_email" varchar(320),
	"contact_url" text,
	"commercial_program_url" text,
	"terms_url" text,
	"licence_url" text,
	"company_evidence" text,
	"licence_evidence" text,
	"spain_status" "partner_lead_spain_status" NOT NULL,
	"spain_suitability" text NOT NULL,
	"reliability_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" "partner_lead_risk_level" NOT NULL,
	"recommendation" "partner_lead_recommendation" NOT NULL,
	"confidence" integer NOT NULL,
	"last_verified_at" timestamp with time zone NOT NULL,
	"last_batch_id" integer,
	"outreach_status" "partner_lead_outreach_status" DEFAULT 'nuevo' NOT NULL,
	"notes" text,
	"assigned_to_user_id" text,
	"last_contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_leads_confidence_range" CHECK ("partner_leads"."confidence" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "partner_leads" ADD CONSTRAINT "partner_leads_last_batch_id_partner_lead_batches_id_fk" FOREIGN KEY ("last_batch_id") REFERENCES "public"."partner_lead_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_leads" ADD CONSTRAINT "partner_leads_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_lead_batches_external_id_uq" ON "partner_lead_batches" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "partner_lead_batches_researched_at_idx" ON "partner_lead_batches" USING btree ("researched_at");--> statement-breakpoint
CREATE INDEX "partner_lead_batches_discord_pending_idx" ON "partner_lead_batches" USING btree ("created_at") WHERE "partner_lead_batches"."discord_notified_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_leads_domain_uq" ON "partner_leads" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "partner_leads_outreach_status_idx" ON "partner_leads" USING btree ("outreach_status");--> statement-breakpoint
CREATE INDEX "partner_leads_risk_level_idx" ON "partner_leads" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "partner_leads_recommendation_idx" ON "partner_leads" USING btree ("recommendation");--> statement-breakpoint
CREATE INDEX "partner_leads_last_verified_idx" ON "partner_leads" USING btree ("last_verified_at");--> statement-breakpoint
CREATE INDEX "partner_leads_last_batch_idx" ON "partner_leads" USING btree ("last_batch_id");