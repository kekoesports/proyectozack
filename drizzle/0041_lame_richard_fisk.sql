CREATE TYPE "public"."cnmc_status" AS ENUM('registrado', 'pendiente', 'en_tramite', 'no_aplica');--> statement-breakpoint
CREATE TYPE "public"."talent_tax_type" AS ENUM('autonomo_es', 'autonomo_es_nuevo', 'sl_sa', 'latam', 'no_residente');--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "cnmc_status" "cnmc_status" DEFAULT 'no_aplica' NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "cnmc_registered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "cnmc_notes" text;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "has_rc_insurance" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "tax_type" "talent_tax_type";--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "nif" varchar(20);--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "fiscal_name" varchar(250);--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "fiscal_address" text;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "avg_ccv" integer;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "peak_ccv" integer;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "hours_broadcast" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "top_game_categories" jsonb;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "chat_msgs_per_hour" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "avg_views_per_video_30d" integer;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "upload_frequency_per_month" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "follower_growth_30d" integer;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "follower_growth_pct_30d" numeric(7, 4);--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "audience_geo_top3" jsonb;--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "fraud_score_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "talent_metric_snapshots" ADD COLUMN "data_source" text;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "default_rate_card" jsonb;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "agency_fee_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "payment_terms_days" integer;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "billing_email" varchar(180);--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "nif" varchar(30);--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "fiscal_name" varchar(250);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "estimated_cost_agency" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "estimated_margin_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "cnmc_checklist_ok" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "cnmc_checklist_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "cnmc_checklist_user_id" text;