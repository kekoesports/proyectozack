CREATE TABLE "editorial_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot" varchar(50) NOT NULL,
	"post_id" integer,
	"meta" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_slots_slot_unique" UNIQUE("slot")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "og_image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "editorial_slots" ADD CONSTRAINT "editorial_slots_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_slots_slot_idx" ON "editorial_slots" USING btree ("slot");
--> statement-breakpoint
INSERT INTO "editorial_slots" ("slot") VALUES
  ('hero'),
  ('secondary_1'),
  ('secondary_2'),
  ('featured_interview'),
  ('featured_clip'),
  ('featured_match')
ON CONFLICT ("slot") DO NOTHING;