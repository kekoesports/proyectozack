CREATE TYPE "public"."bank_account_provider" AS ENUM('manual', 'wise', 'stripe', 'bank', 'paypal', 'other');--> statement-breakpoint
CREATE TYPE "public"."bank_connection_status" AS ENUM('manual', 'disconnected', 'connected', 'error');--> statement-breakpoint
CREATE TYPE "public"."bank_import_source" AS ENUM('csv', 'xlsx');--> statement-breakpoint
CREATE TYPE "public"."bank_import_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."bank_transaction_direction" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."bank_transaction_status" AS ENUM('imported', 'matched', 'ignored', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."transaction_match_status" AS ENUM('suggested', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."transaction_match_type" AS ENUM('issued_invoice', 'internal_invoice', 'expense', 'campaign', 'client', 'unknown');--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" "bank_account_provider" DEFAULT 'manual' NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"bank_name" varchar(200),
	"iban_masked" varchar(40),
	"account_last4" varchar(4),
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"company" varchar(200),
	"connection_status" "bank_connection_status" DEFAULT 'manual' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_account_id" integer,
	"source_type" "bank_import_source" NOT NULL,
	"source_filename" varchar(300) NOT NULL,
	"file_hash" varchar(64) NOT NULL,
	"status" "bank_import_status" DEFAULT 'pending' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliation_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer,
	"match_id" integer,
	"event_type" varchar(100) NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"metadata" jsonb,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_account_id" integer,
	"import_id" integer,
	"external_id" varchar(200),
	"transaction_hash" varchar(64) NOT NULL,
	"booking_date" timestamp with time zone NOT NULL,
	"value_date" timestamp with time zone,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"direction" "bank_transaction_direction" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"counterparty_name" varchar(300),
	"counterparty_account_masked" varchar(40),
	"reference" varchar(300),
	"category" varchar(100),
	"status" "bank_transaction_status" DEFAULT 'imported' NOT NULL,
	"raw_json_sanitized" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"match_type" "transaction_match_type" DEFAULT 'unknown' NOT NULL,
	"matched_entity_id" integer,
	"confidence" integer DEFAULT 0 NOT NULL,
	"match_reason" text DEFAULT '' NOT NULL,
	"status" "transaction_match_status" DEFAULT 'suggested' NOT NULL,
	"approved_by_user_id" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_imports" ADD CONSTRAINT "bank_imports_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_imports" ADD CONSTRAINT "bank_imports_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliation_events" ADD CONSTRAINT "bank_reconciliation_events_transaction_id_bank_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."bank_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliation_events" ADD CONSTRAINT "bank_reconciliation_events_match_id_transaction_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."transaction_matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliation_events" ADD CONSTRAINT "bank_reconciliation_events_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_import_id_bank_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."bank_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_matches" ADD CONSTRAINT "transaction_matches_transaction_id_bank_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."bank_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_matches" ADD CONSTRAINT "transaction_matches_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_accounts_provider_idx" ON "bank_accounts" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "bank_imports_account_idx" ON "bank_imports" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "bank_imports_status_idx" ON "bank_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bank_imports_created_at_idx" ON "bank_imports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_imports_hash_account_uniq" ON "bank_imports" USING btree ("file_hash","bank_account_id");--> statement-breakpoint
CREATE INDEX "recon_events_transaction_idx" ON "bank_reconciliation_events" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "recon_events_match_idx" ON "bank_reconciliation_events" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "recon_events_created_at_idx" ON "bank_reconciliation_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bank_txn_account_idx" ON "bank_transactions" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "bank_txn_status_idx" ON "bank_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bank_txn_booking_date_idx" ON "bank_transactions" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX "bank_txn_direction_idx" ON "bank_transactions" USING btree ("direction");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_txn_hash_account_uniq" ON "bank_transactions" USING btree ("transaction_hash","bank_account_id");--> statement-breakpoint
CREATE INDEX "txn_matches_transaction_idx" ON "transaction_matches" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "txn_matches_status_idx" ON "transaction_matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "txn_matches_type_idx" ON "transaction_matches" USING btree ("match_type");