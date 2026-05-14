CREATE TABLE "brand_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"logo_url" varchar(500),
	"default_url" text,
	"category" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "brand_catalog_name_idx" ON "brand_catalog" USING btree ("name");--> statement-breakpoint
CREATE INDEX "brand_catalog_active_idx" ON "brand_catalog" USING btree ("is_active");