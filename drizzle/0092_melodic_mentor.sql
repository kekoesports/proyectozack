CREATE TABLE "invoice_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_transaction_id" integer NOT NULL,
	"issued_invoice_id" integer,
	"invoice_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"payment_date" date NOT NULL,
	"notes" text,
	"applied_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_bank_transaction_id_bank_transactions_id_fk" FOREIGN KEY ("bank_transaction_id") REFERENCES "public"."bank_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_issued_invoice_id_issued_invoices_id_fk" FOREIGN KEY ("issued_invoice_id") REFERENCES "public"."issued_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_applied_by_user_id_user_id_fk" FOREIGN KEY ("applied_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_payments_tx_issued_idx" ON "invoice_payments" USING btree ("bank_transaction_id","issued_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_payments_tx_invoice_idx" ON "invoice_payments" USING btree ("bank_transaction_id","invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_payments_issued_idx" ON "invoice_payments" USING btree ("issued_invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_payments_invoice_idx" ON "invoice_payments" USING btree ("invoice_id");