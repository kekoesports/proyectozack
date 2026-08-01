ALTER TABLE "coin_transactions"
  ADD COLUMN "ref_key" varchar(160);
--> statement-breakpoint
CREATE UNIQUE INDEX "coin_tx_ref_key_uq"
  ON "coin_transactions" ("ref_key");
--> statement-breakpoint
ALTER TABLE "player_profiles"
  ADD COLUMN "adult_attested_at" timestamp with time zone,
  ADD COLUMN "adult_attestation_version" varchar(16);
--> statement-breakpoint
ALTER TABLE "redemptions"
  ADD COLUMN "request_key" varchar(64),
  ADD COLUMN "processed_by" text,
  ADD COLUMN "processed_at" timestamp with time zone,
  ADD COLUMN "admin_notes" text;
--> statement-breakpoint
ALTER TABLE "redemptions"
  ADD CONSTRAINT "redemptions_processed_by_user_id_fk"
  FOREIGN KEY ("processed_by") REFERENCES "user"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "redemptions_request_key_uq" ON "redemptions" ("request_key");
--> statement-breakpoint
CREATE INDEX "redemptions_processed_by_idx" ON "redemptions" ("processed_by");
--> statement-breakpoint
CREATE UNIQUE INDEX "giveaway_winners_giveaway_uq"
  ON "giveaway_winners" ("giveaway_id");
--> statement-breakpoint
ALTER TABLE "shop_items"
  ADD CONSTRAINT "shop_items_cost_positive_ck" CHECK ("cost_coins" > 0),
  ADD CONSTRAINT "shop_items_stock_nonnegative_ck" CHECK ("stock" >= 0);
--> statement-breakpoint
ALTER TABLE "redemptions"
  ADD CONSTRAINT "redemptions_cost_positive_ck" CHECK ("cost_coins" > 0),
  ADD CONSTRAINT "redemptions_status_ck"
    CHECK ("status" IN ('pendiente', 'enviado', 'cancelado'));
--> statement-breakpoint
ALTER TABLE "giveaways"
  ADD CONSTRAINT "giveaways_entry_award_nonnegative_ck" CHECK ("entry_award_coins" >= 0),
  ADD CONSTRAINT "giveaways_status_ck"
    CHECK ("status" IN ('draft', 'active', 'ended', 'cancelled')),
  ADD CONSTRAINT "giveaways_dates_ck"
    CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at");
