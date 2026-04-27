CREATE TYPE "public"."campaign_action_type" AS ENUM('stream', 'video_youtube', 'short_reel_tiktok', 'tweet', 'story_instagram', 'pack_mensual', 'afiliacion', 'otro');--> statement-breakpoint
CREATE TYPE "public"."campaign_payment_method" AS ENUM('banco', 'crypto', 'banco_agencia', 'banco_stark', 'crypto_agencia', 'crypto_zack', 'otro');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('propuesta', 'negociacion', 'aprobada', 'activa', 'completada', 'cancelada', 'pendiente_pago', 'pagada');--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"brand_id" integer NOT NULL,
	"talent_id" integer NOT NULL,
	"brand_contact_id" integer,
	"responsible_user_id" text,
	"created_by_user_id" text,
	"assigned_to_user_id" text,
	"sector" varchar(40),
	"geo" varchar(20),
	"action_type" "campaign_action_type" NOT NULL,
	"status" "campaign_status" DEFAULT 'propuesta' NOT NULL,
	"start_date" date,
	"end_date" date,
	"delivery_deadline" date,
	"briefing_url" text,
	"content_url" text,
	"notes" text,
	"amount_brand" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_talent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"brand_payment_method" "campaign_payment_method",
	"talent_payment_method" "campaign_payment_method",
	"visibility" varchar(10) DEFAULT 'team' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "campaign_id" integer;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_id_crm_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."crm_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_contact_id_crm_brand_contacts_id_fk" FOREIGN KEY ("brand_contact_id") REFERENCES "public"."crm_brand_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_responsible_user_id_user_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_brand_idx" ON "campaigns" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "campaigns_talent_idx" ON "campaigns" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_assigned_idx" ON "campaigns" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "campaigns_responsible_idx" ON "campaigns" USING btree ("responsible_user_id");--> statement-breakpoint
CREATE INDEX "campaigns_created_by_idx" ON "campaigns" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "campaigns_start_idx" ON "campaigns" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "campaigns_action_idx" ON "campaigns" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "campaigns_archived_idx" ON "campaigns" USING btree ("archived_at");