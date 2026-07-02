CREATE TABLE "player_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"steam_id" varchar(32) NOT NULL,
	"steam_trade_url" text,
	"kick_username" varchar(100),
	"is_private" boolean DEFAULT true NOT NULL,
	"shipping_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coin_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"source" varchar(20) NOT NULL,
	"concept" varchar(200) NOT NULL,
	"ref_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaway_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"giveaway_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"mission_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" text NOT NULL,
	"condition_type" varchar(30) NOT NULL,
	"goal" integer NOT NULL,
	"reward_coins" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"current_day" integer DEFAULT 1 NOT NULL,
	"last_claim_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"shop_item_id" integer NOT NULL,
	"cost_coins" integer NOT NULL,
	"status" varchar(15) DEFAULT 'pendiente' NOT NULL,
	"delivery_info" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(10) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" varchar(300),
	"image_url" varchar(500),
	"cost_coins" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_claims" ADD CONSTRAINT "mission_claims_mission_id_platform_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."platform_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_claims" ADD CONSTRAINT "mission_claims_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_streaks" ADD CONSTRAINT "daily_streaks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_shop_item_id_shop_items_id_fk" FOREIGN KEY ("shop_item_id") REFERENCES "public"."shop_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_profiles_user_id_uq" ON "player_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_profiles_steam_id_uq" ON "player_profiles" USING btree ("steam_id");--> statement-breakpoint
CREATE INDEX "player_profiles_created_at_idx" ON "player_profiles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "coin_tx_user_id_idx" ON "coin_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coin_tx_user_created_idx" ON "coin_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "coin_tx_source_idx" ON "coin_transactions" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "giveaway_entries_giveaway_user_uq" ON "giveaway_entries" USING btree ("giveaway_id","user_id");--> statement-breakpoint
CREATE INDEX "giveaway_entries_user_id_idx" ON "giveaway_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "giveaway_entries_giveaway_id_idx" ON "giveaway_entries" USING btree ("giveaway_id");--> statement-breakpoint
CREATE INDEX "giveaway_entries_user_created_idx" ON "giveaway_entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_claims_mission_user_uq" ON "mission_claims" USING btree ("mission_id","user_id");--> statement-breakpoint
CREATE INDEX "mission_claims_user_id_idx" ON "mission_claims" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_missions_active_sort_idx" ON "platform_missions" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_streaks_user_id_uq" ON "daily_streaks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "redemptions_user_id_idx" ON "redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "redemptions_status_idx" ON "redemptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shop_items_active_category_idx" ON "shop_items" USING btree ("is_active","category");