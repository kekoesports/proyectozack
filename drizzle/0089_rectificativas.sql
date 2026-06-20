ALTER TABLE "issued_invoices" ADD COLUMN "rectified_invoice_id" integer;--> statement-breakpoint
ALTER TABLE "issued_invoices" ADD COLUMN "rectification_type" varchar(20);--> statement-breakpoint
ALTER TABLE "issued_invoices" ADD COLUMN "rectification_reason" text;--> statement-breakpoint
ALTER TABLE "issuer_companies" ADD COLUMN "next_rectification_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "issued_invoices" ADD CONSTRAINT "issued_invoices_rectified_invoice_id_issued_invoices_id_fk" FOREIGN KEY ("rectified_invoice_id") REFERENCES "public"."issued_invoices"("id") ON DELETE set null ON UPDATE no action;