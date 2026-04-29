CREATE TYPE "public"."invoice_ai_tool" AS ENUM('chatgpt', 'claude', 'gemini', 'midjourney', 'otro');--> statement-breakpoint
CREATE TYPE "public"."invoice_company" AS ENUM('spain', 'andorra', 'argentina', 'spain_andorra', 'spain_argentina');--> statement-breakpoint
CREATE TYPE "public"."invoice_payment_method" AS ENUM('banco', 'crypto', 'banco_agencia', 'banco_stark', 'crypto_agencia', 'crypto_zack', 'otro');--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE IF NOT EXISTS 'pagada';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE IF NOT EXISTS 'parcial';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE IF NOT EXISTS 'no_cobrada';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE IF NOT EXISTS 'no_pagada';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paid_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "company" "invoice_company";--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_method" "invoice_payment_method";--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "ai_tool" "invoice_ai_tool";--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_file_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "statement_file_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_invoice_file_id_files_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoice_file_id_files_id_fk" FOREIGN KEY ("invoice_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_statement_file_id_files_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_statement_file_id_files_id_fk" FOREIGN KEY ("statement_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_company_idx" ON "invoices" USING btree ("company");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_payment_method_idx" ON "invoices" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_invoice_file_idx" ON "invoices" USING btree ("invoice_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_statement_file_idx" ON "invoices" USING btree ("statement_file_id");
