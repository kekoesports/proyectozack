-- Módulo CRM "leads" — Fase 1.
--
-- Añade el pipeline comercial sobre `contact_submissions` (46 filas históricas
-- en el momento de escribir esta migración). Las filas existentes quedan en
-- status 'nuevo' por el DEFAULT.
--
-- ── Por qué esta migración está ESCRITA A MANO y no generada ────────────────
--
--   `npx drizzle-kit generate` sobre master NO produce un diff aislado: faltan
--   13 snapshots en drizzle/meta/ (el último es 0112_snapshot.json), así que
--   drizzle-kit diffea el schema actual contra un estado obsoleto y re-emite
--   las reparaciones ya aplicadas en 0104/0105 — incluyendo
--   `DROP COLUMN access_token_encrypted` y compañía sobre
--   connected_social_accounts, y un `ADD COLUMN ... NOT NULL` sin default.
--
--   Aplicar eso destruiría datos en producción (scripts/migrate.ts corre en el
--   build de Vercel). Mismo patrón de reparación manual que ya se usó en
--   0105_fix_connected_social_accounts_schema.sql.
--
--   El drift de snapshots se trata por separado — ver docs/incidents/
--   2026-08-19-drizzle-snapshot-drift.md. Esta migración NO lo arregla y
--   deliberadamente NO añade drizzle/meta/0118_snapshot.json, para no
--   consolidar un estado incorrecto.
--
-- Alcance: SOLO contact_submissions + el tipo lead_status. No toca ninguna
-- otra tabla.

DO $$ BEGIN
	CREATE TYPE "public"."lead_status" AS ENUM('nuevo', 'contactado', 'descartado', 'ganado');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "status" "lead_status" DEFAULT 'nuevo' NOT NULL;
--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "assigned_to_id" text;
--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN IF NOT EXISTS "responded_at" timestamp with time zone;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "contact_submissions"
		ADD CONSTRAINT "contact_submissions_assigned_to_id_user_id_fk"
		FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "contact_submissions_status_idx" ON "contact_submissions" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_submissions_assigned_to_idx" ON "contact_submissions" USING btree ("assigned_to_id");
