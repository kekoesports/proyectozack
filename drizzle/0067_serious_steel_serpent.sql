CREATE TABLE "campaign_splits" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"party" varchar(50) NOT NULL,
	"percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_splits_campaign_party_uniq" UNIQUE("campaign_id","party")
);
--> statement-breakpoint
ALTER TABLE "campaign_splits" ADD CONSTRAINT "campaign_splits_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_splits_campaign_idx" ON "campaign_splits" USING btree ("campaign_id");