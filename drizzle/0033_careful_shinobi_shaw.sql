CREATE TYPE "public"."crm_followup_priority" AS ENUM('alta', 'media', 'baja');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('negociacion', 'activa', 'pausada', 'finalizada', 'cancelada');--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE 'contactado' BEFORE 'activa';--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE 'en_negociacion' BEFORE 'activa';--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE 'propuesta_enviada' BEFORE 'activa';--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE 'inactiva' BEFORE 'pausada';--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE 'perdida' BEFORE 'pausada';--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer,
	"talent_id" integer,
	"name" varchar(200) NOT NULL,
	"sector" varchar(80),
	"geo" varchar(80),
	"status" "campaign_status" DEFAULT 'negociacion' NOT NULL,
	"start_date" date,
	"end_date" date,
	"description" text,
	"deliverables" text,
	"notes" text,
	"brand_payment" numeric(12, 2),
	"talent_payment" numeric(12, 2),
	"agency_fee" numeric(12, 2),
	"agency_fee_percent" numeric(5, 2),
	"brand_paid" boolean DEFAULT false NOT NULL,
	"brand_paid_date" date,
	"brand_paid_amount" numeric(12, 2),
	"brand_payment_method" varchar(80),
	"talent_paid" boolean DEFAULT false NOT NULL,
	"talent_paid_date" date,
	"talent_paid_amount" numeric(12, 2),
	"talent_payment_method" varchar(80),
	"owner_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_brands" ALTER COLUMN "geo" SET DATA TYPE varchar(80);--> statement-breakpoint
ALTER TABLE "crm_brands" ALTER COLUMN "country" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "crm_brand_contacts" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD COLUMN "priority" "crm_followup_priority" DEFAULT 'media' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "entity" varchar(80);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_method" varchar(80);--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_id_crm_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."crm_brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_brand_idx" ON "campaigns" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "campaigns_talent_idx" ON "campaigns" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_owner_idx" ON "campaigns" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "campaigns_start_date_idx" ON "campaigns" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "crm_brand_followups_priority_idx" ON "crm_brand_followups" USING btree ("priority");