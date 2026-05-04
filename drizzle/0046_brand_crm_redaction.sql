-- Renombra "razón social" (legal_name) a "manager": el campo se usa como
-- contacto principal de la marca. La razón social legal real vive en fiscal_name.
ALTER TABLE "crm_brands" RENAME COLUMN "legal_name" TO "manager";--> statement-breakpoint

-- Añade canales de contacto rápido del manager (anteriormente sólo en
-- crm_brand_contacts, ahora también accesibles desde la propia marca).
ALTER TABLE "crm_brands" ADD COLUMN "discord" varchar(80);--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "telegram" varchar(80);--> statement-breakpoint
ALTER TABLE "crm_brands" ADD COLUMN "whatsapp" varchar(40);--> statement-breakpoint

-- Mapeo de sectores: sector ahora es {gambling, trading, casino, sports_betting, perifericos, otros}.
UPDATE "crm_brands" SET "sector" = 'trading'        WHERE "sector" IN ('cs2_cases','cs2_marketplace','crypto');--> statement-breakpoint
UPDATE "crm_brands" SET "sector" = 'sports_betting' WHERE "sector" = 'apuestas';--> statement-breakpoint
UPDATE "crm_brands" SET "sector" = 'otros'          WHERE "sector" IN ('fmcg','tech','gaming_brands');--> statement-breakpoint

-- Mapeo de geos a tiers: geo ahora es {tier_1, tier_2, tier_3}.
UPDATE "crm_brands" SET "geo" = 'tier_1' WHERE "geo" IN ('spain','europa','japon');--> statement-breakpoint
UPDATE "crm_brands" SET "geo" = 'tier_2' WHERE "geo" IN ('latam','turquia','global');--> statement-breakpoint
UPDATE "crm_brands" SET "geo" = 'tier_3' WHERE "geo" IN ('india','otros');
