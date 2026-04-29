CREATE TABLE "code_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_id" integer NOT NULL,
	"talent_id" integer NOT NULL,
	"brand_name" varchar(150) NOT NULL,
	"action" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_codes" ADD COLUMN "badge" varchar(50);--> statement-breakpoint
ALTER TABLE "creator_codes" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_codes" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "creator_codes" ADD COLUMN "cta_text" varchar(100);--> statement-breakpoint
ALTER TABLE "code_clicks" ADD CONSTRAINT "code_clicks_code_id_creator_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."creator_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "code_clicks_code_id_idx" ON "code_clicks" USING btree ("code_id");--> statement-breakpoint
CREATE INDEX "code_clicks_talent_id_idx" ON "code_clicks" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "code_clicks_created_at_idx" ON "code_clicks" USING btree ("created_at");