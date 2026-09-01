ALTER TABLE "issuer_companies" ADD COLUMN "state_region" varchar(100);--> statement-breakpoint
ALTER TABLE "issuer_companies" ADD COLUMN "phone" varchar(40);--> statement-breakpoint
ALTER TABLE "issuer_companies" ADD COLUMN "registration_number" varchar(80);--> statement-breakpoint
ALTER TABLE "issuer_companies" ADD COLUMN "incorporation_date" date;--> statement-breakpoint
ALTER TABLE "issuer_companies" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "issuer_companies_single_default_uq" ON "issuer_companies" USING btree ("is_default") WHERE is_default = true;