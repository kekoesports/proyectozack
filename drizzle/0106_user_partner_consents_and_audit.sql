-- Fase 1 legal — persistencia de consent + audit log central
--
-- Ver docs/legal-risk-matrix.md, docs/legal/todos-abogado.md.
--
-- Crea:
--   1. `user_partner_consents` — sustituye a la cookie `sp_partner_consent`
--      como fuente de verdad. Cada aceptación crea una fila. Al revocar,
--      se marca `revoked_at`. Nunca UPDATE sobre grantedAt.
--   2. `sp_audit_events` — log central de eventos de usuario para
--      forensics/antifraude/compliance. Complementa a `giveaway_events`
--      (que solo registra view/click anónimos). Nombre `sp_audit_events`
--      en vez de `giveaway_audit_events` para evitar ambigüedad con la
--      tabla existente.
--
-- Idempotente: uso `IF NOT EXISTS` en tablas, columnas e índices para
-- alinearse al patrón del proyecto (ver 0104_discord_missions_fase_a.sql).

CREATE TABLE IF NOT EXISTS "user_partner_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"consent_version" varchar(16) NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_hash" varchar(64),
	"user_agent" varchar(500)
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "user_partner_consents"
		ADD CONSTRAINT "user_partner_consents_user_id_user_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
		ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_partner_consents_user_id_idx"
	ON "user_partner_consents" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_partner_consents_active_idx"
	ON "user_partner_consents" USING btree ("user_id", "revoked_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_partner_consents_active_uq"
	ON "user_partner_consents" USING btree ("user_id", "consent_version")
	WHERE revoked_at IS NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sp_audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" varchar(40) NOT NULL,
	"ref_type" varchar(40),
	"ref_id" integer,
	"outcome" varchar(24) NOT NULL,
	"ip_hash" varchar(64),
	"user_agent" varchar(500),
	"country" varchar(2),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "sp_audit_events"
		ADD CONSTRAINT "sp_audit_events_user_id_user_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "sp_audit_events_user_idx"
	ON "sp_audit_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sp_audit_events_action_idx"
	ON "sp_audit_events" USING btree ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sp_audit_events_created_at_idx"
	ON "sp_audit_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sp_audit_events_ref_idx"
	ON "sp_audit_events" USING btree ("ref_type", "ref_id");
