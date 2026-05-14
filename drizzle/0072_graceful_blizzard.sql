ALTER TABLE "talents" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN "show_in_roster" boolean DEFAULT false NOT NULL;
-- Backfill and CHECK constraint applied manually (2026-05-14):
--   UPDATE talents SET is_published=true, show_in_roster=true WHERE visibility='public' AND status!='inactive';
--   ALTER TABLE talents ADD CONSTRAINT talents_show_in_roster_requires_is_published CHECK (NOT (show_in_roster=true AND is_published=false));
