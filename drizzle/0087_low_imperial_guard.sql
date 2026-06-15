CREATE TABLE "recurring_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"concept" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"vat_pct" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"withholding_pct" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"category" varchar(80),
	"counterparty_name" varchar(200),
	"scope" "invoice_scope" DEFAULT 'company' NOT NULL,
	"company" "invoice_company",
	"payment_method" "invoice_payment_method",
	"day_of_month" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "recurring_expenses_active_idx" ON "recurring_expenses" USING btree ("active");--> statement-breakpoint
CREATE INDEX "recurring_expenses_start_date_idx" ON "recurring_expenses" USING btree ("start_date");