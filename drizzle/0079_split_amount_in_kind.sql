-- Split amount_in_kind into amount_in_kind_talent + amount_in_kind_community
-- RENAME preserves existing data (campaigns already created keep their value in _talent)
ALTER TABLE "campaigns" RENAME COLUMN "amount_in_kind" TO "amount_in_kind_talent";
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "amount_in_kind_community" numeric(12, 2);
