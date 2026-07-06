-- Hub de recompensas: 3 tabs (Recompensas por puntos / Sorteos gratis /
-- Ranking mensual) + soporte de sorteos gratis internos.
--
-- Cambios:
--   1. `giveaways.entry_award_coins` — cuántos ⭐ acredita participar.
--      = 20 (default) preserva comportamiento actual de los 5 sorteos existentes.
--      = 0 → sorteo gratis puro: participación sin puntos, sin coin_transactions.
--   2. `giveaways.status` — estado del ciclo de vida (draft/active/ended/cancelled).
--      Se infiere por `ends_at` en queries actuales; al añadirlo se puede
--      cerrar/cancelar sin tocar la fecha.
--   3. `giveaway_winners.winner_user_id` — FK opcional a user para enlazar
--      el ganador con la fila real de giveaway_entries. Legacy winners
--      (nombre libre) siguen funcionando; los nuevos ganadores automáticos
--      se enganchan a user.
--
-- Idempotente vía IF NOT EXISTS. Backward-compatible (defaults preservan
-- comportamiento actual).

ALTER TABLE "giveaways"
	ADD COLUMN IF NOT EXISTS "entry_award_coins" integer DEFAULT 20 NOT NULL;
--> statement-breakpoint

ALTER TABLE "giveaways"
	ADD COLUMN IF NOT EXISTS "status" varchar(16) DEFAULT 'active' NOT NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "giveaways_status_ends_at_idx"
	ON "giveaways" USING btree ("status", "ends_at");
--> statement-breakpoint

ALTER TABLE "giveaway_winners"
	ADD COLUMN IF NOT EXISTS "winner_user_id" text;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "giveaway_winners"
		ADD CONSTRAINT "giveaway_winners_winner_user_id_user_id_fk"
		FOREIGN KEY ("winner_user_id") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "giveaway_winners_winner_user_id_idx"
	ON "giveaway_winners" USING btree ("winner_user_id");
