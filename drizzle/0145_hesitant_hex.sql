CREATE TYPE "public"."bank_receipt_status" AS ENUM('not_required', 'missing', 'attached', 'reviewed');--> statement-breakpoint
CREATE TABLE "bank_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_account_id" integer NOT NULL,
	"external_id" varchar(200) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"owner_label" varchar(200),
	"last4" varchar(4) NOT NULL,
	"status" varchar(30) NOT NULL,
	"is_physical" boolean DEFAULT false NOT NULL,
	"card_group_name" varchar(200),
	"provider_created_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slash_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" varchar(200) NOT NULL,
	"entity_id" varchar(200) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'received' NOT NULL,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "issuer_company_id" integer;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "external_provider_account_id" varchar(200);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "bank_card_id" integer;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "provider_status" varchar(40);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "provider_detailed_status" varchar(60);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "merchant_name" varchar(300);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "merchant_category_code" varchar(20);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "merchant_country" varchar(80);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "original_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "original_currency" varchar(3);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "conversion_rate" numeric(18, 8);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "fx_fee" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "cashback" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "receipt_status" "bank_receipt_status" DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "bank_cards" ADD CONSTRAINT "bank_cards_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_cards_account_idx" ON "bank_cards" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "bank_cards_status_idx" ON "bank_cards" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_cards_account_external_uniq" ON "bank_cards" USING btree ("bank_account_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slash_webhook_events_event_uniq" ON "slash_webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "slash_webhook_events_status_idx" ON "slash_webhook_events" USING btree ("status");--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_issuer_company_id_issuer_companies_id_fk" FOREIGN KEY ("issuer_company_id") REFERENCES "public"."issuer_companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_card_id_bank_cards_id_fk" FOREIGN KEY ("bank_card_id") REFERENCES "public"."bank_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_accounts_issuer_idx" ON "bank_accounts" USING btree ("issuer_company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_accounts_provider_external_uniq" ON "bank_accounts" USING btree ("provider","external_provider_account_id") WHERE external_provider_account_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "bank_txn_card_idx" ON "bank_transactions" USING btree ("bank_card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_txn_external_account_uniq" ON "bank_transactions" USING btree ("external_id","bank_account_id") WHERE external_id IS NOT NULL;
--> statement-breakpoint
UPDATE "bank_accounts" AS ba
SET "issuer_company_id" = ic."id",
    "updated_at" = now()
FROM "issuer_companies" AS ic
WHERE ba."issuer_company_id" IS NULL
  AND (
    lower(trim(ba."company")) = lower(trim(ic."name"))
    OR lower(trim(ba."company")) = lower(trim(ic."legal_name"))
    OR (ba."provider" = 'slash' AND ic."tax_id" = '98-1925044')
  );
