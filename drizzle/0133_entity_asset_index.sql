DO $$ BEGIN
  CREATE TYPE "entity_asset_kind" AS ENUM ('talent_photo', 'team_photo', 'brand_logo');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE "entity_assets" (
  "id" serial PRIMARY KEY NOT NULL,
  "kind" "entity_asset_kind" NOT NULL,
  "entity_id" integer NOT NULL,
  "storage_key" text NOT NULL,
  "content_type" varchar(120) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "entity_assets_storage_key_uq" ON "entity_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "entity_assets_owner_latest_idx" ON "entity_assets" USING btree ("kind", "entity_id", "created_at");
