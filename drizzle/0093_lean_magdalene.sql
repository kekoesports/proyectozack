CREATE TABLE "generated_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"vars_json" text,
	"template_id" integer,
	"talent_id" integer,
	"brand_id" integer,
	"campaign_id" integer,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"file_url" text,
	"file_path" text,
	"file_name" varchar(300),
	"notes" text,
	"sent_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contract_templates" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "contract_templates" ADD COLUMN "language" varchar(10) DEFAULT 'es' NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_brand_id_crm_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."crm_brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generated_contracts_status_idx" ON "generated_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generated_contracts_talent_idx" ON "generated_contracts" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "generated_contracts_brand_idx" ON "generated_contracts" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "generated_contracts_created_at_idx" ON "generated_contracts" USING btree ("created_at");