-- Discord Missions Fase A — 2026-07-04
-- Ver docs/discord-mission-fase-a.md
--
-- Cambios:
--  1. Ampliar `platform_missions` con columnas para misiones sociales
--     (provider, target_id, target_url, verification_mode).
--     Nullable — no rompe filas existentes.
--  2. Nueva tabla `connected_social_accounts` para tokens OAuth cifrados.
--  3. Nueva tabla `mission_verification_attempts` para rate limit por
--     (mission_id, user_id).

ALTER TABLE "platform_missions" ADD COLUMN "provider" varchar(20);
--> statement-breakpoint
ALTER TABLE "platform_missions" ADD COLUMN "target_id" varchar(100);
--> statement-breakpoint
ALTER TABLE "platform_missions" ADD COLUMN "target_url" varchar(500);
--> statement-breakpoint
ALTER TABLE "platform_missions" ADD COLUMN "verification_mode" varchar(30);
--> statement-breakpoint
CREATE INDEX "platform_missions_provider_idx" ON "platform_missions" USING btree ("provider");
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
--> statement-breakpoint

CREATE TABLE "mission_verification_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"mission_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" varchar(20) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mission_verification_attempts" ADD CONSTRAINT "mission_verification_attempts_mission_id_platform_missions_id_fk"
	FOREIGN KEY ("mission_id") REFERENCES "public"."platform_missions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mission_verification_attempts" ADD CONSTRAINT "mission_verification_attempts_user_id_user_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "mission_verif_user_mission_time_idx" ON "mission_verification_attempts" USING btree ("user_id","mission_id","attempted_at");
