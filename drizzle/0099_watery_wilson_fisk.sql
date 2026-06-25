CREATE TYPE "public"."expense_group" AS ENUM('campaign_direct', 'operational');--> statement-breakpoint
CREATE TYPE "public"."expense_subtype" AS ENUM('pago_talento', 'coste_produccion', 'comision_plataforma', 'otros_campana', 'suscripcion_software', 'herramienta_ia', 'gestoria', 'fiscal_impuestos', 'cuota_autonomo', 'marketing_publicidad', 'comision_bancaria', 'ajuste_fiscal', 'gasto_general');--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "expense_group" "expense_group";--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "expense_subtype" "expense_subtype";--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD COLUMN "expense_group" "expense_group";--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD COLUMN "expense_subtype" "expense_subtype";--> statement-breakpoint
CREATE INDEX "invoices_expense_group_idx" ON "invoices" USING btree ("expense_group");--> statement-breakpoint
CREATE INDEX "invoices_expense_subtype_idx" ON "invoices" USING btree ("expense_subtype");