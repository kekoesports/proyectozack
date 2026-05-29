ALTER TABLE "giveaways" ADD COLUMN "crm_brand_id" integer;--> statement-breakpoint
ALTER TABLE "creator_codes" ADD COLUMN "crm_brand_id" integer;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "main_url" text;--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "corporate_color" varchar(10);--> statement-breakpoint
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_crm_brand_id_crm_brands_id_fk" FOREIGN KEY ("crm_brand_id") REFERENCES "public"."crm_brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_codes" ADD CONSTRAINT "creator_codes_crm_brand_id_crm_brands_id_fk" FOREIGN KEY ("crm_brand_id") REFERENCES "public"."crm_brands"("id") ON DELETE set null ON UPDATE no action;