-- Fix desalineamiento de schema en `connected_social_accounts`.
--
-- Contexto (incidente 2026-07-04):
--   La tabla existía en producción con columnas DISTINTAS a las que el
--   schema Drizzle esperaba tras la migración 0104:
--
--     Producción tenía        →  Drizzle esperaba
--     username                →  provider_username
--     avatar_url              →  provider_display_name
--     access_token_enc        →  access_token_encrypted
--     refresh_token_enc       →  refresh_token_encrypted
--     scopes (ARRAY)          →  scope (text)
--     created_at              →  connected_at
--     (sin disconnected_at)   →  disconnected_at (nullable)
--     (sin metadata)          →  metadata jsonb
--     updated_at (extra)      →  —
--
--   Consecuencia: `getConnectedAccount(userId, 'discord')` en
--   `PlatformCreatorLanding.tsx` fallaba con
--   `column "provider_username" does not exist` para cualquier usuario
--   con sesión Steam. El error boundary de la app mostraba
--   "PÁGINA NO DISPONIBLE" en /sorteos/zacketizor.
--
--   La 0104 no re-creó la tabla porque usaba `CREATE TABLE IF NOT EXISTS`
--   (idempotencia intencional). Aquí forzamos el fix.
--
-- Precondición verificada antes de escribir esta migración:
--   - SELECT count(*) FROM connected_social_accounts = 0
--   - Sin misiones Discord sembradas.
--   - Sin claims Discord.
--   - Sin coin_transactions Discord.
--   → DROP + CREATE es seguro, sin pérdida de datos.
--
-- Alcance:
--   NO toca coin_transactions, mission_claims, platform_missions,
--   shop_items, redemptions, ni ninguna otra tabla. Solo repara
--   connected_social_accounts.

DROP TABLE IF EXISTS "connected_social_accounts" CASCADE;
--> statement-breakpoint

CREATE TABLE "connected_social_accounts" (
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
ALTER TABLE "connected_social_accounts" ADD CONSTRAINT "connected_social_accounts_user_id_user_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "conn_social_user_provider_uq" ON "connected_social_accounts" USING btree ("user_id","provider");
--> statement-breakpoint
CREATE UNIQUE INDEX "conn_social_provider_user_uq" ON "connected_social_accounts" USING btree ("provider","provider_user_id");
--> statement-breakpoint
CREATE INDEX "conn_social_user_idx" ON "connected_social_accounts" USING btree ("user_id");
