CREATE TABLE "email_delivery_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"svix_id" varchar(100) NOT NULL,
	"resend_email_id" varchar(100) NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_delivery_events_svix_id_uniq" UNIQUE("svix_id")
);
--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(254) NOT NULL,
	"reason" varchar(32) NOT NULL,
	"source_email_id" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_suppressions_email_uniq" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "email_delivery_events_email_idx" ON "email_delivery_events" USING btree ("resend_email_id");--> statement-breakpoint
CREATE INDEX "email_delivery_events_type_created_idx" ON "email_delivery_events" USING btree ("event_type","event_created_at");--> statement-breakpoint
CREATE INDEX "email_suppressions_reason_idx" ON "email_suppressions" USING btree ("reason");