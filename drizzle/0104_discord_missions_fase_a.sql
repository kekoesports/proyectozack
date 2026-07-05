-- Discord Missions Fase A — 2026-07-04
-- Ver docs/discord-mission-fase-a.md
--
-- IMPORTANTE: idempotente. Algunas versiones parciales del schema podrían
-- estar ya aplicadas en producción por sesiones previas de desarrollo
-- (patrón `drizzle-kit push` accidental — incidente crm_alerts, CLAUDE.md).
-- Usamos `IF NOT EXISTS` en columnas, tablas e índices, y bloques `DO`
-- para los constraints (que no soportan IF NOT EXISTS en Postgres <15).

ALTER TABLE "platform_missions" ADD COLUMN IF NOT EXISTS "provider" varchar(20);
--> statement-breakpoint
ALTER TABLE "platform_missions" ADD COLUMN IF NOT EXISTS "target_id" varchar(100);
--> statement-breakpoint
ALTER TABLE "platform_missions" ADD COLUMN IF NOT EXISTS "target_url" varchar(500);
--> statement-breakpoint
ALTER TABLE "platform_missions" ADD COLUMN IF NOT EXISTS "verification_mode" varchar(30);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_missions_provider_idx" ON "platform_missions" USING btree ("provider");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "connected_social_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" varchar(20) NOT NULL,
	"provider_user_id" varchar(64) NOT NULL,
	"provider_username" varchar(100),
	"provider_display_name" varchar(100),
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text,
	"scope" text NOT NULL,
	"expires_at" timestamp with time zone,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disconnected_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "connected_social_accounts" ADD CONSTRAINT "connected_social_accounts_user_id_user_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conn_social_user_provider_uq" ON "connected_social_accounts" USING btree ("user_id","provider");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conn_social_provider_user_uq" ON "connected_social_accounts" USING btree ("provider","provider_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conn_social_user_idx" ON "connected_social_accounts" USING btree ("user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "mission_verification_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"mission_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" varchar(20) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "mission_verification_attempts" ADD CONSTRAINT "mission_verification_attempts_mission_id_platform_missions_id_fk"
		FOREIGN KEY ("mission_id") REFERENCES "public"."platform_missions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "mission_verification_attempts" ADD CONSTRAINT "mission_verification_attempts_user_id_user_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_verif_user_mission_time_idx" ON "mission_verification_attempts" USING btree ("user_id","mission_id","attempted_at");
