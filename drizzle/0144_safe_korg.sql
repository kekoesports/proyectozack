ALTER TYPE "public"."bank_account_provider" ADD VALUE 'slash' BEFORE 'bank';--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD COLUMN "settlement_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD COLUMN "settlement_currency" varchar(3);--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD COLUMN "effective_exchange_rate" numeric(18, 8);