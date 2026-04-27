CREATE TYPE "public"."crm_followup_channel" AS ENUM('email', 'telegram', 'discord', 'whatsapp', 'reunion', 'llamada', 'otro');--> statement-breakpoint
CREATE TYPE "public"."crm_followup_status" AS ENUM('pendiente', 'hecho', 'vencido');--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE 'contactada' BEFORE 'activa';--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE 'en_negociacion' BEFORE 'activa';--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE 'cerrada' BEFORE 'archivada';--> statement-breakpoint
ALTER TYPE "public"."crm_brand_status" ADD VALUE 'no_interesa' BEFORE 'archivada';--> statement-breakpoint
ALTER TABLE "crm_brand_contacts" ADD COLUMN "linkedin" varchar(200);--> statement-breakpoint
ALTER TABLE "crm_brand_contacts" ADD COLUMN "country" varchar(2);--> statement-breakpoint
ALTER TABLE "crm_brand_contacts" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD COLUMN "channel" "crm_followup_channel";--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD COLUMN "next_action" text;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD COLUMN "next_action_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD COLUMN "status" "crm_followup_status" DEFAULT 'pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD COLUMN "assigned_to_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD COLUMN "responsible_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "assigned_to_user_id" text;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "last_contact_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "next_followup_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD CONSTRAINT "crm_brand_followups_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_brand_followups" ADD CONSTRAINT "crm_brand_followups_responsible_user_id_user_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD CONSTRAINT "crm_brands_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD CONSTRAINT "crm_brands_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_brand_followups_status_idx" ON "crm_brand_followups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crm_brand_followups_assigned_to_idx" ON "crm_brand_followups" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "crm_brands_created_by_idx" ON "crm_brands" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "crm_brands_assigned_to_idx" ON "crm_brands" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "crm_brands_next_followup_idx" ON "crm_brands" USING btree ("next_followup_at");