CREATE TABLE "crm_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"attendees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "crm_events" ADD CONSTRAINT "crm_events_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_events_start_idx" ON "crm_events" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "crm_events_creator_idx" ON "crm_events" USING btree ("created_by_user_id");